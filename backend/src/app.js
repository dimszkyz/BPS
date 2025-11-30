const express = require('express');
const cors = require('cors'); // ✅ Deklarasi cukup satu kali di sini
const path = require('path');

const ujianRouter = require('./routes/ujian');
const pesertaRouter = require("./routes/peserta");
const hasilRoutes = require("./routes/hasil");
const inviteRouter = require("./routes/invite");
const authAdminRoutes = require('./routes/authAdmin');
const settingsRouter = require('./routes/settings');
const emailRouter = require("./routes/email");
const adminListRoute = require("./routes/adminList");

const app = express();

// Middleware umum
// ❌ HAPUS BARIS INI: const cors = require('cors'); 

// Konfigurasi CORS
app.use(cors({
    origin: 'http://localhost:5173', // Sesuaikan dengan port frontend Anda
    credentials: true, // Izinkan cookies/header otentikasi
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// static publik
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ NEW: static jawaban dokumen peserta
app.use('/uploads_jawaban', express.static(path.join(__dirname, 'uploads_jawaban')));

app.use(express.static(path.join(__dirname, '../public')));

// Route dasar (tes server)
app.get('/', (req, res) => {
  res.send('Server BPS_TES aktif ✅');
});

// Routes utama
app.use('/api/ujian', ujianRouter);
app.use("/api/peserta", pesertaRouter);
app.use("/api/hasil", hasilRoutes);
app.use("/api/invite", inviteRouter);
app.use('/api/admin', authAdminRoutes);
app.use('/api/settings', settingsRouter);
app.use("/api/email", emailRouter);
app.use("/api/admin-list", adminListRoute);

module.exports = app;