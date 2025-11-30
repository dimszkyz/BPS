// File: src/middleware/verifyAdmin.js
const jwt = require("jsonwebtoken");
const pool = require("../db"); // <--- TAMBAHKAN IMPORT POOL DATABASE
const JWT_SECRET = process.env.JWT_SECRET || "kunci-rahasia-default";

async function verifyAdmin(req, res, next) { // <--- JADIKAN ASYNC
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak ditemukan." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { clockTolerance: 30 });

    // --- [TAMBAHAN KEAMANAN] CEK STATUS DI DB ---
    // Ini memastikan admin yang sudah dihapus/nonaktif tidak bisa akses lagi
    // meskipun tokennya masih valid secara waktu.
    const [rows] = await pool.execute(
      "SELECT id, role, is_active FROM admins WHERE id = ? LIMIT 1",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Akun tidak ditemukan." });
    }

    const user = rows[0];
    // Pastikan menangani tipe data (0/1 atau true/false)
    if (user.is_active === 0 || user.is_active === false) {
      return res.status(403).json({ message: "Akun Anda telah dinonaktifkan." });
    }
    // -------------------------------------------

    req.admin = decoded; 

    // --- LOGIC SLIDING EXPIRATION ---
    const nowUnix = Math.floor(Date.now() / 1000);
    const timeRemaining = decoded.exp - nowUnix;
    const REFRESH_THRESHOLD = 3600; // 1 Jam

    if (timeRemaining < REFRESH_THRESHOLD) {
      const newToken = jwt.sign(
        {
          id: user.id,        // Gunakan data fresh dari DB
          username: decoded.username,
          role: user.role,    // Gunakan role fresh dari DB (jika role diubah saat login)
        },
        JWT_SECRET,
        { expiresIn: "3h" }
      );

      res.setHeader("x-new-token", newToken);
      res.setHeader("Access-Control-Expose-Headers", "x-new-token");
    }

    next();
  } catch (err) {
    // MODIFIKASI: Penanganan error spesifik agar log server bersih
    if (err.name === 'TokenExpiredError') {
      // Tidak perlu console.error panjang, cukup info singkat atau diam saja
      return res.status(401).json({ message: "Sesi telah berakhir. Silakan login kembali." });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Token tidak valid." });
    }

    // Hanya log error jika BUKAN masalah expired/invalid signature (misal: error database dll)
    console.error("Internal Auth Error:", err);
    return res.status(500).json({ message: "Terjadi kesalahan autentikasi." });
  }
}

module.exports = verifyAdmin;