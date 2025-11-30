// File: src/routes/adminList.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");

router.get("/", verifyAdmin, async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: "Akses ditolak. Hanya Superadmin." });
    }

    // PERUBAHAN: Tambahkan is_active ke dalam SELECT
    const [rows] = await pool.execute(
      "SELECT id, username, email, role, created_at, is_active FROM admins WHERE role = 'admin' ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (err) {
    console.error("Error get admin list:", err);
    res.status(500).json({ message: "Gagal memuat daftar admin." });
  }
});

module.exports = router;