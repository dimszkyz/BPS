import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaClock,
  FaPlus,
  FaSave,
  FaTrash,
  FaCogs,
  FaListAlt,
  FaImage,
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

const EditSoal = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamBerakhir, setJamBerakhir] = useState("");
  const [acakSoal, setAcakSoal] = useState(false); // <-- 1. STATE DITAMBAHKAN
  const [daftarSoal, setDaftarSoal] = useState([]);

  // === FETCH DATA UJIAN ===
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API_URL}/api/ujian/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal memuat data ujian");

        setKeterangan(data.keterangan || "");

        // Pastikan tanggal jadi format yyyy-mm-dd (untuk input date)
        const localDate = data.tanggal
          ? new Date(data.tanggal).toLocaleDateString("en-CA", {
              timeZone: "Asia/Jakarta",
            })
          : "";
        setTanggal(localDate);

        // Ambil jam dari API (sesuai backend baru)
        setJamMulai(data.jam_mulai || "");
        setJamBerakhir(data.jam_berakhir || "");
        setAcakSoal(data.acak_soal || false); // <-- 2. SET STATE DARI FETCH

        setDaftarSoal(
          (data.soalList || []).map((s, i) => ({
            id: i + 1,
            tipeSoal: s.tipeSoal,
            soalText: s.soalText,
            gambar: s.gambar || null,
            gambarPreview: s.gambar ? `${API_URL}/api/ujian${s.gambar}` : null,
            pilihan:
              s.tipeSoal === "pilihanGanda"
                ? (s.pilihan || []).map((p, idx) => ({
                    id: idx + 1,
                    text: p.text,
                  }))
                : [],
            kunciJawaban:
              s.tipeSoal === "pilihanGanda"
                ? (s.pilihan || []).findIndex((p) => p.isCorrect) + 1
                : 0,
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

  // === HANDLER SOAL ===
  const handleTambahSoal = () => {
    const newId = daftarSoal.length + 1;
    setDaftarSoal([
      ...daftarSoal,
      {
        id: newId,
        tipeSoal: "pilihanGanda",
        soalText: "",
        gambar: null,
        gambarPreview: null,
        pilihan: [
          { id: 1, text: "" },
          { id: 2, text: "" },
        ],
        kunciJawaban: 1,
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

  // === HANDLER PILIHAN ===
  const handleTambahPilihan = (soalId) => {
    setDaftarSoal((prev) =>
      prev.map((s) =>
        s.id === soalId
          ? {
              ...s,
              pilihan: [...s.pilihan, { id: s.pilihan.length + 1, text: "" }],
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
      prev.map((s) => (s.id === soalId ? { ...s, kunciJawaban: pilihanId } : s))
    );
  };

  // === SIMPAN PERUBAHAN ===
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!jamMulai || !jamBerakhir) {
      alert("Jam mulai dan jam berakhir wajib diisi.");
      return;
    }

    const soalList = daftarSoal.map((s) => ({
      tipeSoal: s.tipeSoal,
      soalText: s.soalText,
      gambar: s.gambarPreview?.includes("/uploads/")
        ? s.gambarPreview.replace(`${API_URL}/api/ujian`, "")
        : null,
      pilihan: s.tipeSoal === "pilihanGanda" ? s.pilihan.map((p) => p.text) : [],
      kunciJawabanText:
        s.tipeSoal === "pilihanGanda"
          ? s.pilihan.find((p) => p.id === s.kunciJawaban)?.text || ""
          : "",
    }));

    const formData = new FormData();
    formData.append(
      "data",
      JSON.stringify({
        keterangan,
        tanggal,
        jamMulai,
        jamBerakhir,
        acakSoal, // <-- 3. TAMBAHKAN KE SUBMIT
        soalList,
      })
    );

    daftarSoal.forEach((s, i) => {
      if (s.gambar && typeof s.gambar !== "string") {
        formData.append(`gambar_${i}`, s.gambar);
      }
    });

    try {
      const res = await fetch(`${API_URL}/api/ujian/${id}`, {
        method: "PUT",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menyimpan perubahan");

      alert("✅ Ujian berhasil diperbarui!");
      navigate("/admin/daftar-soal");
    } catch (err) {
      alert("Terjadi kesalahan: " + err.message);
    }
  };

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
      {/* HEADER */}
      <div className="bg-white shadow-md border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          🧩 Edit Soal Ujian
        </h2>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/daftar-soal")}
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

              <div className="relative">
                <label className={labelClass}>Tanggal Pengerjaan</label>
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
                <label className={labelClass}>Jam Mulai</label>
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
                <label className={labelClass}>Jam Berakhir</label>
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
            </div>

            {/* 4. JSX CHECKBOX DITAMBAHKAN */}
            <div className="mt-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={acakSoal}
                  onChange={() => setAcakSoal(!acakSoal)}
                  className="h-4 w-4"
                />
                Acak urutan soal untuk setiap peserta
              </label>
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
                    <option value="esay">Esai</option>
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