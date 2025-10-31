import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaListUl, FaSyncAlt, FaCopy } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

const DaftarSoal = () => {
  const [daftarUjian, setDaftarUjian] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // =============================
  // Helper tanggal & waktu
  // =============================
  const pad2 = (n) => String(n).padStart(2, "0");

  const toLocalDateOnly = (val) => {
    const d = new Date(val);
    if (!isNaN(d)) {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

  const waktuKeMenit = (hhmm) => {
    if (!hhmm) return null;
    const [hh, mm] = hhmm.split(":").map((x) => parseInt(x, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };

  const durasiMenit = (jm, jb) => {
    const a = waktuKeMenit(jm);
    const b = waktuKeMenit(jb);
    if (a == null || b == null) return "-";
    // handle lintas tengah malam
    let diff = b - a;
    if (diff <= 0) diff += 24 * 60;
    return diff;
  };

  // =============================
  // Ambil semua ujian
  // =============================
  const fetchUjian = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/ujian`);
      const data = await res.json();

      const sortedData = [...data].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      setDaftarUjian(sortedData);
    } catch (err) {
      console.error("Gagal ambil data:", err);
      alert("Gagal memuat daftar ujian");
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // Hapus ujian
  // =============================
  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus ujian ini?")) return;
    try {
      const res = await fetch(`${API_URL}/api/ujian/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal hapus ujian");
      alert("Ujian berhasil dihapus");
      fetchUjian();
    } catch (err) {
      console.error("Error hapus:", err);
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  // =============================
  // ✳️ Salin ujian (duplikasi)
  // =============================
  const handleSalin = async (ujian) => {
    if (!window.confirm("Yakin ingin menyalin ujian ini?")) return;

    try {
      // 1) Ambil detail ujian sumber
      const resDetail = await fetch(`${API_URL}/api/ujian/${ujian.id}`);
      const detailData = await resDetail.json();
      if (!resDetail.ok) {
        throw new Error(detailData.message || "Gagal memuat detail ujian.");
      }

      // 2) Bentuk soalList baru (ikutkan path gambar lama)
      const soalList =
        Array.isArray(detailData.soalList) && detailData.soalList.length > 0
          ? detailData.soalList.map((soal) => ({
              tipeSoal: soal.tipeSoal,
              soalText: soal.soalText,
              gambar: soal.gambar || null, // ⬅️ penting: pakai path lama jika ada
              pilihan:
                soal.tipeSoal === "pilihanGanda"
                  ? soal.pilihan.map((p) => ({ text: p.text }))
                  : [],
              kunciJawabanText:
                soal.tipeSoal === "pilihanGanda"
                  ? (soal.pilihan.find((p) => p.isCorrect)?.text || "")
                  : "",
            }))
          : [
              {
                tipeSoal: "pilihanGanda",
                soalText: "Salinan pertanyaan baru",
                gambar: null,
                pilihan: [{ text: "Pilihan 1" }, { text: "Pilihan 2" }],
                kunciJawabanText: "Pilihan 1",
              },
            ];

      // 3) Tanggal baru (pakai tanggal asli jika valid, else hari ini)
      let localDate = new Date().toISOString().split("T")[0];
      if (detailData.tanggal && !isNaN(new Date(detailData.tanggal))) {
        const original = new Date(detailData.tanggal);
        localDate = new Date(
          original.getTime() - original.getTimezoneOffset() * 60000
        )
          .toISOString()
          .split("T")[0];
      }

      // 4) Keterangan → naikkan (n) atau tambah (1)
      const stripSalinan = (txt) => txt.replace(/\s*\(Salinan\)\s*$/i, "").trim();
      const bumpOrOne = (txt) => {
        const m = txt.match(/\((\d+)\)\s*$/);
        if (m) {
          const n = parseInt(m[1], 10) + 1;
          return txt.replace(/\(\d+\)\s*$/, `(${n})`);
        }
        return `${txt} (1)`;
      };
      const newKeterangan = bumpOrOne(stripSalinan(detailData.keterangan || ""));

      // 5) Jam mulai & berakhir (WAJIB buat API baru)
      const jamMulaiBaru = detailData.jam_mulai || "08:00";
      const jamBerakhirBaru = detailData.jam_berakhir || "09:00";

      // 6) Payload untuk POST /api/ujian (pakai field baru)
      const payload = {
        data: JSON.stringify({
          keterangan: newKeterangan,
          tanggal: localDate,
          jamMulai: jamMulaiBaru,
          jamBerakhir: jamBerakhirBaru,
          soalList,
        }),
      };

      console.log("📦 Payload dikirim:", payload);

      const resCopy = await fetch(`${API_URL}/api/ujian`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const copyResult = await resCopy.json();
      console.log("📥 Respons server:", copyResult);

      if (!resCopy.ok) {
        throw new Error(copyResult.message || "Gagal menyimpan salinan ujian");
      }

      alert("✅ Ujian berhasil disalin!");
      fetchUjian();
    } catch (err) {
      console.error("Error salin:", err);
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  useEffect(() => {
    fetchUjian();
  }, []);

  // =============================
  // RENDER
  // =============================
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* NAVBAR STICKY */}
      <div className="bg-white shadow-md border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FaListUl className="text-blue-600 text-lg" />
          Daftar Soal
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
                  <th className="py-3 px-5 w-[60px] border border-gray-200">No</th>
                  <th className="py-3 px-5 w-[40%] border border-gray-200">Keterangan</th>
                  <th className="py-3 px-5 w-[15%] border border-gray-200">Tanggal</th>
                  <th className="py-3 px-5 w-[20%] border border-gray-200">Waktu</th>
                  <th className="py-3 px-5 w-[10%] border border-gray-200">Durasi</th>
                  <th className="py-3 px-5 w-[10%] text-center border border-gray-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarUjian.map((u, index) => (
                  <tr key={u.id} className="hover:bg-gray-50 align-top border border-gray-200">
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
                      {(u.jam_mulai || "--:--") + " – " + (u.jam_berakhir || "--:--")}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap border border-gray-200">
                      {typeof durasiMenit(u.jam_mulai, u.jam_berakhir) === "number"
                        ? `${durasiMenit(u.jam_mulai, u.jam_berakhir)} menit`
                        : "-"}
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
