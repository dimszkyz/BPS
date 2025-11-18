import { Routes, Route } from "react-router-dom";
import AdminLayout from "./admin/AdminLayout.jsx";
import LayoutPeserta from "./layout/LayoutPeserta.jsx";

// --- Rute Admin ---
import DashboardAdmin from "./admin/DashboardAdmin.jsx";
import TambahSoal from "./admin/TambahSoal.jsx";
import DaftarSoal from "./admin/DaftarSoal.jsx";
import EditSoal from "./admin/EditSoal.jsx";
import HasilUjian from "./admin/HasilUjian.jsx";
import HasilAkhir from "./admin/HasilAkhir.jsx";
import TambahPeserta from "./admin/TambahPeserta.jsx";
import Pengaturan from "./admin/Pengaturan.jsx";

// --- Rute Halaman Peserta ---
import PartSoal from "./page/PartSoal.jsx";
import PartPeserta from "./page/PartPeserta.jsx";
import LoginPeserta from "./page/LoginPeserta.jsx";
import KeteranganSelesai from "./component/KeteranganSelesai.jsx";

// --- Rute Login Admin ---
import LoginAdmin from "./page/LoginAdmin.jsx";

// --- Komponen Pelindung ---
import RequirePeserta from "./auth/RequirePeserta.jsx";
import RequireLoginPeserta from "./auth/RequireLoginPeserta.jsx";
import ProtectedAdminRoute from "./auth/ProtectedAdminRoute.jsx"; // 🔒 Tambahkan ini

function App() {
  return (
    <Routes>
      {/* ===================== */}
      {/* ROUTE LOGIN ADMIN */}
      {/* ===================== */}
      <Route path="/admin/login" element={<LoginAdmin />} />

      {/* ===================== */}
      {/* ROUTE ADMIN (DILINDUNGI JWT) */}
      {/* ===================== */}
      <Route
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/tambah-soal" element={<TambahSoal />} />
        <Route path="/admin/daftar-soal" element={<DaftarSoal />} />
        <Route path="/admin/edit-soal/:id" element={<EditSoal />} />
        <Route path="/admin/hasil-ujian" element={<HasilUjian />} />
        <Route path="/admin/hasil/:id" element={<HasilAkhir />} />
        <Route path="/admin/tambah-peserta" element={<TambahPeserta />} />
        <Route path="/admin/pengaturan" element={<Pengaturan />} />
      </Route>

      {/* ===================== */}
      {/* ROUTE PESERTA (UJIAN) */}
      {/* ===================== */}
      <Route element={<LayoutPeserta />}>
      <Route path="/" element={<LoginPeserta />} />
      <Route path="/selesai" element={<KeteranganSelesai />} />

      <Route element={<RequireLoginPeserta />}>
        <Route path="/peserta" element={<PartPeserta />} />
      </Route>

      <Route element={<RequirePeserta />}>
        <Route path="/ujian/:id" element={<PartSoal />} />
      </Route>
    </Route>
    </Routes>
  );
}

export default App;
