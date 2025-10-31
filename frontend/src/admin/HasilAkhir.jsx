import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FaFileAlt,
  FaSyncAlt,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaFileContract,
  FaPercentage,
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

// Komponen StatCard (Tidak berubah)
const StatCard = ({ icon, label, value, color }) => (
  <div
    className={`bg-white p-4 rounded-xl shadow-lg border-l-4 ${color}`}
  >
    <div className="flex items-center">
      <div className="p-2 rounded-full">{icon}</div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

// Komponen Modal (Popup)
const DetailSoalModal = ({ soal, nomorSoal, onClose }) => {
  const isBenar = soal.benar;

  // Cari teks jawaban yang benar dari array 'pilihan'
  const jawabanBenarObj = soal.pilihan?.find((p) => p.is_correct);
  const jawabanBenarText =
    jawabanBenarObj?.opsi_text || "Kunci jawaban tidak ditemukan";

  return (
    // [PERUBAHAN]: class 'bg-black' dan 'bg-opacity-60' DIHAPUS dari div di bawah ini
    <div
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]"
  onClick={onClose}
>

      {/* Konten Modal */}
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Mencegah modal tertutup saat klik di dalam
      >
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">
            Detail Soal #{nomorSoal}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* 1. Soal */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Soal:
            </label>
            <p className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 whitespace-pre-wrap">
              {soal.soal_text}
            </p>
          </div>

          {/* 2. Jawaban Peserta */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Jawaban Peserta:
            </label>
            <div
              className={`border rounded-lg p-4 ${
                isBenar
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <p
                className={`text-lg font-medium ${
                  isBenar ? "text-green-800" : "text-red-800"
                }`}
              >
                {soal.jawaban_text || "(Tidak dijawab)"}
              </p>
              <p
                className={`text-sm font-semibold mt-1 ${
                  isBenar ? "text-green-600" : "text-red-600"
                }`}
              >
                {isBenar ? "BENAR" : "SALAH"}
              </p>
            </div>
          </div>

          {/* 3. Jawaban Benar (Hanya tampil jika peserta salah) */}
          {!isBenar && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Jawaban Benar:
              </label>
              <div className="border rounded-lg p-4 bg-green-50 border-green-300">
                <p className="text-lg font-medium text-green-800">
                  {jawabanBenarText}
                </p>
              </div>
            </div>
          )}

          {/* 4. Daftar Semua Pilihan Ganda */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Semua Pilihan:
            </label>
            <div className="space-y-2">
              {soal.pilihan?.map((pil, idx) => {
                const isJawabanBenar = pil.is_correct;
                const isJawabanPeserta =
                  pil.opsi_text === soal.jawaban_text;
                const labelHuruf = String.fromCharCode("A".charCodeAt(0) + idx);

                return (
                  <div
                    key={pil.id}
                    className={`border rounded-lg p-3 flex items-start gap-3
                      ${
                        isJawabanBenar
                          ? "border-green-500 bg-green-50 shadow-sm"
                          : "border-gray-200"
                      }
                      ${
                        isJawabanPeserta && !isJawabanBenar
                          ? "border-red-500 bg-red-50"
                          : ""
                      }
                    `}
                  >
                    <span className="font-semibold text-gray-700">
                      {labelHuruf}.
                    </span>
                    <span className="flex-1 text-gray-800">
                      {pil.opsi_text}
                    </span>
                    {/* Ikon Tanda */}
                    {isJawabanBenar && (
                      <FaCheckCircle
                        className="text-green-600 mt-1 flex-shrink-0"
                        title="Jawaban Benar"
                      />
                    )}
                    {isJawabanPeserta && !isJawabanBenar && (
                      <FaTimesCircle
                        className="text-red-600 mt-1 flex-shrink-0"
                        title="Pilihan Peserta"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// Komponen HasilAkhir (Tidak ada perubahan di sini)
const HasilAkhir = () => {
  const { id: pesertaId } = useParams();
  const [peserta, setPeserta] = useState(null);
  const [hasil, setHasil] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSoal, setSelectedSoal] = useState(null);
  const [selectedNomor, setSelectedNomor] = useState(0);

  useEffect(() => {
    if (!pesertaId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");

        const resPeserta = await fetch(`${API_URL}/api/peserta/${pesertaId}`);
        const dataPeserta = await resPeserta.json();
        if (!resPeserta.ok) throw new Error(dataPeserta.message);
        setPeserta(dataPeserta);

        const resHasil = await fetch(
          `${API_URL}/api/hasil/peserta/${pesertaId}`
        );
        const dataHasil = await resHasil.json();
        if (!resHasil.ok) throw new Error(dataHasil.message);

        setHasil(dataHasil);
      } catch (err) {
        console.error(err);
        setError(err.message || "Gagal memuat data detail");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [pesertaId]);

  // Pisahkan jawaban PG dan Esai
  const pgAnswers = hasil.filter((h) => h.tipe_soal === "pilihanGanda");
  const esayAnswers = hasil.filter((h) => h.tipe_soal === "esay");

  // Hitung Skor
  const totalPg = pgAnswers.length;
  const totalBenar = pgAnswers.filter((j) => j.benar).length;
  const totalSalah = totalPg - totalBenar;
  const totalEsai = esayAnswers.length;
  const skorPg = totalPg > 0 ? ((totalBenar / totalPg) * 100).toFixed(0) : 0;

  // Handler untuk membuka dan menutup modal
  const handleBukaModal = (jawaban, nomor) => {
    setSelectedSoal(jawaban);
    setSelectedNomor(nomor);
    setIsModalOpen(true);
  };

  const handleTutupModal = () => {
    setIsModalOpen(false);
    setSelectedSoal(null);
    setSelectedNomor(0);
  };

  // Tampilan Loading & Error
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col">
        <div className="bg-white shadow-md border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaSyncAlt className="text-blue-600 text-lg animate-spin" />
            Memuat Detail...
          </h2>
        </div>
        <div className="p-10 flex justify-center items-center text-gray-600">
          <span className="text-lg">Memuat data detail...</span>
        </div>
      </div>
    );
  }

  if (error || !peserta) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col">
        <div className="bg-white shadow-md border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaExclamationCircle className="text-red-600 text-lg" />
            Error
          </h2>
          <Link
            to="/admin/hasil-ujian"
            className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            &larr; Kembali
          </Link>
        </div>
        <div className="p-10 text-center text-red-600">
          {error || "Data peserta tidak ditemukan."}
        </div>
      </div>
    );
  }

  // Tampilan Utama (Sukses)
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FaFileAlt className="text-blue-600" />
          Detail Hasil Ujian
        </h2>
        <Link
          to="/admin/hasil-ujian"
          className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
        >
          &larr; Kembali
        </Link>
      </div>

      {/* KONTEN (Area) */}
      <div className="p-6 md:p-8">
        <div className="p-6 md:p-8 max-w-4xl mx-auto bg-white shadow-xl rounded-xl border border-gray-200">
          {/* Bagian 0: Ringkasan Skor */}
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              📊 Ringkasan Skor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<FaCheckCircle className="text-green-500 text-2xl" />}
                label="PG Benar"
                value={`${totalBenar} / ${totalPg}`}
                color="border-green-500"
              />
              <StatCard
                icon={<FaPercentage className="text-blue-500 text-2xl" />}
                label="Skor PG"
                value={`${skorPg}%`}
                color="border-blue-500"
              />
              <StatCard
                icon={<FaTimesCircle className="text-red-500 text-2xl" />}
                label="PG Salah"
                value={totalSalah}
                color="border-red-500"
              />
              <StatCard
                icon={<FaFileContract className="text-yellow-500 text-2xl" />}
                label="Total Esai"
                value={totalEsai}
                color="border-yellow-500"
              />
            </div>
          </div>

          {/* Bagian 1: Data Peserta */}
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              📋 Data Diri Peserta
            </h2>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
              <DetailItem label="Nama" value={peserta.nama} />
              <DetailItem label="Tempat & Tgl Lahir" value={peserta.ttl} />
              <DetailItem label="Nomor HP" value={peserta.nohp} />
              <DetailItem label="Email" value={peserta.email} />
              <DetailItem label="Jenis Kelamin" value={peserta.jenis_kelamin} />
              <DetailItem
                label="Akun Media Sosial"
                value={peserta.sosmed || "-"}
              />
              <div className="md:col-span-2">
                <DetailItem label="Alamat" value={peserta.alamat} />
              </div>
            </div>
          </div>

          {/* === Bagian 2: Status Pilihan Ganda === */}
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              📝 Status Jawaban Pilihan Ganda
            </h2>
            <div className="flex flex-wrap gap-2">
              {pgAnswers.length > 0 ? (
                pgAnswers.map((jawaban, idx) => (
                  <button
                    key={jawaban.question_id}
                    onClick={() => handleBukaModal(jawaban, idx + 1)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm shadow-sm transition-all hover:shadow-lg hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                      ${
                        jawaban.benar
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-red-100 text-red-700 border border-red-300"
                      }`}
                    title={`Klik untuk melihat detail soal #${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  Tidak ada jawaban pilihan ganda.
                </p>
              )}
            </div>
          </div>

          {/* Bagian 3: Jawaban Esai */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              ✍️ Jawaban Esai (Perlu Penilaian Manual)
            </h2>
            <div className="space-y-6">
              {esayAnswers.length > 0 ? (
                esayAnswers.map((jawaban, idx) => (
                  <div
                    key={jawaban.question_id}
                    className="border-b border-gray-200 pb-4 last:border-b-0"
                  >
                    <p className="text-xs font-semibold text-gray-500 mb-1">
                      ESAI #{idx + 1}
                    </p>
                    <p className="text-lg font-medium text-gray-900 mb-3 whitespace-pre-wrap">
                      {jawaban.soal_text}
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        Jawaban Peserta:
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {jawaban.jawaban_text || "(Tidak dijawab)"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  Tidak ada jawaban esai.
                </p>
              )}
            </div>
          </div>
        </div>{" "}
        {/* End card */}
      </div>{" "}
      {/* End content padding */}
      
      {/* Render Modal */}
      {isModalOpen && (
        <DetailSoalModal
          soal={selectedSoal}
          nomorSoal={selectedNomor}
          onClose={handleTutupModal}
        />
      )}
    </div> // End full page wrapper
  );
};

// Komponen helper
const DetailItem = ({ label, value }) => (
  <div>
    <span className="block text-xs font-medium text-gray-500">{label}</span>
    <span className="block text-gray-900 font-medium">{value || "-"}</span>
  </div>
);

export default HasilAkhir;