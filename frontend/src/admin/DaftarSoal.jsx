import React, { useEffect, useState } from "react";
import {
  FaEdit,
  FaTrash,
  FaListUl,
  FaSyncAlt,
  FaCopy,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

// ===============================================
// ▼▼▼ KOMPONEN MODAL KONFIRMASI ▼▼▼
// ===============================================
const KonfirmasiModal = ({ show, message, onCancel, onConfirm }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <FaExclamationTriangle className="text-yellow-500 text-2xl" />
          <h3 className="text-lg font-semibold text-gray-800">Konfirmasi</h3>
        </div>

        <p className="text-gray-700 mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
// ===============================================
// ▲▲▲ AKHIR KOMPONEN MODAL ▲▲▲
// ===============================================

const DaftarSoal = () => {
  const [daftarUjian, setDaftarUjian] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // state untuk modal konfirmasi
  const [modalState, setModalState] = useState({
    show: false,
    message: "",
    onConfirm: () => {},
  });

  // toast sukses
  const [successMessage, setSuccessMessage] = useState("");

  // =============================
  // Helper tanggal
  // =============================
  const pad2 = (n) => String(n).padStart(2, "0");

  const toLocalDateOnly = (val) => {
    const d = new Date(val);
    if (!isNaN(d)) {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
        d.getDate()
      )}`;
    }
    const s = String(val || "");
    return s.includes("T") ? s.slice(0, 10) : s;
  };

  const formatTanggal = (tgl) => {
    if (!tgl) return "-";
    const [y, m, d] = toLocalDateOnly(tgl).split("-");
    if (!y || !m || !d) return tgl;
    return `${d}-${m}-${y}`;
  };

  // =============================
  // Ambil semua ujian
  // =============================
  const fetchUjian = async () => {
    try {
      setLoading(true);

      const token = sessionStorage.getItem("adminToken");
      if (!token) throw new Error("Token tidak ditemukan. Silakan login ulang.");

      const res = await fetch(`${API_URL}/api/ujian`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memuat daftar ujian.");

      const safeArray = Array.isArray(data) ? data : [];
      const sortedData = [...safeArray].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      setDaftarUjian(sortedData);
    } catch (err) {
      console.error("Gagal ambil data:", err);
      alert(err.message || "Gagal memuat daftar ujian");
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // ▼▼▼ FUNGSI MODAL & AKSI ▼▼▼
  // =============================================
  const handleCloseModal = () => {
    setModalState({ show: false, message: "", onConfirm: () => {} });
  };

  const handleConfirmModal = () => {
    modalState.onConfirm();
    handleCloseModal();
  };

  // --- LOGIKA HAPUS ---
  const prosesHapus = async (id) => {
    try {
      const token = sessionStorage.getItem("adminToken");
      if (!token) throw new Error("Token tidak ditemukan.");

      const res = await fetch(`${API_URL}/api/ujian/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal hapus ujian");

      setSuccessMessage("Ujian berhasil dihapus");
      setTimeout(() => setSuccessMessage(""), 3000);

      fetchUjian();
    } catch (err) {
      console.error("Error hapus:", err);
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  const handleDelete = (id) => {
    setModalState({
      show: true,
      message: "Yakin ingin menghapus ujian ini?",
      onConfirm: () => prosesHapus(id),
    });
  };

  // --- LOGIKA SALIN ---
  const prosesSalin = async (ujian) => {
    try {
      const token = sessionStorage.getItem("adminToken");
      if (!token) throw new Error("Token tidak ditemukan. Silakan login ulang.");

      const resDetail = await fetch(`${API_URL}/api/ujian/${ujian.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const detailData = await resDetail.json();
      if (!resDetail.ok) {
        throw new Error(detailData.message || "Gagal memuat detail ujian.");
      }

      const soalList =
        Array.isArray(detailData.soalList) && detailData.soalList.length > 0
          ? detailData.soalList.map((soal) => ({
              tipeSoal: soal.tipeSoal,
              soalText: soal.soalText,
              gambar: soal.gambar || null,
              pilihan:
                soal.tipeSoal === "pilihanGanda"
                  ? soal.pilihan.map((p) => p.text)
                  : [],
              kunciJawabanText:
                soal.tipeSoal === "pilihanGanda"
                  ? soal.pilihan.find((p) => p.isCorrect)?.text || ""
                  : soal.tipeSoal === "teksSingkat"
                  ? soal.pilihan.find((p) => p.isCorrect)?.text || ""
                  : "",
            }))
          : [
              {
                tipeSoal: "pilihanGanda",
                soalText: "Salinan pertanyaan baru",
                gambar: null,
                pilihan: ["Pilihan 1", "Pilihan 2"],
                kunciJawabanText: "Pilihan 1",
              },
            ];

      // tanggal mulai baru = hari ini (atau adapt timezone)
      let localDate = new Date().toISOString().split("T")[0];
      if (detailData.tanggal && !isNaN(new Date(detailData.tanggal))) {
        const original = new Date(detailData.tanggal);
        localDate = new Date(
          original.getTime() - original.getTimezoneOffset() * 60000
        )
          .toISOString()
          .split("T")[0];
      }

      const localDateBerakhir = detailData.tanggal_berakhir
        ? toLocalDateOnly(detailData.tanggal_berakhir)
        : localDate;

      const stripSalinan = (txt) =>
        txt.replace(/\s*\(Salinan\)\s*$/i, "").trim();
      const bumpOrOne = (txt) => {
        const m = txt.match(/\((\d+)\)\s*$/);
        if (m) {
          const n = parseInt(m[1], 10) + 1;
          return txt.replace(/\(\d+\)\s*$/, `(${n})`);
        }
        return `${txt} (1)`;
      };

      const newKeterangan = bumpOrOne(stripSalinan(detailData.keterangan || ""));

      const jamMulaiBaru = detailData.jam_mulai || "08:00";
      const jamBerakhirBaru = detailData.jam_berakhir || "09:00";
      const durasiBaru = detailData.durasi || 60;
      const acakSoalBaru = detailData.acak_soal || false;

      // NEW: bawa juga setting acak opsi jika ada
      const acakOpsiBaru =
        detailData.acak_opsi ??
        detailData.acakOpsi ??
        detailData.acak_opsi === 1 ??
        false;

      const payload = {
        keterangan: newKeterangan,
        tanggal: localDate,
        tanggalBerakhir: localDateBerakhir,
        jamMulai: jamMulaiBaru,
        jamBerakhir: jamBerakhirBaru,
        durasi: durasiBaru,
        acakSoal: acakSoalBaru,
        acakOpsi: acakOpsiBaru, // <-- PENTING
        soalList,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));

      const resCopy = await fetch(`${API_URL}/api/ujian`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const copyResult = await resCopy.json();
      if (!resCopy.ok) {
        throw new Error(copyResult.message || "Gagal menyimpan salinan ujian");
      }

      setSuccessMessage("Ujian berhasil disalin!");
      setTimeout(() => setSuccessMessage(""), 3000);

      fetchUjian();
    } catch (err) {
      console.error("Error salin:", err);
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  const handleSalin = (ujian) => {
    setModalState({
      show: true,
      message: "Yakin ingin menyalin ujian ini?",
      onConfirm: () => prosesSalin(ujian),
    });
  };

  // =============================================
  // ▲▲▲ AKHIR FUNGSI MODAL ▲▲▲
  // =============================================

  useEffect(() => {
    fetchUjian();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* TOAST */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg">
            <FaCheckCircle className="text-white w-5 h-5" />
            <span className="font-semibold text-base">{successMessage}</span>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI */}
      <KonfirmasiModal
        show={modalState.show}
        message={modalState.message}
        onCancel={handleCloseModal}
        onConfirm={handleConfirmModal}
      />

      {/* NAVBAR STICKY */}
      <div className="bg-white shadow-md border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FaListUl className="text-blue-600 text-lg" />
          Daftar Ujian
        </h2>

        <button
          onClick={fetchUjian}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <FaSyncAlt /> Refresh
        </button>
      </div>

      {/* TABLE */}
      <div className="p-6 md:p-10">
        {loading ? (
          <p className="text-gray-600 text-center">Memuat data...</p>
        ) : daftarUjian.length === 0 ? (
          <p className="text-gray-600 text-center">Belum ada ujian tersimpan.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
            <table className="min-w-full text-sm text-left border-collapse border border-gray-200 table-fixed">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="py-3 px-5 w-[60px] border border-gray-200">
                    No
                  </th>
                  <th className="py-3 px-5 w-[40%] border border-gray-200">
                    Keterangan
                  </th>
                  <th className="py-3 px-5 w-[15%] border border-gray-200">
                    Tanggal Mulai
                  </th>
                  <th className="py-3 px-5 w-[15%] border border-gray-200">
                    Tanggal Akhir
                  </th>
                  <th className="py-3 px-5 w-[20%] border border-gray-200">
                    Jendela Waktu
                  </th>
                  <th className="py-3 px-5 w-[10%] border border-gray-200">
                    Durasi
                  </th>
                  <th className="py-3 px-5 w-[10%] text-center border border-gray-200">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {daftarUjian.map((u, index) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50 align-top border border-gray-200"
                  >
                    <td className="py-3 px-5 text-gray-700 border border-gray-200">
                      {index + 1}
                    </td>

                    <td className="py-3 px-5 font-medium text-gray-800 whitespace-normal break-words border border-gray-200">
                      {u.keterangan}
                    </td>

                    <td className="py-3 px-5 whitespace-nowrap border border-gray-200">
                      {formatTanggal(u.tanggal)}
                    </td>

                    <td className="py-3 px-5 whitespace-nowrap border border-gray-200">
                      {formatTanggal(u.tanggal_berakhir)}
                    </td>

                    <td className="py-3 px-5 whitespace-nowrap border border-gray-200">
                      {(u.jam_mulai || "--:--") +
                        " – " +
                        (u.jam_berakhir || "--:--")}
                    </td>

                    <td className="py-3 px-5 whitespace-nowrap border border-gray-200">
                      {u.durasi ? `${u.durasi} menit` : "-"}
                    </td>

                    <td className="py-3 px-5 text-center border border-gray-200">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => navigate(`/admin/edit-soal/${u.id}`)}
                          className="text-blue-600 hover:text-blue-800 transition"
                          title="Edit Ujian"
                        >
                          <FaEdit />
                        </button>

                        <button
                          onClick={() => handleSalin(u)}
                          className="text-green-600 hover:text-green-800 transition"
                          title="Salin Ujian"
                        >
                          <FaCopy />
                        </button>

                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Hapus Ujian"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DaftarSoal;
