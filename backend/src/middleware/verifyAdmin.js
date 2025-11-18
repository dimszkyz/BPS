// File: src/middleware/verifyAdmin.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "kunci-rahasia-default";

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  // Token dikirim melalui header Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak ditemukan." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded; // simpan data admin di request
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(403).json({ message: "Token tidak valid atau sudah kedaluwarsa." });
  }
}

module.exports = verifyAdmin;
