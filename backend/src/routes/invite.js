// File: backend/src/routes/invite.js
// (Versi final setelah diperbarui dan diperbaiki)

const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const pool = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");

// --- FUNGSI BARU: Dapatkan Transporter Dinamis dari DB ---
async function getTransporter() {
  const [rows] = await pool.execute("SELECT * FROM smtp_settings WHERE id = 1");
  if (rows.length === 0) {
    throw new Error("Konfigurasi email belum diatur di Admin.");
  }
  const config = rows[0];

  if (!config.auth_user || !config.auth_pass) {
    throw new Error("Email pengirim atau password belum diatur di Admin.");
  }

  // Buat transporter Nodemailer baru berdasarkan data DB
  return nodemailer.createTransport({
    service: config.service === "gmail" ? "gmail" : undefined,
    host: config.service !== "gmail" ? config.host : undefined,
    port: config.service !== "gmail" ? config.port : undefined,
    secure: config.service !== "gmail" ? !!config.secure : undefined,
    auth: {
      user: config.auth_user,
      pass: config.auth_pass,
    },
  });
}

// --- HELPER: Dapatkan Nama Pengirim ---
async function getSenderIdentity() {
  const [rows] = await pool.execute(
    "SELECT auth_user, from_name FROM smtp_settings WHERE id = 1"
  );
  if (rows.length > 0 && rows[0].auth_user) {
    return `"${rows[0].from_name || "Admin Ujian"}" <${rows[0].auth_user}>`;
  }
  return `"Admin Ujian" <noreply@example.com>`;
}

// Fungsi untuk membuat kode acak
function createRandomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"; // Dihilangkan O, 0, I, L
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================
// POST /api/invite - Kirim & Simpan Undangan
// ============================
router.post("/", verifyAdmin, async (req, res) => {
  let connection;
  try {
    // 1. Ambil data admin (dari token) dan data body
    const { id: loggedInAdminId, role: adminRole } = req.admin;
    const { pesan, emails, exam_id, max_logins } = req.body;

    // 2. Cek kepemilikan ujian
    if (adminRole !== 'superadmin') {
      const [examCheck] = await pool.execute(
        "SELECT admin_id FROM exams WHERE id = ?",
        [exam_id]
      );
      if (examCheck.length === 0 || examCheck[0].admin_id !== loggedInAdminId) {
        return res.status(403).json({ message: "Akses ditolak. Anda bukan pemilik ujian ini." });
      }
    }
    
    // 3. SIAPKAN TRANSPORTER (agar gagal cepat jika config salah)
    const currentTransporter = await getTransporter();
    const senderIdentity = await getSenderIdentity();

    // 4. Validasi Input
    if (!exam_id) {
      return res.status(400).json({ message: "ID Ujian wajib dipilih." });
    }
    const maxLoginsNum = parseInt(max_logins, 10) || 1;
    if (maxLoginsNum <= 0) {
      return res.status(400).json({ message: "Batas login minimal 1." });
    }
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "Daftar Email wajib diisi." });
    }
    if (!pesan) {
      return res.status(400).json({ message: "Pesan tidak boleh kosong." });
    }

    // 5. Ambil keterangan ujian untuk email
    const [examRows] = await pool.execute(
      "SELECT keterangan FROM exams WHERE id = ?",
      [exam_id]
    );
    if (examRows.length === 0) {
      return res
        .status(404)
        .json({ message: "Ujian yang dipilih tidak ditemukan." });
    }
    const keteranganUjian = examRows[0].keterangan;

    const emailBodyBase = `<p>${pesan.replace(/\n/g, "<br/>")}</p>`;
    const examLink = process.env.FRONTEND_URL || "http://localhost:5173";

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 6. Loop pengiriman email
    const sendPromises = emails.map(async (email) => {
      let login_code;
      let isCodeUnique = false;

      // Buat Kode Login Acak & Pastikan Unik
      while (!isCodeUnique) {
        login_code = createRandomCode(6);
        const [existing] = await connection.execute(
          "SELECT id FROM invitations WHERE login_code = ?",
          [login_code]
        );
        if (existing.length === 0) {
          isCodeUnique = true;
        }
      }

      // SIMPAN KE DATABASE
      try {
const adminId = req.admin.id;

await connection.execute(
  `INSERT INTO invitations (email, exam_id, login_code, max_logins, login_count, admin_id)
   VALUES (?, ?, ?, ?, 0, ?)`,
  [email, exam_id, login_code, maxLoginsNum, adminId]
);

      } catch (dbError) {
        console.error(`Gagal menyimpan undangan untuk ${email}:`, dbError);
        return Promise.reject({
          email: email,
          loginCode: login_code,
          status: "rejected-db",
          reason: dbError,
        });
      }

      // Buat Opsi Email
      const mailOptions = {
        from: senderIdentity,
        to: email,
        subject: `Undangan Ujian: ${keteranganUjian}`,
        html: `
          ${emailBodyBase}
          <hr style="margin-top: 20px; margin-bottom: 20px; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 14px; color: #333;">
            Anda diundang untuk ujian: <b>${keteranganUjian}</b>
          </p>
          <p style="font-size: 14px; color: #333;">
            Silakan login menggunakan <b>Email Anda</b> dan <b>Kode Login</b> berikut:
          </p>
          <p style="font-size: 20px; font-weight: bold; color: #007bff; margin: 10px 0; letter-spacing: 2px;">
            ${login_code}
          </p>
          <p style="font-size: 12px; color: #555;">(Kode ini hanya dapat digunakan ${maxLoginsNum} kali)</p>
          <p style="margin-top: 20px; margin-bottom: 15px;">
            <a href="${examLink}" target="_blank" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 14px;">
              Buka Halaman Login Ujian
            </a>
          </p>
        `,
      };

      // Kirim pakai transporter dinamis
      return currentTransporter
        .sendMail(mailOptions)
        .then((info) => ({
          email,
          loginCode: login_code,
          status: "fulfilled",
          info,
        }))
        .catch((error) => {
          console.error(
            `Gagal mengirim email ke ${email} (Kode: ${login_code}):`,
            error
          );
          return Promise.reject({
            email: email,
            loginCode: login_code,
            status: "rejected-mail",
            reason: error,
          });
        });
    });

    // 7. Proses Hasil
    const results = await Promise.allSettled(sendPromises);

    const successfulSends = results.filter((r) => r.status === "fulfilled");
    const failedSends = results.filter((r) => r.status === "rejected");

    if (failedSends.length > 0) {
      console.warn("Rollback transaksi karena ada kegagalan.");
      await connection.rollback();

      const errorDetails = failedSends.map((f) => ({
        email: f.reason?.email || "unknown",
        loginCode: f.reason?.loginCode,
        status_error: f.reason?.status,
        reason: f.reason?.reason?.message || f.reason?.message || "Unknown error",
      }));
      console.error("Detail Kegagalan:", errorDetails);

      res.status(500).json({
        message: `❌ Terjadi ${failedSends.length} kegagalan. Tidak ada undangan yang terkirim/tersimpan.`,
        errors: errorDetails,
      });
    } else {
      await connection.commit();
      console.log(`Pengiriman selesai. Sukses: ${successfulSends.length}`);

      const successDetails = successfulSends.map((r) => ({
        email: r.value.email,
        loginCode: r.value.loginCode,
      }));

      res.status(200).json({
        message: `Undangan berhasil dikirim ke ${successfulSends.length} alamat email!`,
        sentInvitations: successDetails,
      });
    }
  } catch (error) {
    // Error umum di luar loop
    console.error("Error tidak terduga di /api/invite:", error);
    if (connection) await connection.rollback();
    if (
      error.message.includes("Konfigurasi email belum diatur") ||
      error.message.includes("Email pengirim atau password belum diatur")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: "Terjadi kesalahan server saat memproses undangan.",
    });
  } finally {
    if (connection) connection.release();
  }
});

// ============================
// POST /api/invite/login - Validasi Login Peserta
// (Tidak ada perubahan, ini untuk peserta)
// ============================
router.post("/login", async (req, res) => {
  let conn;
  try {
    const { email, login_code } = req.body;

    if (!email || !login_code) {
      return res
        .status(400)
        .json({ message: "Email dan Kode Login wajib diisi." });
    }

    const emailLower = email.trim().toLowerCase();
    const codeUpper = login_code.trim().toUpperCase();

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      "SELECT * FROM invitations WHERE email = ? AND login_code = ? FOR UPDATE",
      [emailLower, codeUpper]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        message:
          "Kredensial tidak cocok. Pastikan Email & Kode Login sesuai undangan.",
      });
    }

    const invitation = rows[0];

    if (invitation.login_count >= invitation.max_logins) {
      await conn.rollback();
      return res.status(403).json({
        message: `Batas login (${invitation.max_logins}x) untuk kode ini sudah habis.`,
      });
    }

    await conn.execute(
      "UPDATE invitations SET login_count = login_count + 1 WHERE id = ?",
      [invitation.id]
    );

    await conn.commit();
    res.status(200).json({
      message: "Login berhasil",
      examId: invitation.exam_id,
      email: invitation.email,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Error /api/invite/login:", err);
    res.status(500).json({ message: "Terjadi kesalahan server saat login." });
  } finally {
    if (conn) conn.release();
  }
});

// ============================
// GET /api/invite/list - Ambil Daftar Undangan Tersimpan
// (Sudah diperbarui dengan filter kepemilikan)
// ============================
router.get("/list", verifyAdmin, async (req, res) => {
  try {
    // Ambil ID admin yang sedang login dari token
    const { id: loggedInAdminId } = req.admin;

    // Selalu filter berdasarkan pemilik ujian (admin_id)
    const [rows] = await pool.execute(
      `SELECT 
        i.id, 
        i.email, 
        i.exam_id, 
        i.login_code, 
        i.max_logins, 
        i.login_count, 
        i.sent_at,
        k.keterangan AS keterangan_ujian
       FROM invitations i
       LEFT JOIN exams k ON i.exam_id = k.id
       WHERE k.admin_id = ?
       ORDER BY i.sent_at DESC 
       LIMIT 100`,
      [loggedInAdminId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Gagal mengambil daftar undangan:", error);
    res.status(500).json({ message: "Gagal memuat daftar undangan." });
  }
});


module.exports = router;