// File: src/middleware/verifyAdmin.js
const jwt = require("jsonwebtoken");
const pool = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || "kunci-rahasia-default";

async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak ditemukan." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1. Verifikasi JWT dengan Toleransi Waktu lebih besar (60 detik)
    const decoded = jwt.verify(token, JWT_SECRET, { clockTolerance: 60 });

    // 2. Cek Status Akun di Database
    const [rows] = await pool.execute(
      "SELECT id, role, is_active FROM admins WHERE id = ? LIMIT 1",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Akun tidak ditemukan." });
    }

    const user = rows[0];
    if (user.is_active === 0 || user.is_active === false) {
      return res.status(403).json({ message: "Akun Anda telah dinonaktifkan." });
    }

    req.admin = decoded;

    // 3. Logic Sliding Expiration (Perpanjang sesi otomatis)
    const nowUnix = Math.floor(Date.now() / 1000);
    const timeRemaining = decoded.exp - nowUnix;
    const REFRESH_THRESHOLD = 3600; // 1 Jam

    // Debugging Time (Hanya muncul di terminal backend)
    // console.log(`[AuthDebug] User: ${decoded.username}, Sisa Waktu: ${timeRemaining} detik`);

    if (timeRemaining < REFRESH_THRESHOLD) {
      const newToken = jwt.sign(
        {
          id: user.id,
          username: decoded.username,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "3h" }
      );

      // Kirim token baru di header
      res.setHeader("x-new-token", newToken);
      res.setHeader("Access-Control-Expose-Headers", "x-new-token");
    }

    next();
  } catch (err) {
    // LOG ERROR LENGKAP UNTUK DEBUGGING
    if (err.name === 'TokenExpiredError') {
      const decodedInfo = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      console.error(`[AuthError] Token Expired. Exp: ${decodedInfo?.exp}, Now: ${now}, Diff: ${decodedInfo?.exp - now}`);
      return res.status(401).json({ message: "Sesi telah berakhir. Silakan login kembali." });
    } else if (err.name === 'JsonWebTokenError') {
      console.error("[AuthError] Token Invalid/Rusak:", err.message);
      return res.status(401).json({ message: "Token tidak valid." });
    }

    console.error("Internal Auth Error:", err);
    return res.status(500).json({ message: "Terjadi kesalahan autentikasi." });
  }
}

module.exports = verifyAdmin;