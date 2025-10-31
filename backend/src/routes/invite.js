// ============================
// FILE: backend/src/routes/invite.js
// ============================

const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const pool = require("../db"); // <-- Pastikan ini mengarah ke file db.js Anda
// Opsional: Jika ingin ID yang lebih unik, uncomment baris berikut
// const { v4: uuidv4 } = require('uuid');

// Load environment variables (pastikan dotenv.config() sudah dipanggil di file server utama index.js)
// require('dotenv').config(); // Tidak perlu lagi di sini jika sudah ada di index.js

// ============================
// Konfigurasi Nodemailer Transporter
// ============================

// >>>>> TAMBAHKAN KEMBALI DEBUGGING DI SINI <<<<<
console.log("-----------------------------------------");
console.log("Memuat Kredensial Email dari .env (invite.js):");
console.log("DEBUG: EMAIL_SERVICE:", process.env.EMAIL_SERVICE);
console.log("DEBUG: EMAIL_USER:", process.env.EMAIL_USER);
// Jangan log password asli ke konsol untuk keamanan
console.log("DEBUG: EMAIL_PASS:", process.env.EMAIL_PASS ? '******** (Ditemukan)' : '!!! TIDAK DITEMUKAN !!!');
console.log("-----------------------------------------");
// >>>>> AKHIR DEBUGGING <<<<<

// Ambil kredensial dari environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // Default ke gmail jika tidak diset
  auth: {
    user: process.env.EMAIL_USER, // Ambil dari .env
    pass: process.env.EMAIL_PASS, // Ambil dari .env
  },
  // Uncomment jika perlu (misal untuk development di localhost atau masalah TLS)
  // tls: {
  //   rejectUnauthorized: false
  // }
});

// ============================
// POST /api/invite - Kirim & Simpan Undangan (Multiple, Unique IDs)
// ============================
router.post("/", async (req, res) => {
  let connection; // Deklarasikan di luar try-catch agar bisa di-release di finally
  try {
    // Terima 'emails' (array), HAPUS examId dari destrukturisasi
    const { pesan, emails } = req.body;

    // --- Validasi Input ---
    // Cek apakah emails adalah array dan tidak kosong
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "Daftar Email wajib diisi dan tidak boleh kosong." });
    }
    // Cek pesan jika memang wajib diisi (sesuaikan dengan frontend)
    if (!pesan) { // Asumsi pesan wajib berdasarkan frontend
      return res.status(400).json({ message: "Pesan tidak boleh kosong." });
    }
    // --- Akhir Validasi Input ---

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const emailBodyBase = `<p>${pesan.replace(/\n/g, '<br/>')}</p>`;

    // Dapatkan koneksi database
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Mulai transaksi

    // --- Loop pengiriman email (Generate ID unik di sini) ---
    const sendPromises = emails.map(async (email) => { // Tambahkan async di sini

      // 1. Generate ID Unik untuk email ini
      const uniqueExamId = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Alternatif UUID: const uniqueExamId = uuidv4();

      // 2. Buat Link Unik
      const examLink = `${frontendUrl}/ujian/${uniqueExamId}`;

       // --- 3. SIMPAN KE DATABASE DULU ---
       try {
         await connection.execute(
           'INSERT INTO invitations (email, exam_id) VALUES (?, ?)',
           [email, uniqueExamId]
         );
       } catch (dbError) {
          console.error(`Gagal menyimpan undangan untuk ${email}:`, dbError);
          // Kembalikan error agar ditangkap oleh Promise.allSettled
          return Promise.reject({
              email: email,
              examId: uniqueExamId,
              status: 'rejected-db',
              reason: dbError
          });
       }
       // --- AKHIR SIMPAN DB ---

      // 4. Buat Opsi Email (jika DB sukses)
      const mailOptions = {
        from: `"Admin Ujian BPS" <${process.env.EMAIL_USER}>`,
        to: email, // Target email saat ini
        subject: `Undangan Mengikuti Ujian Online (ID: ${uniqueExamId})`, // Gunakan ID unik
        html: `
          ${emailBodyBase}
          <hr style="margin-top: 20px; margin-bottom: 20px; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #555;">Untuk memulai ujian:</p>
          <p style="margin-top: 10px; margin-bottom: 15px;">
            <a href="${examLink}" target="_blank" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 14px;">
              Klik Disini Untuk Mulai Ujian
            </a>
          </p>
          <p style="font-size: 12px; color: #555;">Atau salin link ini: ${examLink}</p>
          <p style="font-size: 12px; color: #555;">ID Ujian Anda: <strong>${uniqueExamId}</strong></p> {/* Tampilkan ID unik */}
        `,
      };

      // 5. Kembalikan promise sendMail
      return transporter.sendMail(mailOptions)
               .then(info => ({ email, examId: uniqueExamId, status: 'fulfilled', info })) // Sertakan ID yg dikirim
               .catch(error => {
                   console.error(`Gagal mengirim email ke ${email} (ID: ${uniqueExamId}):`, error);
                   return Promise.reject({ // Kirim object error yang informatif
                      email: email,
                      examId: uniqueExamId,
                      status: 'rejected-mail',
                      reason: error
                   });
               });
    });
    // --- Akhir Loop ---

    // Tunggu semua promise selesai
    const results = await Promise.allSettled(sendPromises);

    // Filter hasil
    const successfulSends = results.filter(r => r.status === 'fulfilled');
    const failedSends = results.filter(r => r.status === 'rejected');

    // Jika ada kegagalan (DB atau email), rollback transaksi
    if (failedSends.length > 0) {
      console.warn("Rollback transaksi karena ada kegagalan pengiriman/penyimpanan.");
      await connection.rollback(); // Batalkan semua INSERT

      // Kumpulkan detail error
      const errorDetails = failedSends.map(f => ({
          email: f.reason?.email || 'unknown',
          examId: f.reason?.examId,
          status_error: f.reason?.status,
          reason: f.reason?.reason?.message || f.reason?.message || 'Unknown error'
      }));
       console.error("Detail Kegagalan:", errorDetails);

       // Kirim response error 500
       res.status(500).json({
         message: `❌ Terjadi ${failedSends.length} kegagalan saat menyimpan/mengirim undangan. Tidak ada undangan yang terkirim/tersimpan.`,
         errors: errorDetails
       });

    } else {
      // Jika semua sukses, commit transaksi
      await connection.commit(); // Simpan permanen semua INSERT
      console.log(`Pengiriman selesai. Sukses: ${successfulSends.length}`);

      // Kumpulkan detail sukses
      const successDetails = successfulSends.map(r => ({
          email: r.value.email,
          examId: r.value.examId
      }));

      // Kirim response sukses 200
      res.status(200).json({
        message: `✅ Undangan berhasil disimpan dan dikirim ke ${successfulSends.length} alamat email!`,
        sentInvitations: successDetails
      });
    }

  } catch (error) { // Error umum di luar loop
    console.error("Error tidak terduga di /api/invite:", error);
    if (connection) await connection.rollback(); // Rollback jika error terjadi setelah transaksi dimulai
    res.status(500).json({ message: "Terjadi kesalahan server saat memproses undangan." });
  } finally {
     if (connection) connection.release(); // Selalu lepaskan koneksi
  }
});

// ============================
// GET /api/invite/list - Ambil Daftar Undangan Tersimpan
// ============================
router.get("/list", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, email, exam_id, sent_at FROM invitations ORDER BY sent_at DESC LIMIT 100" // Batasi hasil untuk performa
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Gagal mengambil daftar undangan:", error);
    res.status(500).json({ message: "Gagal memuat daftar undangan." });
  }
});


module.exports = router;