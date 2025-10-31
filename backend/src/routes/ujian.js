// src/routes/ujian.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ====================
// KONFIGURASI UPLOAD GAMBAR
// ====================

// Pastikan folder uploads tersedia
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer untuk simpan file gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Serve file gambar statis agar bisa diakses frontend
// Catatan: path ini akan tersedia di /api/ujian/uploads jika router ini dimount di /api/ujian
router.use("/uploads", express.static(uploadDir));

// Helper untuk parsing body fleksibel (multipart/form-data atau JSON)
function parseBodyData(req) {
  // Jika front-end mengirim { data: "<json-string>" }
  if (req.body && typeof req.body.data === "string") {
    try {
      return JSON.parse(req.body.data);
    } catch (e) {
      return {};
    }
  }
  // Jika front-end langsung mengirim object JSON (perlu express.json() di app utama)
  if (req.body && typeof req.body === "object") {
    return req.body.data && typeof req.body.data === "object"
      ? req.body.data
      : req.body;
  }
  return {};
}

// Normalisasi boolean dari berbagai bentuk input ("true", "1", true, "on")
function toBool(v) {
  return v === true || v === 1 || v === "1" || v === "true" || v === "on";
}

// ====================
// POST - Simpan ujian baru (dengan gambar opsional)
// - Bisa menerima file upload (gambar_i) ATAU path gambar lama via s.gambar
// - Tambahan: dukung kolom exams.acak_soal
// ====================
router.post("/", upload.any(), async (req, res) => {
  const bodyData = parseBodyData(req);
  const { keterangan, tanggal, jamMulai, jamBerakhir, soalList, acakSoal } = bodyData;

  // Validasi input
  if (!keterangan || !tanggal || !jamMulai || !jamBerakhir || !Array.isArray(soalList)) {
    return res.status(400).json({ message: "Payload tidak valid." });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Simpan data ujian utama (termasuk acak_soal)
    const [examResult] = await conn.execute(
      "INSERT INTO exams (keterangan, tanggal, jam_mulai, jam_berakhir, acak_soal) VALUES (?, ?, ?, ?, ?)",
      [keterangan, tanggal, jamMulai, jamBerakhir, toBool(acakSoal) ? 1 : 0]
    );
    const examId = examResult.insertId;

    // Simpan setiap soal beserta gambar (jika ada)
    for (let i = 0; i < soalList.length; i++) {
      const s = soalList[i] || {};
      const file = req.files?.find((f) => f.fieldname === `gambar_${i}`);

      // Jika tidak ada file baru, pakai path gambar lama dari body (jika ada)
      const gambarFromBody =
        s && typeof s.gambar === "string" && s.gambar.trim() !== ""
          ? s.gambar.trim()
          : null;

      const gambarPath = file ? `/uploads/${file.filename}` : gambarFromBody;

      const [qRes] = await conn.execute(
        "INSERT INTO questions (exam_id, tipe_soal, soal_text, gambar) VALUES (?, ?, ?, ?)",
        [examId, s.tipeSoal || "", s.soalText || "", gambarPath]
      );
      const qId = qRes.insertId;

      // Simpan pilihan jika soal pilihan ganda
      if (s.tipeSoal === "pilihanGanda" && Array.isArray(s.pilihan)) {
        const kunci = (s.kunciJawabanText || "").trim();
        const correctIndex = s.pilihan.findIndex((t) => {
          const teks = typeof t === "string" ? t : t?.text || "";
          return teks.trim() === kunci;
        });

        for (let j = 0; j < s.pilihan.length; j++) {
          const teks =
            typeof s.pilihan[j] === "string"
              ? s.pilihan[j]
              : s.pilihan[j]?.text || "";
          await conn.execute(
            "INSERT INTO options (question_id, opsi_text, is_correct) VALUES (?, ?, ?)",
            [qId, teks, j === correctIndex]
          );
        }
      }
    }

    await conn.commit();
    return res.status(201).json({ id: examId, message: "Ujian tersimpan." });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error("POST /api/ujian error:", err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan ujian.", error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// ====================
// GET - List semua ujian
// ====================
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM exams WHERE is_deleted = 0 ORDER BY created_at ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil daftar ujian" });
  }
});

// ====================
// GET - Ambil ujian AKTIF berdasarkan tanggal
// ====================
router.get("/tanggal/:tgl", async (req, res) => {
  try {
    const { tgl } = req.params;

    // Ambil semua ujian di tanggal tsb (yang belum dihapus/diarsip)
    const [rows] = await pool.execute(
      "SELECT * FROM exams WHERE is_deleted = 0 AND DATE(tanggal) = ?",
      [tgl]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Tidak ada ujian di tanggal ini" });
    }

    const padTime = (t) => (t?.length === 5 ? `${t}:00` : (t || "00:00:00"));
    const nowMs = Date.now();

    // Hitung window waktu setiap ujian
    const enriched = rows.map((ex) => {
      const start = new Date(`${tgl}T${padTime(ex.jam_mulai)}`);
      let end = new Date(`${tgl}T${padTime(ex.jam_berakhir)}`);
      // Jika jam_berakhir <= jam_mulai, berarti melewati tengah malam → tambah 1 hari
      if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);

      return {
        exam: ex,
        startMs: start.getTime(),
        endMs: end.getTime(),
      };
    });

    // Pilih ujian yang sedang aktif saat ini
    const aktif = enriched
      .filter((e) => nowMs >= e.startMs && nowMs <= e.endMs)
      .sort((a, b) => b.startMs - a.startMs)[0]; // jika overlap, pilih yang start terbaru

    if (aktif) {
      return res.json(aktif.exam);
    }

    // Tidak ada yang aktif persis sekarang
    return res.status(404).json({
      message: "Belum ada ujian aktif saat ini untuk tanggal tersebut.",
    });
  } catch (err) {
    console.error("Error GET /tanggal/:tgl:", err);
    res.status(500).json({ message: "Gagal mengambil ujian berdasarkan tanggal" });
  }
});

// ====================
// GET - Detail ujian berdasarkan ID
// ====================
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Ambil ujian utama
    const [ujianRows] = await pool.execute("SELECT * FROM exams WHERE id = ?", [id]);
    if (ujianRows.length === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }
    const ujian = ujianRows[0];

    // Ambil semua soal
    const [soalRows] = await pool.execute(
      "SELECT * FROM questions WHERE exam_id = ?",
      [id]
    );

    // Ambil pilihan untuk tiap soal
    for (const soal of soalRows) {
      const [pilihanRows] = await pool.execute(
        "SELECT id, opsi_text AS text, is_correct FROM options WHERE question_id = ?",
        [soal.id]
      );
      soal.pilihan = pilihanRows;
    }

    // Kirim response lengkap
    res.json({
      id: ujian.id,
      keterangan: ujian.keterangan,
      tanggal: ujian.tanggal,
      jam_mulai: ujian.jam_mulai,         // penting
      jam_berakhir: ujian.jam_berakhir,   // penting
      acak_soal: !!ujian.acak_soal,       // <— TAMBAH: kirim flag acak_soal ke frontend
      soalList: soalRows.map((s) => ({
        id: s.id,
        tipeSoal: s.tipe_soal,
        soalText: s.soal_text,
        gambar: s.gambar || null,
        pilihan:
          s.tipe_soal === "pilihanGanda"
            ? s.pilihan.map((p) => ({
                id: p.id,
                text: p.text,
                isCorrect: !!p.is_correct,
              }))
            : [],
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memuat detail ujian" });
  }
});

// ====================
// DELETE - Hapus ujian (soft delete)
// ====================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute(
      "UPDATE exams SET is_deleted = 1 WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }
    return res.json({ message: "Ujian berhasil diarsipkan (soft delete)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus ujian" });
  }
});

// ====================
// PUT - Update ujian
// - Bisa menerima file upload baru ATAU mempertahankan path s.gambar
// - Tambahan: update exams.acak_soal
// ====================
router.put("/:id", upload.any(), async (req, res) => {
  const { id } = req.params;
  const bodyData = parseBodyData(req);
  const { keterangan, tanggal, jamMulai, jamBerakhir, soalList, acakSoal } = bodyData;

  if (!keterangan || !tanggal || !Array.isArray(soalList)) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.execute(
      "UPDATE exams SET keterangan=?, tanggal=?, jam_mulai=?, jam_berakhir=?, acak_soal=? WHERE id=?",
      [keterangan, tanggal, jamMulai, jamBerakhir, toBool(acakSoal) ? 1 : 0, id]
    );

    // Hapus dulu options yang terkait semua soal ujian ini (jika tidak ada ON DELETE CASCADE)
    await conn.execute(
      `DELETE o FROM options o
       JOIN questions q ON o.question_id = q.id
       WHERE q.exam_id = ?`,
      [id]
    );

    // Hapus soal lama
    await conn.execute("DELETE FROM questions WHERE exam_id=?", [id]);

    // Simpan ulang soal + gambar
    for (let i = 0; i < soalList.length; i++) {
      const s = soalList[i] || {};
      const file = req.files?.find((f) => f.fieldname === `gambar_${i}`);

      const gambarFromBody =
        s && typeof s.gambar === "string" && s.gambar.trim() !== ""
          ? s.gambar.trim()
          : null;

      const gambarPath = file ? `/uploads/${file.filename}` : gambarFromBody;

      const [qRes] = await conn.execute(
        "INSERT INTO questions (exam_id, tipe_soal, soal_text, gambar) VALUES (?, ?, ?, ?)",
        [id, s.tipeSoal || "", s.soalText || "", gambarPath]
      );
      const qId = qRes.insertId;

      if (s.tipeSoal === "pilihanGanda" && Array.isArray(s.pilihan)) {
        const kunci = (s.kunciJawabanText || "").trim();
        const correctIndex = s.pilihan.findIndex((t) => {
          const teks = typeof t === "string" ? t : t?.text || "";
          return teks.trim() === kunci;
        });

        for (let j = 0; j < s.pilihan.length; j++) {
          const teks =
            typeof s.pilihan[j] === "string"
              ? s.pilihan[j]
              : s.pilihan[j]?.text || "";
          await conn.execute(
            "INSERT INTO options (question_id, opsi_text, is_correct) VALUES (?, ?, ?)",
            [qId, teks, j === correctIndex]
          );
        }
      }
    }

    await conn.commit();
    return res.json({ message: "Ujian berhasil diperbarui" });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error(err);
    return res
      .status(500)
      .json({ message: "Gagal memperbarui ujian.", error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
