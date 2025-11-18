// File: src/routes/authAdmin.js (Sudah diperbarui dengan /register)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyAdmin = require("../middleware/verifyAdmin"); // <-- BARU: Import middleware

// Tidak perlu node-fetch di Node >=18 (termasuk v24). 'fetch' sudah global.
const JWT_SECRET = process.env.JWT_SECRET || "kunci-rahasia-default";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY; // isi di .env

// ===================================
// POST /api/admin/login
// (Tidak ada perubahan di sini)
// ===================================
router.post("/login", async (req, res) => {
  try {
    // Terima 'captcha' (dari frontend). Jika Anda sudah pakai 'token', ini tetap didukung.
    const { username, password, captcha, token } = req.body;
    const captchaToken = captcha || token;

    // 1) Validasi input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi." });
    }
    if (!captchaToken) {
      return res.status(400).json({ message: "Captcha wajib diisi." });
    }
    if (!RECAPTCHA_SECRET_KEY) {
      return res
        .status(500)
        .json({ message: "Konfigurasi reCAPTCHA tidak ditemukan di server." });
    }

    // 2) Verifikasi captcha ke Google
    // Gunakan application/x-www-form-urlencoded
    const verifyBody = new URLSearchParams();
    verifyBody.append("secret", RECAPTCHA_SECRET_KEY);
    verifyBody.append("response", captchaToken);

    const googleRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyBody.toString(),
      }
    );
    const googleJson = await googleRes.json();

    if (!googleJson.success) {
      return res.status(403).json({ message: "Verifikasi captcha gagal." });
    }

    // 3) Cari admin berdasarkan username/email
    const [rows] = await pool.execute(
      "SELECT * FROM admins WHERE username = ? OR email = ? LIMIT 1",
      [username, username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: "Kredensial tidak valid." });
    }

    const admin = rows[0];

    // 4) Cek password (bcrypt compare)
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Kredensial tidak valid." });
    }

    // 5) Buat JWT
    const jwtToken = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role // <-- PENTING!
      },
      JWT_SECRET,
      {
        expiresIn: "3h",
      }
    );

    return res.status(200).json({
      message: "Login berhasil",
      token: jwtToken,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      },
    });
  } catch (err) {
    console.error("Error login admin:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
});

router.get("/invite-history", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.username,
        a.email,
        a.role,
        a.created_at,
        c.username AS invited_by
      FROM admins a
      LEFT JOIN admins c ON a.created_by_admin_id = c.id
      ORDER BY a.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error mengambil riwayat admin:", err);
    res.status(500).json({ message: "Gagal mengambil riwayat admin." });
  }
});

// ===================================
// ▼▼▼ KODE BARU DIMULAI DI SINI ▼▼▼
// ===================================
/**
 * [POST] /api/admin/register
 * Endpoint untuk mendaftar admin baru.
 * Hanya bisa diakses oleh admin lain yang sudah login (dijaga oleh verifyAdmin).
 */
router.post("/register", verifyAdmin, async (req, res) => {
  try {
    // ▼▼▼ PERUBAHAN DI SINI ▼▼▼
    // 1. Dapatkan ID admin yang sedang login (si pembuat) dari middleware
    const creatorAdminId = req.admin.id;
    const creatorAdminRole = req.admin.role;
    // 2. Hanya Superadmin yang boleh mendaftar admin baru
    if (creatorAdminRole !== 'superadmin') {
      return res.status(403).json({ message: "Hanya Superadmin yang dapat menambah admin baru." });
    }
    const { username, email, password } = req.body;

    if (!username || !email || !password) { //
      return res
        .status(400)
        .json({ message: "Username, email, dan password wajib diisi." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter." });
    }
    // Validasi email sederhana
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: "Format email tidak valid." });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const sql =
      "INSERT INTO admins (username, email, password_hash, created_by_admin_id) VALUES (?, ?, ?, ?)";
    await pool.execute(sql, [username, email, password_hash, creatorAdminId]);
    // ▲▲▲ AKHIR PERUBAHAN ▲▲▲
    return res.status(201).json({ message: "Admin baru berhasil ditambahkan." }); 

  } catch (err) {
    console.error("Error register admin:", err);

    // 5. Handle Error (terutama duplicate entry)
    // Tabel 'admins' Anda memiliki UNIQUE key di username dan email
    if (err.code === "ER_DUP_ENTRY") {
      // Kode error MariaDB/MySQL untuk duplikat
      return res
        .status(409) // 409 Conflict
        .json({ message: "Username atau email sudah terdaftar." });
    }

    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
});
// ===================================
// ▲▲▲ KODE BARU BERAKHIR DI SINI ▼▲▲
// ===================================

module.exports = router;