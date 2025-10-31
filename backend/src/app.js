const express = require('express');
const cors = require('cors');
const ujianRouter = require('./routes/ujian');
const pesertaRouter = require("./routes/peserta");
const hasilRoutes = require("./routes/hasil");
const inviteRouter = require("./routes/invite");

const app = express();

// Middleware umum
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Route dasar (tes server)
app.get('/', (req, res) => {
  res.send('Server BPS_TES aktif ✅');
});

// Routes utama
app.use('/api/ujian', ujianRouter);
app.use("/api/peserta", pesertaRouter);
app.use("/api/hasil", hasilRoutes);
app.use("/api/invite", inviteRouter);



module.exports = app;
