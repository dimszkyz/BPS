import React, { useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaPlus,
  FaSave,
  FaCheckCircle,
  FaTrash,
  FaCogs,
  FaListAlt,
  FaImage,
} from "react-icons/fa";

const getAdminToken = () => {
  const token = sessionStorage.getItem("adminToken");
  if (!token) throw new Error("Token tidak ditemukan.");
  return token;
};

const TambahSoal = () => {
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [tanggalBerakhir, setTanggalBerakhir] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamBerakhir, setJamBerakhir] = useState("");
  const [durasi, setDurasi] = useState("");
  const [acakSoal, setAcakSoal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [daftarSoal, setDaftarSoal] = useState([
    {
      id: 1,
      tipeSoal: "pilihanGanda",
      soalText: "",
      gambar: null,
      gambarPreview: null,
      pilihan: [
        { id: 1, text: "" },
        { id: 2, text: "" },
      ],
      kunciJawaban: 1,
      kunciJawabanText: "", // <-- PERUBAHAN DI SINI
    },
  ]);

  // === HANDLER GAMBAR ===
  const handleFileChange = (soalId, file) => {
    const updated = daftarSoal.map((s) => {
      if (s.id === soalId) {
        return {
          ...s,
          gambar: file,
          gambarPreview: file ? URL.createObjectURL(file) : null,
        };
      }
      return s;
    });
    setDaftarSoal(updated);
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
        kunciJawabanText: "", // <-- PERUBAHAN DI SINI
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

  // === SUBMIT ===
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
      tipeSoal: s.tipeSoal,
      soalText: s.soalText,
      pilihan: s.tipeSoal === "pilihanGanda" ? s.pilihan.map((p) => p.text) : [],
      // <-- PERUBAHAN DI SINI -->
      kunciJawabanText:
        s.tipeSoal === "pilihanGanda"
          ? s.pilihan.find((p) => p.id === s.kunciJawaban)?.text || ""
          : s.tipeSoal === "teksSingkat"
            ? s.kunciJawabanText || ""
            : "",
      // <-- AKHIR PERUBAHAN -->
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
        soalList,
      })
    );

    // Tambahkan file gambar jika ada
    daftarSoal.forEach((s, i) => {
      if (s.gambar) {
        formData.append(`gambar_${i}`, s.gambar);
      }
    });

    try {
      const token = getAdminToken();
      if (!token) throw new Error("Token tidak ditemukan.");

      const res = await fetch("http://localhost:5000/api/ujian", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menyimpan ujian");

      // Tampilkan toast tanpa ID
      setSuccessMessage("Ujian Berhasil Disimpan");
      setTimeout(() => setSuccessMessage(""), 7000);

      // Reset form
      setKeterangan("");
      setTanggal("");
      setTanggalBerakhir("");
      setJamMulai("");
      setJamBerakhir("");
      setDurasi("");
      setAcakSoal(false);
      setDaftarSoal([
        {
          id: 1,
          tipeSoal: "pilihanGanda",
          soalText: "",
          gambar: null,
          gambarPreview: null,
          pilihan: [
            { id: 1, text: "" },
            { id: 2, text: "" },
          ],
          kunciJawaban: 1,
          kunciJawabanText: "", // <-- PERUBAHAN DI SINI
        },
      ]);
    } catch (err) {
      console.error("Error:", err);
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  // === STYLE ===
  const labelClass =
    "block text-sm font-semibold text-gray-700 mb-1 tracking-wide";
  const inputClass =
    "block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm py-2.5 px-3";
  const textAreaClass =
    "block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm p-3 min-h-[100px]";
  const fieldsetClass =
    "bg-white rounded-xl border border-gray-100 shadow-sm p-6 transition duration-200";

  return (
    <div className="bg-gray-50 min-h-screen">
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
      <div className="bg-white shadow-sm border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        {/* Judul di Kiri */}
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          🧩 Tambah Ujian
        </h2>

        {/* Tombol di Kanan */}
        <div className="flex gap-3">
          <button
            type="submit"
            form="form-ujian" // <--- TAMBAHKAN INI
            className="flex items-center gap-2 py-2.5 px-5 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
          >
            <FaSave className="w-4 h-4" />
            Simpan Semua Soal
          </button>
        </div>

      </div>

      {/* FORM */}
      <div className="p-6 md:p-10">
        <form id="form-ujian" onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
          {/* PENGATURAN UJIAN */}
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
                <label className={labelClass}>Tanggal Mulai (Akses Dibuka)</label>
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
                <label className={labelClass}>Jam Berakhir (Akses Ditutup)</label>
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

            {/* Acak Urutan Soal */}
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

          {/* DAFTAR SOAL */}
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
                  <img
                    src={soal.gambarPreview}
                    alt="Preview"
                    className="mt-2 rounded-md border w-48 shadow-sm"
                  />
                )}
              </div>

              {/* Tipe & Teks Soal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Tipe Soal</label>
                  {/* <-- PERUBAHAN DI SINI --> */}
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
                  {/* <-- AKHIR PERUBAHAN --> */}
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Pertanyaan</label>
                  <textarea
                    value={soal.soalText}
                    onChange={(e) =>
                      handleSoalChange(soal.id, "soalText", e.target.value)
                    }
                    className={textAreaClass}
                    placeholder="Masukkan teks pertanyaan..."
                    required
                  />
                </div>
              </div>

              {/* Pilihan Ganda */}
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

              {/* <-- PERUBAHAN DI SINI (BLOK BARU) --> */}
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
                    Gunakan tanda <b>,</b> (tanda koma) untuk memisahkan jika
                    ada lebih dari satu jawaban benar.
                    <br />
                    Contoh: <b>2 , dua , 2 (dua)</b>
                  </p>
                </div>
              )}
              {/* <-- AKHIR PERUBAHAN --> */}

              {/* Info Esai */}
              {soal.tipeSoal === "esay" && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md mt-4">
                  <div className="flex">
                    <FaCheckCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                    <p className="ml-3 text-sm text-blue-700">
                      Untuk soal esai, jawaban akan dinilai manual oleh pengajar.
                    </p>
                  </div>
                </div>
              )}
            </fieldset>
          ))}

          {/* Tombol Tambah & Simpan */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleTambahSoal}
              className="flex items-center gap-2 py-2.5 px-4 rounded-md bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
            >
              <FaPlus className="w-4 h-4" />
              Tambah Soal Lagi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TambahSoal;