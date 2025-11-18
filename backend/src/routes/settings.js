// backend/src/routes/settings.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db"); // Sesuaikan path ke db Anda
const verifyAdmin = require("../middleware/verifyAdmin"); // Sesuaikan path

// --- Konfigurasi Multer untuk Upload Gambar Background ---
// Pastikan folder 'uploads' ada di root backend
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Buat nama file unik
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Filter file: hanya izinkan gambar
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diizinkan!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Batas ukuran file 5MB
});

// ============================
// BAGIAN 1: PENGATURAN UMUM (Background, Logo, Teks)
// ============================

/**
 * [GET] Mengambil SEMUA pengaturan umum (key-value dari app_settings)
 * Endpoint: GET /api/settings/
 * (Tidak perlu diubah, query ini sudah dinamis)
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM app_settings"
    );
    const settings = rows.reduce((acc, curr) => {
      acc[curr.setting_key] = curr.setting_value;
      return acc;
    }, {});
    res.json(settings);
  } catch (err) {
    console.error("Gagal mengambil pengaturan umum:", err);
    res.status(500).json({ message: "Error server internal." });
  }
});

/**
 * [POST] Menyimpan pengaturan umum (termasuk upload file background, logo, dll)
 * Endpoint: POST /api/settings/
 */
router.post(
  "/",
  verifyAdmin,
  // ▼▼▼ PERUBAHAN DI SINI ▼▼▼
  // Gunakan multer .fields() untuk menangani 3 kemungkinan upload
  upload.fields([
    { name: "adminBgImage", maxCount: 1 },
    { name: "pesertaBgImage", maxCount: 1 },
    { name: "headerLogo", maxCount: 1 }, // <-- Tambahkan ini
  ]),
  // ▲▲▲ AKHIR PERUBAHAN ▲▲▲
  async (req, res) => {
    try {
      // ▼▼▼ PERUBAHAN DI SINI ▼▼▼

      // Ambil nilai lama atau nilai teks dari body jika tidak ada file baru
      let adminValue = req.body.adminBgImage_text || null;
      let pesertaValue = req.body.pesertaBgImage_text || null;
      let logoValue = req.body.headerLogo_text || null; // <-- Tambahkan ini
      
      // Ambil nilai teks header (dari input biasa)
      let textValue = req.body.headerText || "Ujian Online"; // <-- Tambahkan ini

      // Jika ada file baru diupload, ganti nilainya dengan path relative
      if (req.files && req.files["adminBgImage"]) {
        // Path yang disimpan di DB: /uploads/namafile.jpg
        adminValue = `/uploads/${req.files["adminBgImage"][0].filename}`;
      }

      if (req.files && req.files["pesertaBgImage"]) {
        pesertaValue = `/uploads/${req.files["pesertaBgImage"][0].filename}`;
      }

      // <-- Tambahkan ini -->
      if (req.files && req.files["headerLogo"]) {
        logoValue = `/uploads/${req.files["headerLogo"][0].filename}`;
      }

      // Gunakan query INSERT ... ON DUPLICATE KEY UPDATE untuk upsert
      const sql = `
        INSERT INTO app_settings (setting_key, setting_value) VALUES
        ('adminBgImage', ?),
        ('pesertaBgImage', ?),
        ('headerLogo', ?),    -- <-- Tambahkan ini
        ('headerText', ?)     -- <-- Tambahkan ini
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
      `;

      // Tambahkan value baru ke query
      await pool.query(sql, [adminValue, pesertaValue, logoValue, textValue]);

      res.json({
        message: "Pengaturan berhasil diperbarui!",
        adminBgImage: adminValue,
        pesertaBgImage: pesertaValue,
        headerLogo: logoValue,     // <-- Tambahkan ini
        headerText: textValue,      // <-- Tambahkan ini
      });

      // ▲▲▲ AKHIR PERUBAHAN ▲▲▲
    } catch (err) {
      console.error("Gagal menyimpan pengaturan:", err);
      res
        .status(500)
        .json({ message: err.message || "Error server internal." });
    }
  }
);

// ============================
// BAGIAN 2: PENGATURAN SMTP (Email)
// (Tidak ada perubahan di bagian ini)
// ============================

/**
 * [GET] Ambil Konfigurasi SMTP
 * Endpoint: GET /api/settings/smtp
 */
router.get("/smtp", verifyAdmin, async (req, res) => {
  try {
    // Asumsikan kita hanya menggunakan satu baris konfigurasi dengan ID 1
    const [rows] = await pool.execute(
      "SELECT service, host, port, secure, auth_user, auth_pass, from_name FROM smtp_settings WHERE id = 1"
    );

    if (rows.length === 0) {
      // Jika belum ada data, kembalikan nilai default kosong
      return res.json({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: 0,
        auth_user: "",
        auth_pass: "",
        from_name: "Admin Ujian",
      });
    }

    // Kembalikan data settings yang ada
    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /api/settings/smtp:", err);
    res.status(500).json({ message: "Gagal memuat pengaturan SMTP." });
  }
});

/**
 * [PUT] Simpan/Update Konfigurasi SMTP
 * Endpoint: PUT /api/settings/smtp
 * Menggunakan 'express.json()' karena data dikirim sebagai JSON raw, bukan FormData
 */
router.put("/smtp", verifyAdmin, express.json(), async (req, res) => {
  try {
    const { service, host, port, secure, auth_user, auth_pass, from_name } =
      req.body;

    // Validasi sederhana
    if (!auth_user || !auth_pass) {
      return res
        .status(400)
        .json({ message: "Email dan Password Aplikasi wajib diisi." });
    }

    // Gunakan INSERT ... ON DUPLICATE KEY UPDATE agar bisa insert jika belum ada
    // atau update jika sudah ada (dengan asumsi id=1)
    const sql = `
      INSERT INTO smtp_settings (id, service, host, port, secure, auth_user, auth_pass, from_name, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        service = VALUES(service),
        host = VALUES(host),
        port = VALUES(port),
        secure = VALUES(secure),
        auth_user = VALUES(auth_user),
        auth_pass = VALUES(auth_pass),
        from_name = VALUES(from_name),
        updated_at = NOW()
    `;

    await pool.execute(sql, [
      service || "gmail",
      host || "smtp.gmail.com",
      port || 587,
      secure ? 1 : 0, // Pastikan secure disimpan sebagai 0 atau 1 (TINYINT)
      auth_user,
      auth_pass,
      from_name || "Admin Ujian",
    ]);

    res.json({ message: "Pengaturan email berhasil disimpan." });
  } catch (err) {
    console.error("Error PUT /api/settings/smtp:", err);
    res.status(500).json({ message: "Gagal menyimpan pengaturan SMTP." });
  }
});

module.exports = router;