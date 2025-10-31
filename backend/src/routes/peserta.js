// ============================
// FILE: backend/src/routes/peserta.js
// ============================

const express = require("express");
const router = express.Router();
const pool = require("../db");

// ============================
// POST - Simpan Data Peserta
// ============================
router.post("/", async (req, res) => {
  try {
    const { nama, ttl, nohp, email, jenisKelamin, alamat, sosmed } = req.body;

    // Validasi minimal
    if (!nama || !ttl || !nohp || !email || !jenisKelamin || !alamat) {
      return res.status(400).json({ message: "Semua field wajib diisi!" });
    }

    // =======================================================
    // PERBAIKAN: Blok ini dikomentari agar *selalu* membuat peserta baru.
    // Ini adalah penyebab bug di mana email yang sama akan
    // mengembalikan ID peserta lama.
    // =======================================================
    /*
    // Cek apakah peserta dengan email yang sama sudah ada (opsional)
    const [existing] = await pool.execute(
      "SELECT id FROM peserta WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing.length > 0) {
      return res
        .status(200)
        .json({
          id: existing[0].id,
          message: "Peserta sudah terdaftar, data lama digunakan ✅",
        });
    }
    */
    // =======================================================
    // AKHIR PERBAIKAN
    // =======================================================

    // Simpan data baru
    const [result] = await pool.execute(
      `INSERT INTO peserta 
        (nama, ttl, nohp, email, jenis_kelamin, alamat, sosmed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nama, ttl, nohp, email, jenisKelamin, alamat, sosmed || null]
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
// PUT - Update Data Peserta berdasarkan ID
// (Tidak ada perubahan di sini)
// ============================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, ttl, nohp, email, jenisKelamin, alamat, sosmed } = req.body;

    // Validasi minimal
    if (!nama || !ttl || !nohp || !email || !jenisKelamin || !alamat) {
      return res.status(400).json({ message: "Semua field wajib diisi!" });
    }

    // Perbarui data peserta berdasarkan ID
    const [result] = await pool.execute(
      `UPDATE peserta SET nama = ?, ttl = ?, nohp = ?, email = ?, jenis_kelamin = ?, alamat = ?, sosmed = ? 
       WHERE id = ?`,
      [nama, ttl, nohp, email, jenisKelamin, alamat, sosmed || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Peserta tidak ditemukan" });
    }

    res.status(200).json({
      message: "Peserta berhasil diperbarui ✅",
    });
  } catch (err) {
    console.error("Error saat memperbarui peserta:", err);
    res.status(500).json({
      message: "Gagal memperbarui data peserta.",
      error: err.message,
    });
  }
});

// ============================
// GET - Ambil Semua Data Peserta
// (Tidak ada perubahan di sini)
// ============================
router.get("/", async (req, res) => {
  try {
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
// (Tidak ada perubahan di sini)
// ============================
router.get("/:id", async (req, res) => {
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
// (Tidak ada perubahan di sini)
// ============================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id)
      return res.status(400).json({ message: "ID peserta tidak diberikan" });

    const [result] = await pool.execute("DELETE FROM peserta WHERE id = ?", [
      id,
    ]);

    // Log hasil dari DELETE query
    console.log("Hasil DELETE:", result);

    if (result.affectedRows === 0) {
      console.log("Peserta dengan ID:", id, "tidak ditemukan");
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