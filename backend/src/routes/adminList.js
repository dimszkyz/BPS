// File: src/routes/adminList.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");

// GET /api/admin-list
// Mengambil semua admin (kecuali superadmin itu sendiri jika diinginkan, atau semua)
router.get("/", verifyAdmin, async (req, res) => {
  try {
    // Pastikan hanya Superadmin yang bisa akses
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: "Akses ditolak. Hanya Superadmin." });
    }

    // Ambil data id, username, email, role, created_at
    // Filter: Tampilkan yang role='admin' saja (atau semua jika mau)
    const [rows] = await pool.execute(
      "SELECT id, username, email, role, created_at FROM admins WHERE role = 'admin' ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (err) {
    console.error("Error get admin list:", err);
    res.status(500).json({ message: "Gagal memuat daftar admin." });
  }
});

module.exports = router;