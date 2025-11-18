// ============================
// FILE: backend/src/routes/peserta.js (VERSI BERSIH)
// ============================

const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");

// ============================
// POST - Simpan Data Peserta
// ============================
router.post("/", async (req, res) => {
  try {
    // Hanya terima nama, nohp, email
    const { nama, nohp, email } = req.body;

    // Validasi minimal
    if (!nama || !nohp || !email) {
      return res.status(400).json({ message: "Nama, Nomor HP, dan Email wajib diisi!" });
    }

    // Simpan data baru (hanya 3 kolom)
    const [result] = await pool.execute(
      `INSERT INTO peserta (nama, nohp, email) VALUES (?, ?, ?)`,
      [nama, nohp, email]
    );

    // Kirim ID peserta baru
    res.status(201).json({
      id: result.insertId,
      message: "Peserta berhasil disimpan ✅",
    });
  } catch (err) {
    console.error("Error saat menyimpan peserta:", err);
    res.status(500).json({
      message: "Gagal menyimpan data peserta.",
      error: err.message,
    });
  }
});

// ============================
// PUT - Update Data Peserta berdasarkan ID (Peserta bisa update sendiri)
// ============================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, nohp, email } = req.body;

    if (!nama || !nohp || !email) {
      return res.status(400).json({ message: "Nama, Nomor HP, dan Email wajib diisi!" });
    }

    const [result] = await pool.execute(
      `UPDATE peserta SET nama = ?, nohp = ?, email = ? WHERE id = ?`,
      [nama, nohp, email, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Peserta tidak ditemukan" });
    }
    return res.status(200).json({ 
        id: parseInt(id, 10), 
        message: "Peserta berhasil diperbarui ✅" 
    });
  } catch (err) {
    console.error("Error saat memperbarui peserta:", err);
    return res.status(500).json({ message: "Gagal memperbarui data peserta.", error: err.message });
  }
});


// ============================
// GET - Ambil Semua Data Peserta
// ============================
router.get("/", verifyAdmin, async (req, res) => { // <-- 1. Tambah verifyAdmin
  try {
   // ▼▼▼ PERUBAHAN DI SINI ▼▼▼
   if (req.admin.role !== 'superadmin') {
     return res.status(403).json({ message: "Hanya Superadmin yang dapat melihat semua peserta." });
   }
    const [rows] = await pool.execute(
      "SELECT * FROM peserta ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error saat mengambil peserta:", err);
    res.status(500).json({ message: "Gagal memuat daftar peserta." });
  }
});

// ============================
// GET - Ambil Data Peserta berdasarkan ID
// ============================
router.get("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      "SELECT * FROM peserta WHERE id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Peserta tidak ditemukan" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error saat mengambil peserta:", err);
    res.status(500).json({ message: "Gagal mengambil data peserta." });
  }
});

// ============================
// DELETE - Hapus Peserta berdasarkan ID
// ============================
router.delete("/:id", verifyAdmin, async (req, res) => { // <-- 1. Tambah verifyAdmin
  try {
   // ▼▼▼ PERUBAHAN DI SINI ▼▼▼
   if (req.admin.role !== 'superadmin') {
     return res.status(403).json({ message: "Hanya Superadmin yang dapat menghapus peserta." });
   }
    const { id } = req.params;

    if (!id)
      return res.status(400).json({ message: "ID peserta tidak diberikan" });

    const [result] = await pool.execute("DELETE FROM peserta WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Peserta tidak ditemukan" });
    }

    res.json({ message: "Peserta berhasil dihapus" });
  } catch (err) {
    console.error("Error saat menghapus peserta:", err);
    res.status(500).json({
      message: "Gagal menghapus data peserta.",
      error: err.message,
    });
  }
});

module.exports = router;