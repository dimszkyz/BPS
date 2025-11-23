import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaCalendarAlt,
  FaClock,
  FaPlus,
  FaSave,
  FaTrash,
  FaCogs,
  FaListAlt,
  FaImage,
  FaCheckCircle,
  FaFileExcel, // NEW
} from "react-icons/fa";
import * as XLSX from "xlsx"; // NEW

const API_URL = "http://localhost:5000";

// ---------- Excel Helpers (NEW) ----------
const downloadWorkbook = (wb, filename = "export_ujian_dan_soal.xlsx") => {
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

const EditSoal = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const location = useLocation();
  // Cek apakah ada sinyal 'fromSuperAdmin' yang dikirim dari TabUjianAdmin
  const isFromSuperAdmin = location.state?.fromSuperAdmin === true;

  const [loading, setLoading] = useState(true);
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [tanggalBerakhir, setTanggalBerakhir] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamBerakhir, setJamBerakhir] = useState("");
  const [durasi, setDurasi] = useState("");

  const [acakSoal, setAcakSoal] = useState(false);
  const [acakOpsi, setAcakOpsi] = useState(false); // NEW

  const [daftarSoal, setDaftarSoal] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  // =======================================================
  // ▼▼▼ FETCH DATA UJIAN (DIPERBARUI) ▼▼▼
  // =======================================================
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = sessionStorage.getItem("adminToken");
        if (!token) throw new Error("Token tidak ditemukan.");

        const res = await fetch(`${API_URL}/api/ujian/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal memuat data ujian");

        setKeterangan(data.keterangan || "");

        // Set Tanggal Mulai
        const localDate = data.tanggal
          ? new Date(data.tanggal).toLocaleDateString("en-CA", {
              timeZone: "Asia/Jakarta",
            })
          : "";
        setTanggal(localDate);

        // Set Tanggal Berakhir
        const localDateBerakhir = data.tanggal_berakhir
          ? new Date(data.tanggal_berakhir).toLocaleDateString("en-CA", {
              timeZone: "Asia/Jakarta",
            })
          : "";
        setTanggalBerakhir(localDateBerakhir);

        setJamMulai(data.jam_mulai || "");
        setJamBerakhir(data.jam_berakhir || "");
        setDurasi(data.durasi || "");

        setAcakSoal(data.acak_soal || false);
        setAcakOpsi(data.acak_opsi || false); // NEW

        // [PERBAIKAN] Simpan ID asli dari database
        setDaftarSoal(
          (data.soalList || []).map((s) => ({
            id: s.id,
            tipeSoal: s.tipeSoal,
            soalText: s.soalText,
            gambar: s.gambar || null,
            gambarPreview: s.gambar ? `${API_URL}/api/ujian${s.gambar}` : null,
            pilihan:
              s.tipeSoal === "pilihanGanda"
                ? (s.pilihan || []).map((p) => ({
                    id: p.id,
                    text: p.text,
                  }))
                : [],
            kunciJawaban:
              s.tipeSoal === "pilihanGanda"
                ? (s.pilihan || []).find((p) => p.isCorrect)?.id || 0
                : 0,
            kunciJawabanText:
              s.tipeSoal === "teksSingkat"
                ? (s.pilihan || []).find((p) => p.isCorrect)?.text || ""
                : "",
          }))
        );
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);
  // =======================================================
  // ▲▲▲ AKHIR FETCH DATA ▲▲▲
  // =======================================================

  // ---------- EXPORT UJIAN + SOAL (NEW) ----------
  const handleExportUjianSoalExcel = () => {
  const settingHeaders = [
    "keterangan",
    "tanggalMulai",
    "tanggalBerakhir",
    "jamMulai",
    "jamBerakhir",
    "durasiMenit",
    "acakSoal",
    "acakOpsi",
  ];

  const settingRow = [
    {
      keterangan: keterangan || "",
      tanggalMulai: tanggal || "",
      tanggalBerakhir: tanggalBerakhir || "",
      jamMulai: jamMulai || "",
      jamBerakhir: jamBerakhir || "",
      durasiMenit: durasi || "",
      acakSoal: acakSoal ? "TRUE" : "FALSE",
      acakOpsi: acakOpsi ? "TRUE" : "FALSE",
    },
  ];

  const wsSetting = XLSX.utils.json_to_sheet(settingRow, {
    header: settingHeaders,
  });
  XLSX.utils.sheet_add_aoa(wsSetting, [settingHeaders], { origin: "A1" });

  const soalHeaders = [
    "tipeSoal",
    "soalText",
    "pilihan1",
    "pilihan2",
    "pilihan3",
    "pilihan4",
    "pilihan5",
    "kunciJawaban",
    "gambarUrl",
  ];

  const soalRows = daftarSoal.map((s) => {
    const pilihanTexts =
      s.tipeSoal === "pilihanGanda" ? s.pilihan.map((p) => p.text) : [];

    // ✅ ubah ID kunci → index pilihan (1..n)
    let kunciIndex = "";
    if (s.tipeSoal === "pilihanGanda") {
      const idx = (s.pilihan || []).findIndex((p) => p.id === s.kunciJawaban);
      kunciIndex = String(idx >= 0 ? idx + 1 : 1);
    }

    return {
      tipeSoal: s.tipeSoal,
      soalText: s.soalText,
      pilihan1: pilihanTexts[0] || "",
      pilihan2: pilihanTexts[1] || "",
      pilihan3: pilihanTexts[2] || "",
      pilihan4: pilihanTexts[3] || "",
      pilihan5: pilihanTexts[4] || "",
      kunciJawaban:
        s.tipeSoal === "pilihanGanda"
          ? kunciIndex
          : s.tipeSoal === "teksSingkat"
          ? s.kunciJawabanText || ""
          : "",
      gambarUrl: s.gambarPreview || "",
    };
  });

  const wsSoal = XLSX.utils.json_to_sheet(soalRows, { header: soalHeaders });
  XLSX.utils.sheet_add_aoa(wsSoal, [soalHeaders], { origin: "A1" });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSetting, "PENGATURAN_UJIAN");
  XLSX.utils.book_append_sheet(wb, wsSoal, "TEMPLATE_SOAL");

  downloadWorkbook(wb, `export_ujian_${id}.xlsx`);
};


  // === HANDLER GAMBAR ===
  const handleFileChange = (soalId, file) => {
    const updated = daftarSoal.map((s) => {
      if (s.id === soalId) {
        return {
          ...s,
          gambar: file,
          gambarPreview: file ? URL.createObjectURL(file) : s.gambarPreview,
        };
      }
      return s;
    });
    setDaftarSoal(updated);
  };

  const handleHapusGambar = (soalId) => {
    setDaftarSoal((prev) =>
      prev.map((s) =>
        s.id === soalId ? { ...s, gambar: null, gambarPreview: null } : s
      )
    );
  };

  // === HANDLER SOAL & PILIHAN ===
  const handleTambahSoal = () => {
    const newId = `new_soal_${Date.now()}`;
    const newPilId1 = `new_pil_${Date.now()}_1`;
    const newPilId2 = `new_pil_${Date.now()}_2`;

    setDaftarSoal([
      ...daftarSoal,
      {
        id: newId,
        tipeSoal: "pilihanGanda",
        soalText: "",
        gambar: null,
        gambarPreview: null,
        pilihan: [
          { id: newPilId1, text: "" },
          { id: newPilId2, text: "" },
        ],
        kunciJawaban: newPilId1,
        kunciJawabanText: "",
      },
    ]);
  };

  const handleHapusSoal = (id) => {
    if (daftarSoal.length <= 1) {
      alert("Minimal harus ada satu soal.");
      return;
    }
    setDaftarSoal(daftarSoal.filter((s) => s.id !== id));
  };

  const handleSoalChange = (id, field, value) => {
    const updated = daftarSoal.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    setDaftarSoal(updated);
  };

  const handleTambahPilihan = (soalId) => {
    setDaftarSoal((prev) =>
      prev.map((s) =>
        s.id === soalId
          ? {
              ...s,
              pilihan: [
                ...s.pilihan,
                { id: `new_pil_${Date.now()}`, text: "" },
              ],
            }
          : s
      )
    );
  };

  const handleHapusPilihan = (soalId, pilihanId) => {
    setDaftarSoal((prev) =>
      prev.map((s) => {
        if (s.id === soalId) {
          if (s.pilihan.length <= 2) {
            alert("Minimal harus ada 2 pilihan.");
            return s;
          }
          const newPilihan = s.pilihan.filter((p) => p.id !== pilihanId);
          return {
            ...s,
            pilihan: newPilihan,
            kunciJawaban:
              s.kunciJawaban === pilihanId
                ? newPilihan[0]?.id || 0
                : s.kunciJawaban,
          };
        }
        return s;
      })
    );
  };

  const handlePilihanChange = (soalId, pilihanId, text) => {
    setDaftarSoal((prev) =>
      prev.map((s) =>
        s.id === soalId
          ? {
              ...s,
              pilihan: s.pilihan.map((p) =>
                p.id === pilihanId ? { ...p, text } : p
              ),
            }
          : s
      )
    );
  };

  const handleKunciJawabanChange = (soalId, pilihanId) => {
    setDaftarSoal((prev) =>
      prev.map((s) =>
        s.id === soalId ? { ...s, kunciJawaban: pilihanId } : s
      )
    );
  };

  // =======================================================
  // ▼▼▼ SIMPAN PERUBAHAN (DIPERBARUI) ▼▼▼
  // =======================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi
    if (!jamMulai || !jamBerakhir) {
      alert("Jam mulai dan jam berakhir wajib diisi.");
      return;
    }
    if (!tanggalBerakhir) {
      alert("Tanggal berakhir wajib diisi.");
      return;
    }
    if (!durasi || parseInt(durasi, 10) <= 0) {
      alert("Durasi pengerjaan wajib diisi dan harus lebih dari 0.");
      return;
    }

    const soalList = daftarSoal.map((s) => ({
      id: s.id,
      tipeSoal: s.tipeSoal,
      soalText: s.soalText,
      gambar: s.gambarPreview?.includes("/uploads/")
        ? s.gambarPreview.replace(`${API_URL}/api/ujian`, "")
        : null,
      pilihan: s.tipeSoal === "pilihanGanda" ? s.pilihan : [],
      kunciJawabanText:
        s.tipeSoal === "pilihanGanda"
          ? s.pilihan.find((p) => p.id === s.kunciJawaban)?.text || ""
          : s.tipeSoal === "teksSingkat"
          ? s.kunciJawabanText || ""
          : "",
    }));

    const formData = new FormData();
    formData.append(
      "data",
      JSON.stringify({
        keterangan,
        tanggal,
        tanggalBerakhir,
        jamMulai,
        jamBerakhir,
        durasi,
        acakSoal,
        acakOpsi, // NEW
        soalList,
      })
    );

    daftarSoal.forEach((s, i) => {
      if (s.gambar && typeof s.gambar !== "string") {
        formData.append(`gambar_${i}`, s.gambar);
      }
    });

    try {
      const token = sessionStorage.getItem("adminToken");
      const res = await fetch(`${API_URL}/api/ujian/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menyimpan perubahan");

      setSuccessMessage("Ujian berhasil diperbarui!");

      setTimeout(() => {
        if (isFromSuperAdmin) {
          navigate(-1);
        } else {
          navigate("/admin/daftar-soal");
        }
      }, 3000);
    } catch (err) {
      alert("Terjadi kesalahan: " + err.message);
    }
  };
  // =======================================================
  // ▲▲▲ AKHIR SIMPAN PERUBAHAN ▲▲▲
  // =======================================================

  if (loading)
    return (
      <p className="p-10 text-center text-gray-600">
        Memuat data ujian untuk diedit...
      </p>
    );

  // === STYLE ===
  const labelClass =
    "block text-sm font-semibold text-gray-700 mb-1 tracking-wide";
  const inputClass =
    "block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm py-2.5 px-3";
  const textAreaClass =
    "block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm p-3 min-h-[100px]";
  const fieldsetClass =
    "bg-white rounded-xl border border-gray-100 shadow-sm p-6 transition duration-200";

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* TOAST SUKSES */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg">
            <FaCheckCircle className="text-white w-5 h-5" />
            <span className="font-semibold text-base">{successMessage}</span>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white shadow-md border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          🧩 Edit Ujian
        </h2>

        <div className="flex gap-3">
          {/* NEW: Export button */}
          <button
            type="button"
            onClick={handleExportUjianSoalExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition"
          >
            <FaFileExcel className="w-4 h-4" />
            Export Ujian
          </button>

          <button
            onClick={() => {
              if (isFromSuperAdmin) {
                navigate(-1);
              } else {
                navigate("/admin/daftar-soal");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-300 text-gray-800 font-semibold shadow hover:bg-gray-400 transition"
          >
            Batal
          </button>

          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
          >
            <FaSave className="w-4 h-4" />
            Simpan Perubahan
          </button>
        </div>
      </div>

      {/* FORM */}
      <div className="p-6 md:p-10 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
          {/* Pengaturan Ujian */}
          <fieldset className={fieldsetClass}>
            <div className="flex items-center gap-2 mb-5 border-b pb-2 border-gray-200">
              <FaCogs className="text-blue-600 text-xl" />
              <h3 className="text-lg font-bold text-gray-800">
                Pengaturan Ujian
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Keterangan Ujian</label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              {/* JENDELA AKSES (TANGGAL) */}
              <div className="relative">
                <label className={labelClass}>
                  Tanggal Mulai (Akses Dibuka)
                </label>
                <div className="absolute inset-y-0 left-3 flex items-center pt-6 z-10">
                  <FaCalendarAlt className="text-gray-400" />
                </div>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={`${inputClass} pl-10`}
                  required
                />
              </div>

              <div className="relative">
                <label className={labelClass}>
                  Tanggal Berakhir (Akses Ditutup)
                </label>
                <div className="absolute inset-y-0 left-3 flex items-center pt-6 z-10">
                  <FaCalendarAlt className="text-gray-400" />
                </div>
                <input
                  type="date"
                  value={tanggalBerakhir}
                  onChange={(e) => setTanggalBerakhir(e.target.value)}
                  className={`${inputClass} pl-10`}
                  required
                />
              </div>

              {/* JENDELA AKSES (JAM) */}
              <div className="relative">
                <label className={labelClass}>Jam Mulai (Akses Dibuka)</label>
                <div className="absolute inset-y-0 left-3 flex items-center pt-6 z-10">
                  <FaClock className="text-gray-400" />
                </div>
                <input
                  type="time"
                  value={jamMulai}
                  onChange={(e) => setJamMulai(e.target.value)}
                  className={`${inputClass} pl-10`}
                  required
                />
              </div>

              <div className="relative">
                <label className={labelClass}>
                  Jam Berakhir (Akses Ditutup)
                </label>
                <div className="absolute inset-y-0 left-3 flex items-center pt-6 z-10">
                  <FaClock className="text-gray-400" />
                </div>
                <input
                  type="time"
                  value={jamBerakhir}
                  onChange={(e) => setJamBerakhir(e.target.value)}
                  className={`${inputClass} pl-10`}
                  required
                />
              </div>

              {/* FIELD DURASI */}
              <div className="md:col-span-2">
                <label className={labelClass}>Durasi Pengerjaan (Menit)</label>
                <input
                  type="number"
                  min="1"
                  value={durasi}
                  onChange={(e) => setDurasi(e.target.value)}
                  className={inputClass}
                  placeholder="Contoh: 90"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ini adalah waktu hitung mundur yang akan didapat peserta setelah
                  menekan tombol "Mulai".
                </p>
              </div>
            </div>

            {/* Checkbox Acak */}
            <div className="mt-4 space-y-2">
              <div className="flex flex-col gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={acakSoal}
                    onChange={() => setAcakSoal(!acakSoal)}
                    className="h-4 w-4"
                  />
                  Acak urutan soal untuk setiap peserta
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={acakOpsi}
                    onChange={() => setAcakOpsi(!acakOpsi)}
                    className="h-4 w-4"
                  />
                  Acak jawaban pilihan ganda untuk setiap peserta
                </label>
              </div>
            </div>
          </fieldset>

          {/* Soal */}
          {daftarSoal.map((soal, index) => (
            <fieldset key={soal.id} className={fieldsetClass}>
              <div className="flex justify-between items-center mb-5 border-b pb-2 border-gray-200">
                <div className="flex items-center gap-2">
                  <FaListAlt className="text-green-600 text-xl" />
                  <h3 className="text-lg font-bold text-gray-800">
                    Soal {index + 1}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleHapusSoal(soal.id)}
                  className="text-gray-400 hover:text-red-500 transition"
                  disabled={daftarSoal.length <= 1}
                >
                  <FaTrash />
                </button>
              </div>

              {/* Upload Gambar */}
              <div className="mb-4">
                <label className={labelClass}>
                  <FaImage className="inline mr-1 text-blue-500" />
                  Gambar Soal (opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  value=""
                  onChange={(e) => handleFileChange(soal.id, e.target.files[0])}
                  className="block text-sm border border-gray-300 rounded-md p-1 w-full"
                />
                {soal.gambarPreview && (
                  <div className="mt-2">
                    <img
                      src={soal.gambarPreview}
                      alt="Preview"
                      className="rounded-md border w-48 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleHapusGambar(soal.id)}
                      className="mt-2 text-sm text-red-600 hover:underline"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                )}
              </div>

              {/* Pertanyaan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Tipe Soal</label>
                  <select
                    value={soal.tipeSoal}
                    onChange={(e) =>
                      handleSoalChange(soal.id, "tipeSoal", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="pilihanGanda">Pilihan Ganda</option>
                    <option value="teksSingkat">Teks Singkat (Auto-Nilai)</option>
                    <option value="esay">Esai (Nilai Manual)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Pertanyaan</label>
                  <textarea
                    value={soal.soalText}
                    onChange={(e) =>
                      handleSoalChange(soal.id, "soalText", e.target.value)
                    }
                    className={textAreaClass}
                    required
                  />
                </div>
              </div>

              {/* Pilihan */}
              {soal.tipeSoal === "pilihanGanda" && (
                <div className="mt-5 border-t border-gray-200 pt-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    Pilihan Jawaban{" "}
                    <span className="text-xs text-gray-500 ml-1">
                      (Pilih satu sebagai jawaban benar)
                    </span>
                  </h4>

                  {soal.pilihan.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-md p-2.5 mb-2 hover:bg-gray-100 transition"
                    >
                      <input
                        type="radio"
                        checked={soal.kunciJawaban === p.id}
                        onChange={() => handleKunciJawabanChange(soal.id, p.id)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <input
                        type="text"
                        placeholder={`Pilihan ${i + 1}`}
                        value={p.text}
                        onChange={(e) =>
                          handlePilihanChange(soal.id, p.id, e.target.value)
                        }
                        className={`${inputClass} flex-1`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleHapusPilihan(soal.id, p.id)}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleTambahPilihan(soal.id)}
                    className="mt-2 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                  >
                    <FaPlus className="w-4 h-4" />
                    Tambah Pilihan
                  </button>
                </div>
              )}

              {/* Kunci Jawaban Teks Singkat */}
              {soal.tipeSoal === "teksSingkat" && (
                <div className="mt-5 border-t border-gray-200 pt-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    Kunci Jawaban
                  </h4>
                  <input
                    type="text"
                    placeholder="Masukkan jawaban singkat yang benar (case-insensitive)"
                    value={soal.kunciJawabanText}
                    onChange={(e) =>
                      handleSoalChange(
                        soal.id,
                        "kunciJawabanText",
                        e.target.value
                      )
                    }
                    className={inputClass}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Gunakan tanda <b>,</b> (tanda koma) untuk memisahkan jika ada
                    lebih dari satu jawaban benar.
                    <br />
                    Contoh: <b>2 , dua , 2 (dua)</b>
                  </p>
                </div>
              )}
            </fieldset>
          ))}

          {/* Tombol Tambah Soal */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={handleTambahSoal}
              className="flex items-center gap-2 py-2.5 px-4 rounded-md bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
            >
              <FaPlus className="w-4 h-4" />
              Tambah Soal Baru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSoal;
