const express = require("express");
const router = express.Router();
const pool = require("../db");

// =======================================================
// POST - Simpan hasil ujian dan nilai benar/salah
// =======================================================
router.post("/", async (req, res) => {
  try {
    const { peserta_id, exam_id, jawaban } = req.body;

    // Validasi input
    if (!peserta_id || !exam_id || !Array.isArray(jawaban)) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    for (const j of jawaban) {
      if (!j.question_id) continue;

      let benar = false;
      let jawabanTextFinal = j.jawaban_text; // Teks esai atau ID Opsi (sbg string)

      // [PERUBAIKAN]
      // Hanya nilai Pilihan Ganda, Esai akan dinilai manual
      if (j.tipe_soal === 'pilihanGanda' && j.jawaban_text) {
        const optionId = parseInt(j.jawaban_text, 10);
        
        if (!isNaN(optionId)) {
          // 1. Cek kebenaran berdasarkan ID Opsi
          const [opsi] = await conn.execute(
            "SELECT is_correct, opsi_text FROM options WHERE id = ? LIMIT 1",
            [optionId]
          );

          if (opsi.length > 0) {
            benar = !!opsi[0].is_correct;
            // 2. Simpan TEKS opsi-nya, bukan ID-nya (opsional tp lebih baik)
            jawabanTextFinal = opsi[0].opsi_text; 
          } else {
            jawabanTextFinal = null; // ID Opsi tidak valid
          }
        } else {
          jawabanTextFinal = null; // Jawaban PG bukan angka
        }
      } else if (j.tipe_soal === 'esay') {
        // Untuk esai, 'benar' biarkan false (penilaian manual)
        // 'jawabanTextFinal' sudah berisi teks jawaban esai
      }
      // [AKHIR PERUBAIKAN]


      // 💾 Simpan hasil ke tabel hasil_ujian
      await conn.execute(
        `INSERT INTO hasil_ujian 
         (peserta_id, exam_id, question_id, jawaban_text, benar)
         VALUES (?, ?, ?, ?, ?)`,
        [peserta_id, exam_id, j.question_id, jawabanTextFinal, benar]
      );
    }

    await conn.commit();
    conn.release();

    res
      .status(201)
      .json({ message: "✅ Hasil ujian berhasil disimpan dan dinilai" });
  } catch (err) {
    console.error("Error simpan hasil ujian:", err);
    res
      .status(500)
      .json({ message: "Gagal menyimpan hasil ujian", error: err.message });
  }
});

// =======================================================
// GET - Ambil semua hasil ujian (JOIN peserta, ujian, soal)
// =======================================================

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        p.id AS peserta_id,
        p.nama, p.email, p.nohp, p.alamat, p.ttl, p.jenis_kelamin,
        e.keterangan AS ujian,
        q.tipe_soal,
        h.question_id,
        h.jawaban_text,
        h.benar,
        h.created_at
      FROM hasil_ujian h
      JOIN peserta p ON p.id = h.peserta_id
      JOIN exams e ON e.id = h.exam_id
      JOIN questions q ON q.id = h.question_id
      ORDER BY p.id, h.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    // ... (error handling)
  }
});

// =======================================================
// GET - Ambil semua hasil detail untuk SATU PESERTA
// [PERUBAHAN] - Sekarang juga mengambil semua opsi PG
// =======================================================
router.get("/peserta/:peserta_id", async (req, res) => {
  let conn; // Deklarasikan koneksi di luar try
  try {
    const { peserta_id } = req.params;
    conn = await pool.getConnection(); // Dapatkan koneksi

    const [rows] = await conn.execute(
      `
      SELECT 
        q.id AS question_id,
        q.soal_text,
        q.tipe_soal,
        h.jawaban_text,
        h.benar
      FROM hasil_ujian h
      JOIN questions q ON q.id = h.question_id
      WHERE h.peserta_id = ?
      ORDER BY q.id;
    `,
      [peserta_id]
    );

    if (rows.length === 0) {
      if (conn) conn.release(); // Lepaskan koneksi
      return res
        .status(404)
        .json({ message: "Hasil ujian tidak ditemukan untuk peserta ini" });
    }

    // [PERUBAHAN INTI]
    // 'Enrich' (memperkaya) setiap baris hasil dengan data opsinya
    for (const row of rows) {
      if (row.tipe_soal === "pilihanGanda") {
        // Ambil semua opsi untuk question_id ini
        const [options] = await conn.execute(
          "SELECT id, opsi_text, is_correct FROM options WHERE question_id = ?",
          [row.question_id]
        );

        // Tambahkan array 'pilihan' ke objek 'row'
        row.pilihan = options.map((opt) => ({
          ...opt,
          is_correct: !!opt.is_correct, // Konversi 0/1 menjadi boolean
        }));
      } else {
        row.pilihan = []; // Esai tidak memiliki pilihan
      }
    }
    // [AKHIR PERUBAHAN INTI]

    if (conn) conn.release(); // Lepaskan koneksi setelah selesai
    res.json(rows); // Kirim data yang sudah diperkaya
  } catch (err) {
    if (conn) conn.release(); // Pastikan koneksi dilepas jika terjadi error
    console.error("Error ambil hasil detail peserta:", err);
    res
      .status(500)
      .json({ message: "Gagal memuat hasil detail", error: err.message });
  }
});


module.exports = router;
