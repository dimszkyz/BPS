import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaSyncAlt,
  FaPoll,
  FaExclamationCircle,
  FaEye,
  FaCopy,
  FaWhatsapp,
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

// Fungsi groupDataByPeserta
const groupDataByPeserta = (data) => {
  const grouped = data.reduce((acc, row) => {
    // Buat key unik untuk setiap peserta
    const id = row.peserta_id;

    // Jika peserta belum ada di 'acc', inisialisasi
    if (!acc[id]) {
      acc[id] = {
        peserta_id: id,
        nama: row.nama,
        nohp: row.nohp,
        email: row.email,
        alamat: row.alamat,
        ttl: row.ttl,
        jenis_kelamin: row.jenis_kelamin,
        pg_benar: 0,
        total_pg: 0,
      };
    }

    // Hitung skor Pilihan Ganda
    if (row.tipe_soal === "pilihanGanda") {
      acc[id].total_pg += 1;
      if (row.benar) {
        acc[id].pg_benar += 1;
      }
    }

    return acc;
  }, {});

  // ================================================================
  // ▼▼▼ PERUBAHAN DI SINI ▼▼▼
  // Ubah objek hasil group menjadi array DAN hitung skor PG
  // ================================================================
  return Object.values(grouped).map((peserta) => {
    // Hitung skor PG, sama seperti di HasilAkhir.jsx
    const skor_pg =
      peserta.total_pg > 0
        ? ((peserta.pg_benar / peserta.total_pg) * 100).toFixed(0)
        : 0;

    // Kembalikan objek peserta yang sudah dilengkapi skor_pg
    return {
      ...peserta,
      skor_pg: skor_pg,
    };
  });
};
// ================================================================
// ▲▲▲ AKHIR PERUBAHAN ▲▲▲
// ================================================================

const HasilUjian = () => {
  const [hasil, setHasil] = useState([]);
  const [loading, setLoading] = useState(true);

  // ... (Logika fetchData dan useEffect tidak berubah) ...
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/hasil`);
      const data = await res.json();
      const groupedData = groupDataByPeserta(data);
      setHasil(groupedData);
    } catch (err) {
      console.error(err);
      alert("Gagal memuat hasil ujian");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ... (Fungsi helper handleCopy dan formatWhatsappURL tidak berubah) ...
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Gagal menyalin teks: ", err);
    });
  };

  const formatWhatsappURL = (nohp) => {
    let formattedNohp = nohp.replace(/[\s-+]/g, "");
    if (formattedNohp.startsWith("0")) {
      formattedNohp = "62" + formattedNohp.substring(1);
    } else if (!formattedNohp.startsWith("62")) {
      formattedNohp = "62" + formattedNohp;
    }
    return `https://wa.me/${formattedNohp}`;
  };

  // ... (Tampilan Loading & Kosong tidak berubah) ...
  if (loading) {
    // (kode loading)
  }
  if (hasil.length === 0) {
    // (kode data kosong)
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* 1. HEADER / NAVBAR HALAMAN (Tidak berubah) */}
      <div className="bg-white shadow-md border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FaPoll className="text-blue-600 text-lg" />
          Rekap Hasil Ujian
        </h2>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* 2. KONTEN (Area Tabel) */}
      <div className="p-6 md:p-10">
        <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
          <table className="min-w-full text-sm text-left border-collapse border border-gray-200 table-fixed">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                {/* ================================================================ */}
                {/* ▼▼▼ PERUBAHAN LEBAR KOLOM (w-[...]) DI SINI ▼▼▼ */}
                {/* ================================================================ */}
                <th className="py-3 px-5 w-[25%] border border-gray-200">
                  Nama Peserta
                </th>
                <th className="py-3 px-5 w-[20%] border border-gray-200">
                  Nomor HP
                </th>
                <th className="py-3 px-5 w-[25%] border border-gray-200">
                  Email
                </th>
                {/* Lebar Alamat dikurangi untuk memberi ruang */}
                <th className="py-3 px-5 w-[10%] border border-gray-200">
                  Alamat
                </th>
                <th className="py-3 px-5 w-[10%] border border-gray-200">
                  PG Benar
                </th>
                {/* ================================================================ */}
                {/* ▼▼▼ KOLOM BARU DITAMBAHKAN DI SINI ▼▼▼ */}
                {/* ================================================================ */}
                <th className="py-3 px-5 w-[5%] border border-gray-200">
                  Skor PG
                </th>
                {/* ================================================================ */}
                <th className="py-3 px-5 w-[5%] text-center border border-gray-200">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {hasil.map((peserta) => (
                <tr
                  key={peserta.peserta_id}
                  className="hover:bg-gray-50 align-top border border-gray-200"
                >
                  {/* Sel Nama */}
                  <td className="py-3 px-5 font-medium text-gray-800 whitespace-normal break-words border border-gray-200">
                    {peserta.nama}
                  </td>

                  {/* Sel Nomor HP (dengan ikon WA) */}
                  <td className="py-3 px-5 whitespace-nowrap border border-gray-200">
                    <div className="flex items-center justify-between gap-3">
                      <span>{peserta.nohp}</span>
                      <a
                        href={formatWhatsappURL(peserta.nohp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 hover:text-green-700 transition"
                        title={`WhatsApp ${peserta.nohp}`}
                      >
                        <FaWhatsapp />
                      </a>
                    </div>
                  </td>

                  {/* Sel Email (dengan ikon Salin) */}
                  <td className="py-3 px-5 border border-gray-200">
                    <div className="flex items-center justify-between gap-3">
                      <span className="whitespace-normal break-words">
                        {peserta.email}
                      </span>
                      <button
                        onClick={() => handleCopy(peserta.email)}
                        className="text-gray-500 hover:text-blue-600 transition"
                        title={`Salin ${peserta.email}`}
                      >
                        <FaCopy />
                      </button>
                    </div>
                  </td>

                  {/* Sel Alamat */}
                  <td className="py-3 px-5 whitespace-normal break-words border border-gray-200">
                    {peserta.alamat}
                  </td>

                  {/* Sel Skor Benar */}
                  <td className="py-3 px-5 whitespace-nowrap font-semibold border border-gray-200">
                    {peserta.pg_benar} / {peserta.total_pg}
                  </td>

                  {/* ================================================================ */}
                  {/* ▼▼▼ DATA BARU DITAMPILKAN DI SINI ▼▼▼ */}
                  {/* ================================================================ */}
                  <td className="py-3 px-5 whitespace-nowrap font-bold text-blue-700 border border-gray-200">
                    {peserta.skor_pg}%
                  </td>
                  {/* ================================================================ */}

                  {/* Sel Aksi */}
                  <td className="py-3 px-5 text-center border border-gray-200">
                    <div className="flex justify-center gap-3">
                      <Link
                        to={`/admin/hasil/${peserta.peserta_id}`}
                        className="text-blue-600 hover:text-blue-800 transition"
                        title="Lihat Hasil Akhir"
                      >
                        <FaEye />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HasilUjian;