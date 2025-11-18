const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");

router.post("/", async (req, res) => {
  // ... (Kode tidak berubah)
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

      if (j.tipe_soal === "pilihanGanda" && j.jawaban_text) {
        const optionId = parseInt(j.jawaban_text, 10);

        if (!isNaN(optionId)) {
          // 1. Cek kebenaran berdasarkan ID Opsi
          const [opsi] = await conn.execute(
            "SELECT is_correct, opsi_text FROM options WHERE id = ? LIMIT 1",
            [optionId]
          );

          if (opsi.length > 0) {
            benar = !!opsi[0].is_correct;
            // 2. Simpan TEKS opsi-nya, bukan ID-nya
            jawabanTextFinal = opsi[0].opsi_text;
          } else {
            jawabanTextFinal = null; // ID Opsi tidak valid
          }
        } else {
          jawabanTextFinal = null; // Jawaban PG bukan angka
        }
      } else if (j.tipe_soal === "teksSingkat" && j.jawaban_text) {
        // Ambil kunci jawaban teks dari options
        const [kunci] = await conn.execute(
          "SELECT opsi_text FROM options WHERE question_id = ? AND is_correct = 1 LIMIT 1",
          [j.question_id]
        );

        if (kunci.length > 0) {
          const jawabanBenarString = kunci[0].opsi_text || "";
          const jawabanUser = j.jawaban_text || "";
          const normUser = jawabanUser.replace(/\s+/g, "").toLowerCase();
          const listKunciBenar = jawabanBenarString.split(",");
          const normListKunci = listKunciBenar.map((k) =>
            k.replace(/\s+/g, "").toLowerCase()
          );

          if (normListKunci.includes(normUser)) {
            benar = true;
          }
        }
      } else if (j.tipe_soal === "esay") {
        // Esai perlu penilaian manual
      }

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
// GET - Ambil semua hasil ujian (DIPERBARUI UNTUK EKSPOR DETAIL)
// =======================================================
router.get("/", verifyAdmin, async (req, res) => { // <-- 1. Tambah verifyAdmin
  try {
    // ▼▼▼ PERUBAHAN DI SINI ▼▼▼
    // 2. Ambil role dan id admin
    const { id: loggedInAdminId, role: adminRole } = req.admin;

    let whereClause = "";
    const params = [];

    // 3. Jika bukan superadmin, filter berdasarkan ID-nya
    whereClause = "WHERE e.admin_id = ?";
    params.push(loggedInAdminId);

    const [rows] = await pool.execute(
      `
      SELECT 
        p.id AS peserta_id,
        p.nama, p.email, p.nohp,
        e.id AS exam_id, 
        e.keterangan AS ujian,
        q.id AS question_id,
        q.soal_text,
        q.tipe_soal,
        h.jawaban_text,
        h.benar,
        h.created_at,
        (
          SELECT GROUP_CONCAT(opt.opsi_text SEPARATOR ', ') 
          FROM options opt 
          WHERE opt.question_id = q.id AND opt.is_correct = 1
        ) AS kunci_jawaban_text
      FROM hasil_ujian h
      JOIN peserta p ON p.id = h.peserta_id
      JOIN exams e ON e.id = h.exam_id
      JOIN questions q ON q.id = h.question_id
      WHERE e.admin_id = ?
      ORDER BY e.id, p.id, q.id
      `,
      [loggedInAdminId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error GET /api/hasil:", err);
    res.status(500).json({ message: "Gagal memuat rekap hasil" });
  }
});

// =======================================================
// GET - Ambil semua hasil detail untuk SATU PESERTA
// [DIPERBARUI]
// =======================================================
router.get("/peserta/:peserta_id", verifyAdmin, async (req, res) => { // <-- 1. Tambah verifyAdmin
  let conn;
  try {
    // ▼▼▼ PERUBAHAN DI SINI ▼▼▼
    // 2. Ambil role dan id admin
    const { id: loggedInAdminId, role: adminRole } = req.admin;
    const { peserta_id } = req.params;

    let whereAdminClause = "";
    const params = [peserta_id];

    // 3. Jika bukan superadmin, filter berdasarkan ID-nya
    whereAdminClause = "AND e.admin_id = ?";
params.push(loggedInAdminId);

    conn = await pool.getConnection();

    // ▼▼▼ PERUBAHAN DI SINI: JOIN exams dan SELECT e.keterangan ▼▼▼
    const [rows] = await conn.execute(
      `
      SELECT 
        q.id AS question_id,
        q.soal_text,
        q.tipe_soal,
        h.jawaban_text,
        h.benar,
        h.created_at,
        e.keterangan AS keterangan_ujian,
        e.admin_id -- (opsional, untuk debugging)
      FROM hasil_ujian h
      JOIN questions q ON q.id = h.question_id
      JOIN exams e ON e.id = h.exam_id
      WHERE h.peserta_id = ? ${whereAdminClause}
      ORDER BY q.id;
    `,
      params
    );
    // ▲▲▲ AKHIR PERUBAHAN ▲▲▲

    if (rows.length === 0) {
      if (conn) conn.release();
      return res
        .status(404)
        .json({ message: "Hasil ujian tidak ditemukan untuk peserta ini" });
    }

    // 'Enrich' (memperkaya) setiap baris hasil dengan data opsinya
    for (const row of rows) {
      if (row.tipe_soal === "pilihanGanda" || row.tipe_soal === "teksSingkat") {
        const [options] = await conn.execute(
          "SELECT id, opsi_text, is_correct FROM options WHERE question_id = ?",
          [row.question_id]
        );
        row.pilihan = options.map((opt) => ({
          ...opt,
          is_correct: !!opt.is_correct,
        }));
      } else {
        row.pilihan = [];
      }
    }

    if (conn) conn.release();
    res.json(rows);
  } catch (err) {
    if (conn) conn.release();
    console.error("Error ambil hasil detail peserta:", err);
    res
      .status(500)
      .json({ message: "Gagal memuat hasil detail", error: err.message });
  }
});

module.exports = router;