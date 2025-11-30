// File: src/routes/hasil.js

const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =======================================================
// MULTER SETUP UNTUK JAWABAN DOKUMEN (UPLOAD FILE PESERTA)
// Folder: /uploads_jawaban
// =======================================================
const uploadJawabanDir = path.join(__dirname, "../uploads_jawaban");
if (!fs.existsSync(uploadJawabanDir)) {
  fs.mkdirSync(uploadJawabanDir, { recursive: true });
}

const storageJawaban = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadJawabanDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storageJawaban });

// =======================================================
// HELPER: Normalisasi jawaban dokumen dari DB
// =======================================================
const normalizeDokumenJawaban = (jawaban_text) => {
  if (!jawaban_text) return { first: null, files: [] };

  if (typeof jawaban_text === "string") {
    try {
      const parsed = JSON.parse(jawaban_text);
      if (Array.isArray(parsed)) {
        return {
          first: parsed[0] || null,
          files: parsed,
        };
      }
    } catch (_) {
      // bukan JSON, anggap single path
    }
  }

  return { first: jawaban_text, files: [jawaban_text] };
};

// =======================================================
// POST - SIMPAN DRAFT (AUTOSAVE)
// =======================================================
router.post("/draft", async (req, res) => {
  let conn;
  try {
    const { peserta_id, exam_id, jawaban } = req.body;

    if (!peserta_id || !exam_id || !Array.isArray(jawaban)) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    for (const j of jawaban) {
      if (!j.question_id) continue;

      const jawabanTextFinal = j.jawaban_text ?? null;

      // Draft: simpan jawaban saja dulu, benar=0 (false)
      await conn.execute(
        `
        INSERT INTO hasil_ujian
          (peserta_id, exam_id, question_id, jawaban_text, benar)
        VALUES (?, ?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          jawaban_text = VALUES(jawaban_text)
        `,
        [peserta_id, exam_id, j.question_id, jawabanTextFinal]
      );
    }

    await conn.commit();
    conn.release();

    return res.status(200).json({ message: "✅ Draft jawaban tersimpan" });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
      conn.release();
    }
    console.error("Error simpan draft:", err);
    return res.status(500).json({
      message: "Gagal menyimpan draft jawaban",
      error: err.message,
    });
  }
});

// =======================================================
// POST - SIMPAN HASIL FINAL (SUBMIT)
// =======================================================
router.post("/", upload.any(), async (req, res) => {
  let conn;
  try {
    const bodyData = req.body.data ? JSON.parse(req.body.data) : req.body;
    const { peserta_id, exam_id, jawaban } = bodyData;

    // Validasi input
    if (!peserta_id || !exam_id || !Array.isArray(jawaban)) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    for (const j of jawaban) {
      if (!j.question_id) continue;

      let benar = false;
      let jawabanTextFinal = j.jawaban_text;

      const { question_id, tipe_soal } = j;

      // --- Tipe Soal Dokumen ---
      if (tipe_soal === "soalDokumen") {
        const files =
          req.files?.filter(
            (x) => x.fieldname === `dokumen_${question_id}`
          ) || [];

        if (files.length > 0) {
          const paths = files.map((f) => `/uploads_jawaban/${f.filename}`);
          jawabanTextFinal = JSON.stringify(paths);
        } else {
          jawabanTextFinal = j.jawaban_text ?? null;
        }
        benar = false; // penilaian manual
      }

      // --- Pilihan Ganda ---
      else if (tipe_soal === "pilihanGanda" && j.jawaban_text) {
        const optionId = parseInt(j.jawaban_text, 10);
        if (!isNaN(optionId)) {
          const [opsi] = await conn.execute(
            "SELECT is_correct, opsi_text FROM options WHERE id = ? LIMIT 1",
            [optionId]
          );
          if (opsi.length > 0) {
            benar = !!opsi[0].is_correct;
            jawabanTextFinal = opsi[0].opsi_text;
          } else {
            jawabanTextFinal = null;
          }
        } else {
          jawabanTextFinal = null;
        }
      }

      // --- Teks Singkat ---
      else if (tipe_soal === "teksSingkat" && j.jawaban_text) {
        const [kunci] = await conn.execute(
          "SELECT opsi_text FROM options WHERE question_id = ? AND is_correct = 1 LIMIT 1",
          [question_id]
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
      }

      // --- Esai ---
      else if (tipe_soal === "esay") {
        // penilaian manual
      }

      // 💾 Simpan hasil FINAL
      await conn.execute(
        `
        INSERT INTO hasil_ujian
          (peserta_id, exam_id, question_id, jawaban_text, benar)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          jawaban_text = VALUES(jawaban_text),
          benar = VALUES(benar),
          created_at = NOW()
        `,
        [peserta_id, exam_id, question_id, jawabanTextFinal, benar]
      );
    }

    await conn.commit();
    conn.release();

    return res
      .status(201)
      .json({ message: "✅ Hasil ujian berhasil disimpan dan dinilai" });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
      conn.release();
    }
    console.error("Error simpan hasil ujian:", err);
    return res.status(500).json({
      message: "Gagal menyimpan hasil ujian",
      error: err.message,
    });
  }
});

// =======================================================
// GET - Ambil semua hasil ujian (Rekap List)
// =======================================================
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const { id: loggedInAdminId, role } = req.admin;
    const { target_admin_id } = req.query;

    let whereClause = "WHERE e.admin_id = ?";
    let params = [loggedInAdminId];

    if (role === "superadmin") {
      if (target_admin_id) {
        whereClause = "WHERE e.admin_id = ?";
        params = [target_admin_id];
      } else {
        whereClause = "WHERE 1=1";
        params = [];
      }
    }

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
        q.bobot,  -- <--- UPDATE DISINI: Menambahkan kolom bobot agar frontend bisa menghitung nilai akurat
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
      ${whereClause}
      ORDER BY e.id, p.id, q.id
      `,
      params
    );

    const normalized = rows.map((r) => {
      if (r.tipe_soal === "soalDokumen") {
        const { first, files } = normalizeDokumenJawaban(r.jawaban_text);
        return {
          ...r,
          jawaban_text: first,
          jawaban_files: files,
        };
      }
      return r;
    });

    return res.json(normalized);
  } catch (err) {
    console.error("Error GET /api/hasil:", err);
    return res.status(500).json({ message: "Gagal memuat rekap hasil" });
  }
});

// =======================================================
// GET - Detail Hasil Peserta (FIXED: Added h.exam_id)
// =======================================================
router.get("/peserta/:peserta_id", verifyAdmin, async (req, res) => {
  let conn;
  try {
    const { id: loggedInAdminId, role: adminRole } = req.admin;
    const { peserta_id } = req.params;
    const { target_admin_id } = req.query;

    let whereClause = "AND e.admin_id = ?";
    let params = [peserta_id, loggedInAdminId];

    if (adminRole === "superadmin") {
      if (target_admin_id) {
        whereClause = "AND e.admin_id = ?";
        params = [peserta_id, target_admin_id];
      } else {
        whereClause = "";
        params = [peserta_id];
      }
    }

    conn = await pool.getConnection();

    // Query sudah benar (sudah ada q.bobot)
    const [rows] = await conn.execute(
      `
      SELECT 
        q.id AS question_id,
        q.soal_text,
        q.tipe_soal,
        q.bobot,
        h.jawaban_text,
        h.benar,
        h.created_at,
        h.exam_id,               
        e.keterangan AS keterangan_ujian,
        e.admin_id 
      FROM hasil_ujian h
      JOIN questions q ON q.id = h.question_id
      JOIN exams e ON e.id = h.exam_id
      WHERE h.peserta_id = ? 
      ${whereClause}
      ORDER BY q.id;
      `,
      params
    );

    if (rows.length === 0) {
      conn.release();
      return res.status(404).json({
        message: "Hasil ujian tidak ditemukan untuk peserta ini.",
      });
    }

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

      if (row.tipe_soal === "soalDokumen") {
        const { first, files } = normalizeDokumenJawaban(row.jawaban_text);
        row.jawaban_text = first;
        row.jawaban_files = files;
      }
    }

    conn.release();
    return res.json(rows);
  } catch (err) {
    if (conn) conn.release();
    console.error("Error ambil hasil detail peserta:", err);
    return res.status(500).json({
      message: "Gagal memuat hasil detail",
      error: err.message,
    });
  }
});

// =======================================================
// PUT - NILAI MANUAL (BENAR/SALAH)
// =======================================================
router.put("/nilai-manual", verifyAdmin, async (req, res) => {
  try {
    const { peserta_id, exam_id, question_id, benar } = req.body;

    // Validasi sederhana
    if (!peserta_id || !exam_id || !question_id) {
      return res.status(400).json({ message: "Parameter tidak lengkap (peserta_id, exam_id, question_id)." });
    }

    // Konversi benar ke integer (1 atau 0)
    const statusBenar = (benar === true || benar === 1 || benar === "1") ? 1 : 0;

    await pool.execute(
      `UPDATE hasil_ujian 
       SET benar = ? 
       WHERE peserta_id = ? AND exam_id = ? AND question_id = ?`,
      [statusBenar, peserta_id, exam_id, question_id]
    );

    return res.json({ message: "Status nilai berhasil diperbarui.", status: statusBenar });
  } catch (err) {
    console.error("Error nilai manual:", err);
    return res.status(500).json({ message: "Gagal memperbarui nilai." });
  }
});

module.exports = router;