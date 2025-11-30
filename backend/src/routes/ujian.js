// File: src/routes/ujian.js

const verifyAdmin = require("../middleware/verifyAdmin");
const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- SETUP FOLDER UPLOAD ---
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// --- SETUP FOLDER JAWABAN PESERTA (BARU) ---
const uploadJawabanDir = path.join(__dirname, "../uploads_jawaban");
if (!fs.existsSync(uploadJawabanDir)) {
  fs.mkdirSync(uploadJawabanDir, { recursive: true });
}

// 1. Multer untuk Gambar Soal (Admin)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// 2. Multer Khusus Jawaban Peserta (Public Upload)
const storageJawaban = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadJawabanDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const uploadJawaban = multer({ storage: storageJawaban });

// Serve file statis
router.use("/uploads", express.static(uploadDir));
router.use("/uploads_jawaban", express.static(uploadJawabanDir));

// Helper parsing body
function parseBodyData(req) {
  if (req.body && typeof req.body.data === "string") {
    try {
      return JSON.parse(req.body.data);
    } catch (e) {
      return {};
    }
  }
  if (req.body && typeof req.body === "object") {
    return req.body.data && typeof req.body.data === "object"
      ? req.body.data
      : req.body;
  }
  return {};
}

// Normalisasi boolean
function toBool(v) {
  return v === true || v === 1 || v === "1" || v === "true" || v === "on";
}

// ==========================================
// 🔴 ROUTE BARU: UPLOAD JAWABAN PESERTA
// ==========================================
// Endpoint ini dipanggil oleh frontend saat peserta memilih file
router.post("/upload-peserta", uploadJawaban.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Tidak ada file yang diupload." });
  }
  // Kembalikan path file agar frontend bisa menyimpannya sebagai jawaban
  const filePath = `/uploads_jawaban/${req.file.filename}`;
  return res.json({ filePath, originalName: req.file.originalname });
});

// ====================
// POST - Simpan ujian baru (Admin)
// ====================
router.post("/", verifyAdmin, upload.any(), async (req, res) => {
  const bodyData = parseBodyData(req);
  const {
    keterangan,
    tanggal,
    tanggalBerakhir,
    jamMulai,
    jamBerakhir,
    durasi,
    soalList,
    acakSoal,
    acakOpsi,
  } = bodyData;

  if (
    !keterangan ||
    !tanggal ||
    !tanggalBerakhir ||
    !jamMulai ||
    !jamBerakhir ||
    !durasi ||
    !Array.isArray(soalList)
  ) {
    return res
      .status(400)
      .json({ message: "Payload tidak valid. Pastikan durasi terisi." });
  }

  const loggedInAdminId = req.admin.id;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [examResult] = await conn.execute(
      "INSERT INTO exams (keterangan, tanggal, tanggal_berakhir, jam_mulai, jam_berakhir, acak_soal, acak_opsi, durasi, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        keterangan,
        tanggal,
        tanggalBerakhir,
        jamMulai,
        jamBerakhir,
        toBool(acakSoal) ? 1 : 0,
        toBool(acakOpsi) ? 1 : 0,
        parseInt(durasi, 10) || 0,
        loggedInAdminId,
      ]
    );
    const examId = examResult.insertId;

    for (let i = 0; i < soalList.length; i++) {
      const s = soalList[i] || {};
      const file = req.files?.find((f) => f.fieldname === `gambar_${i}`);
      const gambarFromBody =
        s && typeof s.gambar === "string" && s.gambar.trim() !== ""
          ? s.gambar.trim()
          : null;
      const gambarPath = file ? `/uploads/${file.filename}` : gambarFromBody;

      // --- LOGIKA BARU: SIAPKAN JSON CONFIG UNTUK SOAL DOKUMEN ---
      let fileConfigJSON = null;
      if (s.tipeSoal === "soalDokumen") {
        fileConfigJSON = JSON.stringify({
          allowedTypes: s.allowedTypes || [], // Array, misal: ['.pdf', '.docx']
          maxSize: s.maxSize || 5,            // MB
          maxCount: s.maxCount || 1           // Jumlah file
        });
      }
      // -----------------------------------------------------------

      const bobotSoal = parseInt(s.bobot) || 1; // Default bobot 1 jika kosong
      const [qRes] = await conn.execute(
        "INSERT INTO questions (exam_id, tipe_soal, soal_text, gambar, file_config, bobot) VALUES (?, ?, ?, ?, ?, ?)",
        [examId, s.tipeSoal || "", s.soalText || "", gambarPath, fileConfigJSON, bobotSoal]
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
      } else if (s.tipeSoal === "teksSingkat" && s.kunciJawabanText) {
        await conn.execute(
          "INSERT INTO options (question_id, opsi_text, is_correct) VALUES (?, ?, ?)",
          [qId, s.kunciJawabanText, 1]
        );
      }
    }

    await conn.commit();
    return res.status(201).json({ id: examId, message: "Ujian tersimpan." });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch { }
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
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const { id: loggedInAdminId, role } = req.admin;
    const { target_admin_id } = req.query;

    let adminIdToQuery = loggedInAdminId;

    if (role === "superadmin" && target_admin_id) {
      adminIdToQuery = target_admin_id;
    }

    const query = `
      SELECT * FROM exams
      WHERE is_deleted = 0
      AND admin_id = ?
      ORDER BY created_at ASC
    `;

    const [rows] = await pool.execute(query, [adminIdToQuery]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil daftar ujian" });
  }
});

// ====================
// GET - Ambil ujian AKTIF berdasarkan tanggal (Legacy)
// ====================
router.get("/tanggal/:tgl", async (req, res) => {
  try {
    const { tgl } = req.params;
    const [rows] = await pool.execute(
      "SELECT * FROM exams WHERE is_deleted = 0 AND ? BETWEEN DATE(tanggal) AND DATE(tanggal_berakhir)",
      [tgl]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Tidak ada ujian di tanggal ini" });
    }
    return res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil ujian" });
  }
});

// =======================================================
// GET - Cek Ujian AKTIF (LOGIKA HARIAN DIPERKETAT)
// =======================================================
router.get("/check-active/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      "SELECT * FROM exams WHERE is_deleted = 0 AND id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Ujian dengan ID ini tidak ditemukan." });
    }

    const ujian = rows[0];

    const now = new Date();
    const wibDateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const wibTimeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const nowWIB_Date = wibDateFormatter.format(now);
    const nowWIB_Time = wibTimeFormatter.format(now);

    const startDate = new Date(ujian.tanggal).toLocaleDateString("en-CA");
    const endDate = new Date(ujian.tanggal_berakhir).toLocaleDateString("en-CA");
    const startTime = ujian.jam_mulai;
    const endTime = ujian.jam_berakhir;

    if (nowWIB_Date < startDate) {
      return res.status(403).json({
        message: `Ujian belum dimulai. Tanggal mulai: ${startDate}`,
      });
    }
    if (nowWIB_Date > endDate) {
      return res.status(403).json({
        message: `Periode ujian sudah berakhir pada tanggal ${endDate}`,
      });
    }

    if (nowWIB_Time < startTime) {
      return res.status(403).json({
        message: `Ujian hari ini belum dibuka. Jam akses: ${startTime} - ${endTime} WIB`,
      });
    }
    if (nowWIB_Time > endTime) {
      return res.status(403).json({
        message: `Jam akses ujian hari ini sudah ditutup (${endTime} WIB).`,
      });
    }

    return res.json(ujian);
  } catch (err) {
    console.error("Error GET /check-active/:id:", err);
    res.status(500).json({ message: "Gagal memverifikasi status ujian." });
  }
});

// ====================
// GET - Detail ujian publik (tanpa verifyAdmin)
// ====================
router.get("/public/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [ujianRows] = await pool.execute(
      "SELECT * FROM exams WHERE id = ? AND is_deleted = 0",
      [id]
    );
    if (ujianRows.length === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan." });
    }

    const ujian = ujianRows[0];

    // Ambil kolom file_config juga
    const [soalRows] = await pool.execute(
      "SELECT id, tipe_soal AS tipeSoal, soal_text AS soalText, gambar, file_config FROM questions WHERE exam_id = ?",
      [id]
    );

    // Parsing config untuk publik (jika perlu validasi di frontend user)
    const processedSoalList = soalRows.map(s => {
      let config = {};
      try {
        if (s.file_config) config = typeof s.file_config === 'string' ? JSON.parse(s.file_config) : s.file_config;
      } catch (e) { }

      return {
        ...s,
        fileConfig: config, // kirim ke frontend public
        pilihan: []
      };
    });

    for (let s of processedSoalList) {
      const [opsiRows] = await pool.execute(
        "SELECT id, opsi_text AS text, is_correct AS isCorrect FROM options WHERE question_id = ?",
        [s.id]
      );
      s.pilihan = opsiRows;
      // Hapus raw file_config agar tidak double (opsional)
      delete s.file_config;
    }

    return res.json({ ...ujian, soalList: processedSoalList });
  } catch (err) {
    console.error("Error GET /api/ujian/public/:id:", err);
    res.status(500).json({ message: "Gagal mengambil data ujian publik." });
  }
});

// ====================
// GET - Detail ujian berdasarkan ID (ADMIN - UNTUK EDIT)
// ====================
router.get("/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const isOwner = await checkOwnership(req.admin, id);
    if (!isOwner) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Anda bukan pemilik ujian ini." });
    }

    const [ujianRows] = await pool.execute("SELECT * FROM exams WHERE id = ?", [
      id,
    ]);
    if (ujianRows.length === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }
    const ujian = ujianRows[0];

    const [soalRows] = await pool.execute(
      "SELECT * FROM questions WHERE exam_id = ?",
      [id]
    );

    for (const soal of soalRows) {
      const [pilihanRows] = await pool.execute(
        "SELECT id, opsi_text AS text, is_correct FROM options WHERE question_id = ?",
        [soal.id]
      );
      soal.pilihan = pilihanRows;
    }

    res.json({
      id: ujian.id,
      keterangan: ujian.keterangan,
      tanggal: ujian.tanggal,
      tanggal_berakhir: ujian.tanggal_berakhir,
      jam_mulai: ujian.jam_mulai,
      jam_berakhir: ujian.jam_berakhir,
      acak_soal: !!ujian.acak_soal,
      acak_opsi: !!ujian.acak_opsi,
      durasi: ujian.durasi,
      soalList: soalRows.map((s) => {
        // --- PARSING JSON CONFIG ---
        let config = {};
        if (s.file_config) {
          try {
            config = typeof s.file_config === 'string' ? JSON.parse(s.file_config) : s.file_config;
          } catch (e) { config = {} }
        }
        // ---------------------------

        return {
          id: s.id,
          tipeSoal: s.tipe_soal,
          bobot: s.bobot,
          soalText: s.soal_text,
          gambar: s.gambar || null,
          // Kembalikan config ke frontend agar form terisi
          allowedTypes: config.allowedTypes || [],
          maxSize: config.maxSize || 5,
          maxCount: config.maxCount || 1,
          pilihan:
            s.tipe_soal === "pilihanGanda" || s.tipe_soal === "teksSingkat"
              ? s.pilihan.map((p) => ({
                id: p.id,
                text: p.text,
                isCorrect: !!p.is_correct,
              }))
              : [],
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memuat detail ujian" });
  }
});

// ====================
// FUNGSI HELPER BARU UNTUK CEK KEPEMILIKAN
// ====================
async function checkOwnership(admin, examId) {
  if (admin.role === "superadmin") {
    return true;
  }

  const [rows] = await pool.execute(
    "SELECT admin_id FROM exams WHERE id = ?",
    [examId]
  );
  if (rows.length === 0) {
    throw new Error("Ujian tidak ditemukan");
  }

  return rows[0].admin_id === admin.id;
}

// ====================
// DELETE - Hapus ujian (soft delete)
// ====================
router.delete("/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const isOwner = await checkOwnership(req.admin, id);
    if (!isOwner) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Anda bukan pemilik ujian ini." });
    }

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
// ====================
router.put("/:id", verifyAdmin, upload.any(), async (req, res) => {
  const { id } = req.params;

  const bodyData = parseBodyData(req);
  const {
    keterangan,
    tanggal,
    tanggalBerakhir,
    jamMulai,
    jamBerakhir,
    durasi,
    soalList,
    acakSoal,
    acakOpsi,
  } = bodyData;

  if (
    !keterangan ||
    !tanggal ||
    !tanggalBerakhir ||
    !jamMulai ||
    !jamBerakhir ||
    !durasi
  ) {
    return res.status(400).json({
      message: "Data utama (keterangan, waktu, durasi) tidak lengkap",
    });
  }

  let conn;
  try {
    const isOwner = await checkOwnership(req.admin, id);
    if (!isOwner) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Anda bukan pemilik ujian ini." });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.execute(
      "UPDATE exams SET keterangan=?, tanggal=?, tanggal_berakhir=?, jam_mulai=?, jam_berakhir=?, acak_soal=?, acak_opsi=?, durasi=? WHERE id=?",
      [
        keterangan,
        tanggal,
        tanggalBerakhir,
        jamMulai,
        jamBerakhir,
        toBool(acakSoal) ? 1 : 0,
        toBool(acakOpsi) ? 1 : 0,
        parseInt(durasi, 10) || 0,
        id,
      ]
    );

    if (Array.isArray(soalList)) {
      const [dbSoalRows] = await pool.execute(
        "SELECT id FROM questions WHERE exam_id = ?",
        [id]
      );
      const dbSoalIds = new Set(dbSoalRows.map((q) => q.id));
      const frontendSoalIds = new Set(
        soalList
          .filter((s) => typeof s.id === "number" && s.id > 0)
          .map((s) => s.id)
      );

      for (const dbId of dbSoalIds) {
        if (!frontendSoalIds.has(dbId)) {
          await conn.execute("DELETE FROM options WHERE question_id = ?", [
            dbId,
          ]);
          await conn.execute("DELETE FROM questions WHERE id = ?", [dbId]);
        }
      }

      for (let i = 0; i < soalList.length; i++) {
        const s = soalList[i] || {};
        const file = req.files?.find((f) => f.fieldname === `gambar_${i}`);
        const gambarFromBody =
          s && typeof s.gambar === "string" && s.gambar.trim() !== ""
            ? s.gambar.trim()
            : null;
        const gambarPath = file ? `/uploads/${file.filename}` : gambarFromBody;

        // --- LOGIKA BARU: SIAPKAN JSON CONFIG (UPDATE) ---
        let fileConfigJSON = null;
        if (s.tipeSoal === "soalDokumen") {
          fileConfigJSON = JSON.stringify({
            allowedTypes: s.allowedTypes || [],
            maxSize: s.maxSize || 5,
            maxCount: s.maxCount || 1
          });
        }
        // -------------------------------------------------

        const kunci = (s.kunciJawabanText || "").trim();
        const correctIndex = Array.isArray(s.pilihan)
          ? s.pilihan.findIndex((t) => {
            const teks = typeof t === "string" ? t : t?.text || "";
            return teks.trim() === kunci;
          })
          : -1;

        if (typeof s.id === "number" && dbSoalIds.has(s.id)) {
          const qId = s.id;

          // Update data pertanyaan termasuk file_config
          const bobotUpdate = parseInt(s.bobot) || 1;
          await conn.execute(
            "UPDATE questions SET tipe_soal = ?, soal_text = ?, gambar = ?, file_config = ?, bobot = ? WHERE id = ?",
            [s.tipeSoal || "", s.soalText || "", gambarPath, fileConfigJSON, bobotUpdate, qId]
          );

          await conn.execute("DELETE FROM options WHERE question_id = ?", [
            qId,
          ]);

          if (s.tipeSoal === "pilihanGanda" && Array.isArray(s.pilihan)) {
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
          } else if (s.tipeSoal === "teksSingkat" && s.kunciJawabanText) {
            await conn.execute(
              "INSERT INTO options (question_id, opsi_text, is_correct) VALUES (?, ?, ?)",
              [qId, s.kunciJawabanText, 1]
            );
          }
        } else {
          // Insert Soal Baru (saat edit)
          const bobotNew = parseInt(s.bobot) || 1;
          const [qRes] = await conn.execute(
            "INSERT INTO questions (exam_id, tipe_soal, soal_text, gambar, file_config, bobot) VALUES (?, ?, ?, ?, ?, ?)",
            [id, s.tipeSoal || "", s.soalText || "", gambarPath, fileConfigJSON, bobotNew]
          );
          const qId = qRes.insertId;

          if (s.tipeSoal === "pilihanGanda" && Array.isArray(s.pilihan)) {
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
          } else if (s.tipeSoal === "teksSingkat" && s.kunciJawabanText) {
            await conn.execute(
              "INSERT INTO options (question_id, opsi_text, is_correct) VALUES (?, ?, ?)",
              [qId, s.kunciJawabanText, 1]
            );
          }
        }
      }
    }

    await conn.commit();
    return res.json({ message: "Ujian berhasil diperbarui" });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollErr) {
        console.error("Rollback failed:", rollErr);
      }
    }
    console.error("PUT /api/ujian/:id error:", err);
    return res
      .status(500)
      .json({ message: "Gagal memperbarui ujian.", error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;