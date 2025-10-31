import { Routes, Route } from "react-router-dom";
import AdminLayout from "./admin/AdminLayout.jsx";

import DashboardAdmin from "./admin/DashboardAdmin.jsx";
import TambahSoal from "./admin/TambahSoal.jsx";
import DaftarSoal from "./admin/DaftarSoal.jsx";
import EditSoal from "./admin/EditSoal.jsx";
import HasilUjian from "./admin/HasilUjian.jsx";
import HasilAkhir from "./admin/HasilAkhir.jsx";
import TambahPeserta from "./admin/TambahPeserta.jsx";

import PartSoal from "./page/PartSoal.jsx";
import PartPeserta from "./page/PartPeserta.jsx";
import LoginPeserta from "./page/LoginPeserta.jsx";

function App() {
  return (
    <Routes>
      {/* ===================== */}
      {/* ROUTE ADMIN (dengan sidebar) */}
      {/* ===================== */}
      <Route element={<AdminLayout />}>
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/tambah-soal" element={<TambahSoal />} />
        <Route path="/admin/daftar-soal" element={<DaftarSoal />} />
        <Route path="/admin/edit-soal/:id" element={<EditSoal />} />
        <Route path="/admin/hasil-ujian" element={<HasilUjian />} />
        <Route path="/admin/hasil/:id" element={<HasilAkhir />} />
        <Route path="/admin/tambah-peserta" element={<TambahPeserta />} />
      </Route>

      {/* ===================== */}
      {/* ROUTE UJIAN (tanpa sidebar) */}
      {/* ===================== */}
      <Route path="/ujian/:id" element={<PartSoal />} />
      <Route path="/peserta" element={<PartPeserta />} />
      <Route path="/login" element={<LoginPeserta />} />
    </Routes>
  );
}

export default App;
