// File: src/routes/authAdmin.js
// (FINAL: Updated with Email Notification Logic)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer"); // <--- TAMBAHAN BARU
const verifyAdmin = require("../middleware/verifyAdmin");

const JWT_SECRET = process.env.JWT_SECRET || "kunci-rahasia-default";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// helper validasi format nomor WA sederhana
const isValidWhatsApp = (wa) => {
  if (!wa) return false;
  const cleaned = String(wa).trim().replace(/\s|-/g, "");
  return /^\+?\d{9,15}$/.test(cleaned); // contoh: 08xx / +628xx
};

// ===================================
// POST /api/admin/login
// ===================================
router.post("/login", async (req, res) => {
  try {
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

    // --- CEK STATUS AKTIF ---
    if (admin.is_active === 0 || admin.is_active === false) {
      return res.status(403).json({ 
        message: "Akun ini telah dinonaktifkan oleh Superadmin. Hubungi admin utama." 
      });
    }

    // 4) Cek password
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Periksa kembali username / email dan password anda" });
    }

    // 5) Buat JWT
    const jwtToken = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: "3h" }
    );

    return res.status(200).json({
      message: "Login berhasil",
      token: jwtToken,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Error login admin:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
});

// ===================================
// GET /api/admin/invite-history
// ===================================
router.get("/invite-history", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        a.id,
        a.username,
        a.email,
        a.role,
        a.created_at,
        a.is_active,
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

router.put("/update-username/:id", verifyAdmin, async (req, res) => {
  try {
    const requesterRole = (req.admin.role || "").toLowerCase();
    if (requesterRole !== "superadmin") {
      return res.status(403).json({ message: "Hanya Superadmin yang dapat mengubah username." });
    }

    const targetId = parseInt(req.params.id, 10);
    const { username } = req.body;

    if (!targetId) return res.status(400).json({ message: "ID tidak valid." });
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ message: "Username minimal 3 karakter." });
    }

    // Cek Unik
    const [existing] = await pool.execute(
      "SELECT id FROM admins WHERE username = ? AND id != ? LIMIT 1",
      [username, targetId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Username sudah digunakan oleh admin lain." });
    }

    const [result] = await pool.execute(
      "UPDATE admins SET username = ? WHERE id = ?",
      [username, targetId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin tidak ditemukan." });
    }

    return res.json({ message: "Username berhasil diperbarui.", username });

  } catch (err) {
    console.error("Error update username:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
});

// ===================================
// POST /api/admin/change-password
// ===================================
router.post("/change-password", verifyAdmin, async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Password lama dan password baru wajib diisi.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password baru minimal 6 karakter.",
      });
    }

    const [rows] = await pool.execute(
      "SELECT id, password_hash FROM admins WHERE id = ? LIMIT 1",
      [adminId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin tidak ditemukan." });
    }

    const admin = rows[0];
    const isOldOk = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isOldOk) {
      return res.status(401).json({ message: "Password lama salah." });
    }

    const isSameAsOld = await bcrypt.compare(newPassword, admin.password_hash);
    if (isSameAsOld) {
      return res.status(400).json({
        message: "Password baru tidak boleh sama dengan password lama.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.execute(
      "UPDATE admins SET password_hash = ? WHERE id = ?",
      [newHash, adminId]
    );

    return res.status(200).json({
      message: "Password berhasil diubah. Silakan login ulang jika diperlukan.",
    });
  } catch (err) {
    console.error("Error change password:", err);
    return res.status(500).json({
      message: "Terjadi kesalahan server saat mengubah password.",
    });
  }
});

// ===================================
// PUT /api/admin/update-role/:id
// ===================================
router.put("/update-role/:id", verifyAdmin, async (req, res) => {
  try {
    const requesterRole = (req.admin.role || "").toLowerCase();
    const requesterId = req.admin.id;
    
    if (requesterRole !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Hanya Superadmin yang dapat mengubah role admin." });
    }

    const targetId = parseInt(req.params.id, 10);
    const { role } = req.body;

    const validRoles = ["admin", "superadmin"];
    const newRole = (role || "").toLowerCase();
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: "Role tidak valid." });
    }

    if (targetId === requesterId) {
      return res
        .status(400)
        .json({ message: "Tidak bisa mengubah role akun sendiri." });
    }

    // --- LOGIC BARU: CEK HIERARKI ---
    // Ambil data requester untuk melihat siapa creator-nya
    const [reqRows] = await pool.execute("SELECT created_by_admin_id FROM admins WHERE id = ?", [requesterId]);
    const creatorId = reqRows[0]?.created_by_admin_id;

    // Jika target adalah ID 1 (Master Superadmin), tolak mutlak
    if (targetId === 1) {
       return res.status(403).json({ message: "Role Akun Utama (Root) tidak dapat diubah." });
    }

    // Jika target adalah pembuat akun saya, tolak
    if (creatorId && creatorId === targetId) {
        return res.status(403).json({ message: "Anda tidak memiliki wewenang mengubah role atasan yang membuat akun Anda." });
    }
    // --------------------------------

    const [result] = await pool.execute(
      "UPDATE admins SET role = ? WHERE id = ?",
      [newRole, targetId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin tidak ditemukan." });
    }

    return res.json({
      message: "Role admin berhasil diperbarui.",
      role: newRole,
    });
  } catch (err) {
    console.error("Error update role admin:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
});

// ===================================
// PUT /api/admin/toggle-status/:id
// ===================================
router.put("/toggle-status/:id", verifyAdmin, async (req, res) => {
  try {
    const requesterRole = (req.admin.role || "").toLowerCase();
    const requesterId = req.admin.id;

    if (requesterRole !== "superadmin") {
      return res.status(403).json({ message: "Hanya Superadmin yang dapat mengubah status akun." });
    }

    const targetId = parseInt(req.params.id, 10);
    if (!targetId) return res.status(400).json({ message: "ID admin tidak valid." });

    if (targetId === requesterId) {
      return res.status(400).json({ message: "Tidak bisa menonaktifkan akun sendiri." });
    }

    // --- LOGIC BARU: CEK HIERARKI ---
    // 1. Cek apakah target adalah Superadmin Utama (ID 1)
    if (targetId === 1) {
        return res.status(403).json({ message: "Akun Superadmin Utama tidak dapat dinonaktifkan." });
    }

    // 2. Ambil data requester untuk melihat siapa creator-nya
    const [reqRows] = await pool.execute("SELECT created_by_admin_id FROM admins WHERE id = ?", [requesterId]);
    const creatorId = reqRows[0]?.created_by_admin_id;

    // 3. Jika target adalah creator dari requester, tolak akses
    if (creatorId && creatorId === targetId) {
        return res.status(403).json({ 
            message: "Akses Ditolak: Anda tidak dapat menonaktifkan admin yang membuat/mempromosikan akun Anda." 
        });
    }
    // --------------------------------

    // Cek status sekarang
    const [rows] = await pool.execute(
      "SELECT id, username, is_active FROM admins WHERE id = ? LIMIT 1",
      [targetId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin tidak ditemukan." });
    }

    const currentStatus = rows[0].is_active;
    const isActiveBool = (currentStatus === 1 || currentStatus === true);
    const newStatus = isActiveBool ? 0 : 1;
    
    const statusText = newStatus === 1 ? "diaktifkan kembali" : "dinonaktifkan";

    await pool.execute("UPDATE admins SET is_active = ? WHERE id = ?", [newStatus, targetId]);

    return res.json({ 
      message: `Admin ${rows[0].username} berhasil ${statusText}.`,
      newStatus: newStatus
    });

  } catch (err) {
    console.error("Error toggle status admin:", err);
    return res.status(500).json({ message: "Gagal mengubah status admin." });
  }
});

// ===================================
// DELETE /api/admin/delete/:id
// ===================================
router.delete("/delete/:id", verifyAdmin, async (req, res) => {
  try {
    const requesterRole = (req.admin.role || "").toLowerCase();
    const requesterId = req.admin.id;

    if (requesterRole !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Hanya Superadmin yang dapat menghapus admin." });
    }

    const targetId = parseInt(req.params.id, 10);
    if (!targetId) {
      return res.status(400).json({ message: "ID admin tidak valid." });
    }

    if (targetId === requesterId) {
      return res
        .status(400)
        .json({ message: "Tidak bisa menghapus akun sendiri." });
    }

    // --- LOGIC BARU: CEK HIERARKI ---
    if (targetId === 1) {
        return res.status(403).json({ message: "Akun Superadmin Utama tidak dapat dihapus." });
    }

    const [reqRows] = await pool.execute("SELECT created_by_admin_id FROM admins WHERE id = ?", [requesterId]);
    const creatorId = reqRows[0]?.created_by_admin_id;

    if (creatorId && creatorId === targetId) {
        return res.status(403).json({ 
            message: "Akses Ditolak: Anda tidak dapat menghapus admin yang membuat akun Anda." 
        });
    }
    // --------------------------------

    const [rows] = await pool.execute(
      "SELECT id, username, role FROM admins WHERE id = ? LIMIT 1",
      [targetId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin tidak ditemukan." });
    }

    await pool.execute("DELETE FROM admins WHERE id = ?", [targetId]);

    return res.json({ message: "Admin berhasil dihapus secara permanen." });
  } catch (err) {
    console.error("Error delete admin:", err);
    return res.status(500).json({ message: "Gagal menghapus admin." });
  }
});

// ===================================
// POST /api/admin/forgot-password
// ===================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier, whatsapp, reason } = req.body;

    if (!identifier) {
      return res
        .status(400)
        .json({ message: "Username atau email wajib diisi." });
    }

    if (!whatsapp || !isValidWhatsApp(whatsapp)) {
      return res.status(400).json({
        message:
          "Nomor WhatsApp wajib diisi dan harus valid. Contoh: 08xxx / +628xxx",
      });
    }

    // cari admin berdasarkan username / email
    const [rows] = await pool.execute(
      "SELECT id, username, email FROM admins WHERE username = ? OR email = ? LIMIT 1",
      [identifier, identifier]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Akun admin tidak ditemukan." });
    }

    const admin = rows[0];

    // cegah spam: kalau masih ada pending, jangan buat baru
    const [pending] = await pool.execute(
      "SELECT id FROM admin_password_resets WHERE admin_id = ? AND status = 'pending' LIMIT 1",
      [admin.id]
    );
    if (pending.length > 0) {
      return res.status(409).json({
        message:
          "Permintaan reset sebelumnya masih pending. Tunggu Superadmin memproses.",
      });
    }

    await pool.execute(
      `INSERT INTO admin_password_resets (admin_id, identifier, whatsapp, reason)
       VALUES (?, ?, ?, ?)`,
      [admin.id, identifier, whatsapp, reason || null]
    );

    return res.status(200).json({
      message:
        "Permintaan reset password berhasil dikirim. Superadmin akan memprosesnya.",
    });
  } catch (err) {
    console.error("Error forgot-password:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
});

// ===================================
// GET /api/admin/forgot-password/requests
// ===================================
router.get("/forgot-password/requests", verifyAdmin, async (req, res) => {
  try {
    const role = (req.admin.role || "").toLowerCase();
    if (role !== "superadmin") {
      return res.status(403).json({
        message: "Hanya Superadmin yang dapat melihat permintaan reset.",
      });
    }

    const [rows] = await pool.execute(`
      SELECT
        r.id,
        r.admin_id,
        a.username,
        a.email,
        r.identifier,
        r.whatsapp,
        r.reason,
        r.status,
        r.requested_at,
        r.resolved_at,
        r.resolved_by_admin_id
      FROM admin_password_resets r
      JOIN admins a ON a.id = r.admin_id
      ORDER BY r.requested_at DESC
    `);

    return res.json(rows);
  } catch (err) {
    console.error("Error get reset requests:", err);
    return res.status(500).json({ message: "Gagal mengambil data reset." });
  }
});

// ===================================
// PUT /api/admin/forgot-password/requests/:id/reset
// (UPDATED: Send Email Notification)
// ===================================
router.put(
  "/forgot-password/requests/:id/reset",
  verifyAdmin,
  async (req, res) => {
    try {
      const role = (req.admin.role || "").toLowerCase();
      if (role !== "superadmin") {
        return res.status(403).json({
          message: "Hanya Superadmin yang dapat reset password admin.",
        });
      }

      const requestId = parseInt(req.params.id, 10);
      const { newPassword } = req.body;
      const superAdminId = req.admin.id; // ID Superadmin yang sedang login

      if (!requestId) {
        return res.status(400).json({ message: "ID permintaan tidak valid." });
      }
      if (!newPassword || newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "Password baru minimal 6 karakter." });
      }

      // 1. Ambil Data Permintaan & Email Target
      // Kita perlu join ke tabel admins untuk dapat email si pemohon (target)
      const [reqRows] = await pool.execute(
        `SELECT r.*, a.email as target_email, a.username as target_username 
         FROM admin_password_resets r
         JOIN admins a ON a.id = r.admin_id
         WHERE r.id = ? AND r.status = 'pending' 
         LIMIT 1`,
        [requestId]
      );

      if (reqRows.length === 0) {
        return res.status(404).json({
          message: "Permintaan tidak ditemukan / sudah diproses.",
        });
      }

      const resetReq = reqRows[0];
      const targetEmail = resetReq.target_email;
      const targetUsername = resetReq.target_username;

      // 2. Ambil Konfigurasi SMTP Superadmin (Pengirim)
      const [smtpRows] = await pool.execute(
        "SELECT * FROM smtp_settings WHERE admin_id = ? LIMIT 1",
        [superAdminId]
      );

      if (smtpRows.length === 0) {
        return res.status(400).json({
          message:
            "Gagal: Anda belum mengatur konfigurasi Email Pengirim. Silakan atur di menu 'Pengaturan Email' terlebih dahulu.",
        });
      }

      const smtpConfig = smtpRows[0];

      // 3. Konfigurasi Transporter Nodemailer
      const transporter = nodemailer.createTransport({
        service: smtpConfig.service || "gmail",
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure === 1, // Convert 1/0 to boolean
        auth: {
          user: smtpConfig.auth_user,
          pass: smtpConfig.auth_pass,
        },
      });

      // 4. Kirim Email
      const emailContent = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Reset Password Berhasil</h2>
          <p>Halo <b>${targetUsername}</b>,</p>
          <p>Permintaan reset password Anda telah disetujui oleh Superadmin.</p>
          <hr />
          <p>Berikut adalah detail akun Anda yang baru:</p>
          <ul>
            <li><b>Username:</b> ${targetUsername}</li>
            <li><b>Password Baru:</b> ${newPassword}</li>
          </ul>
          <p>Silakan segera login dan ganti password ini demi keamanan.</p>
          <br />
          <p>Salam,<br/>${smtpConfig.from_name || "Admin System"}</p>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: `"${smtpConfig.from_name || "Admin"}" <${smtpConfig.auth_user}>`,
          to: targetEmail,
          subject: "Informasi Reset Password Admin",
          html: emailContent,
        });
      } catch (emailErr) {
        console.error("Gagal kirim email reset:", emailErr);
        return res.status(500).json({
          message:
            "Gagal mengirim email ke pemohon. Pastikan Password Aplikasi/SMTP Anda benar. Password belum diubah.",
        });
      }

      // 5. Jika Email Berhasil, Update Database
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      // Update password di tabel admins
      await pool.execute("UPDATE admins SET password_hash = ? WHERE id = ?", [
        newHash,
        resetReq.admin_id,
      ]);

      // Update status permintaan jadi resolved
      await pool.execute(
        `UPDATE admin_password_resets
         SET status = 'resolved',
             resolved_at = NOW(),
             resolved_by_admin_id = ?
         WHERE id = ?`,
        [superAdminId, requestId]
      );

      return res.json({
        message:
          `Password berhasil direset dan email notifikasi telah dikirim ke ${targetEmail}.`,
      });
    } catch (err) {
      console.error("Error reset by superadmin:", err);
      return res.status(500).json({ message: "Gagal reset password admin." });
    }
  }
);

// ===================================
// POST /api/admin/register
// ===================================
router.post("/register", verifyAdmin, async (req, res) => {
  try {
    const creatorAdminId = req.admin.id;
    const creatorAdminRole = req.admin.role;

    if (creatorAdminRole !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Hanya Superadmin yang dapat menambah admin baru." });
    }

    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email, dan password wajib diisi." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter." });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: "Format email tidak valid." });
    }

    const validRoles = ["admin", "superadmin"];
    const userRole = validRoles.includes(role) ? role : "admin";

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const sql = `
      INSERT INTO admins (username, email, password_hash, role, created_by_admin_id, is_active) 
      VALUES (?, ?, ?, ?, ?, 1)
    `;

    await pool.execute(sql, [
      username,
      email,
      password_hash,
      userRole,
      creatorAdminId,
    ]);

    return res.status(201).json({ message: "Admin baru berhasil ditambahkan." });
  } catch (err) {
    console.error("Error register admin:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Username atau email sudah terdaftar." });
    }

    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
});

router.get("/ping", verifyAdmin, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;