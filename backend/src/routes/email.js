// File: src/routes/email.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");

// ===============================
// GET /api/email/smtp
// Ambil konfigurasi SMTP milik admin yang login
// ===============================
router.get("/smtp", verifyAdmin, async (req, res) => {
  try {
    const adminId = req.admin.id;

    const [rows] = await pool.execute(
      "SELECT service, host, port, secure, auth_user, auth_pass, from_name FROM smtp_settings WHERE admin_id = ? LIMIT 1",
      [adminId]
    );

    if (rows.length === 0) {
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

    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /api/email/smtp:", err);
    res.status(500).json({ message: "Gagal memuat pengaturan SMTP." });
  }
});

// ===============================
// PUT /api/email/smtp
// Simpan/update konfigurasi SMTP per admin
// ===============================
router.put("/smtp", verifyAdmin, express.json(), async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { service, host, port, secure, auth_user, auth_pass, from_name } =
      req.body;

    if (!auth_user || !auth_pass) {
      return res
        .status(400)
        .json({ message: "Email dan Password Aplikasi wajib diisi." });
    }

    // Cek apakah admin sudah punya setting
    const [rows] = await pool.execute(
      "SELECT id FROM smtp_settings WHERE admin_id = ? LIMIT 1",
      [adminId]
    );

    if (rows.length === 0) {
      // INSERT baru
      await pool.execute(
        `INSERT INTO smtp_settings 
         (admin_id, service, host, port, secure, auth_user, auth_pass, from_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          service || "gmail",
          host || "smtp.gmail.com",
          port || 587,
          secure ? 1 : 0,
          auth_user,
          auth_pass,
          from_name || "Admin Ujian",
        ]
      );
    } else {
      // UPDATE
      await pool.execute(
        `UPDATE smtp_settings 
         SET service=?, host=?, port=?, secure=?, auth_user=?, auth_pass=?, from_name=?, updated_at=NOW()
         WHERE admin_id=?`,
        [
          service || "gmail",
          host || "smtp.gmail.com",
          port || 587,
          secure ? 1 : 0,
          auth_user,
          auth_pass,
          from_name || "Admin Ujian",
          adminId,
        ]
      );
    }

    res.json({ message: "Pengaturan email berhasil disimpan." });
  } catch (err) {
    console.error("Error PUT /api/email/smtp:", err);
    res.status(500).json({ message: "Gagal menyimpan pengaturan SMTP." });
  }
});

module.exports = router;
