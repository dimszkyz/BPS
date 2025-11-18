const express = require('express');
const cors = require('cors');
const path = require('path');

const ujianRouter = require('./routes/ujian');
const pesertaRouter = require("./routes/peserta");
const hasilRoutes = require("./routes/hasil");
const inviteRouter = require("./routes/invite");
const authAdminRoutes = require('./routes/authAdmin');
const settingsRouter = require('./routes/settings');
const emailRouter = require("./routes/email");

const app = express();

// Middleware umum
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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


module.exports = app;
