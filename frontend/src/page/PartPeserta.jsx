import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaUser,
  FaCalendarAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaTransgender,
  FaHome,
  FaInstagram,
  FaArrowRight,
  FaArrowLeft,
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

const PartPeserta = () => {
  const navigate = useNavigate();
  const { id } = useParams();  // Get `id` from URL params

  // ===== STATE =====
  const [form, setForm] = useState({
    nama: "",
    ttl: "",
    nohp: "",
    email: "",
    jenisKelamin: "",
    alamat: "",
    sosmed: "",
  });

  const [pesertaId, setPesertaId] = useState(null); // ID peserta untuk edit
  const [submitted, setSubmitted] = useState(false); // Status setelah klik Simpan & Lanjut

  // ===== LOAD DATA DARI SERVER (Jika ada pesertaId) =====
  useEffect(() => {
    if (id) {
      // Fetch data peserta berdasarkan ID
      const fetchPesertaData = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/peserta/${id}`);
          const data = await res.json();
          if (res.ok) {
            setPesertaId(id); // Set pesertaId untuk edit mode
            setForm({
              nama: data.nama,
              ttl: data.ttl,
              nohp: data.nohp,
              email: data.email,
              jenisKelamin: data.jenis_kelamin,
              alamat: data.alamat,
              sosmed: data.sosmed,
            });
          } else {
            alert("Data peserta tidak ditemukan!");
          }
        } catch (err) {
          console.error("Gagal mengambil data peserta:", err);
          alert("Gagal mengambil data peserta.");
        }
      };
      fetchPesertaData();
    }
  }, [id]); // Memanggil ulang useEffect jika `id` berubah

  // ===== HANDLER CHANGE =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ===== SUBMIT (SIMPAN & LANJUT) =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi jika ada kolom yang kosong
    const kosong = Object.entries(form).find(([_, v]) => !v.trim());
    if (kosong) {
      alert(`Kolom "${kosong[0]}" belum diisi.`);
      return;
    }

    try {
      let res;
      if (pesertaId) {
        // Jika pesertaId ada, lakukan PUT (update)
        res = await fetch(`http://localhost:5000/api/peserta/${pesertaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        // Jika tidak ada pesertaId, lakukan POST (create)
        res = await fetch("http://localhost:5000/api/peserta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setPesertaId(data.id);

      // Simpan ID peserta di localStorage jika peserta baru
      const pesertaData = { id: data.id, ...form };
      localStorage.setItem("pesertaData", JSON.stringify(pesertaData));

      setSubmitted(true); // Menampilkan pesan sukses
    } catch (err) {
      alert("Gagal menyimpan data peserta: " + err.message);
    }
  };

  // ===== LANJUT UJIAN =====
  const handleMulaiUjian = async () => {
  try {
    const today = new Date();
    const localToday = today.toISOString().split("T")[0];

    const res = await fetch(`${API_URL}/api/ujian/tanggal/${localToday}`);
    const ujianHariIni = await res.json();

    if (!res.ok) {
      alert(ujianHariIni.message || "Belum ada ujian aktif untuk hari ini.");
      return;
    }

    navigate(`/ujian/${ujianHariIni.id}`);
  } catch (err) {
    alert("Gagal memuat ujian: " + err.message);
  }
};


  const handleKembali = async () => {
  const backupForm = { ...form };  // Menyimpan backup form untuk mengisi data sementara

  if (!pesertaId) {
    setSubmitted(false);
    return;
  }

  try {
    // Hapus data peserta dari database menggunakan DELETE
    const res = await fetch(`${API_URL}/api/peserta/${pesertaId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      // Hapus data dari localStorage (untuk pengguna lain)
      localStorage.removeItem("pesertaData");

      // Reset pesertaId dan form untuk melanjutkan pengeditan
      setPesertaId(null);
      setForm(backupForm);  // Form tetap diisi sementara, akan reset setelah halaman refresh
      setSubmitted(false);  // Reset status pengiriman form

    } 
  } catch (err) {
    console.error("Gagal menghapus data peserta:", err);
  }
};



  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* NAVBAR */}
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 tracking-wide">
            🧾 Formulir Data Diri Peserta
          </h1>
          <span className="text-sm text-gray-500 font-medium">Ujian ID: {id}</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6"
            >
              {/* Nama */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FaUser className="inline-block mr-1 text-blue-500" />
                  Nama Lengkap (Sesuai KTP)
                </label>
                <input
                  type="text"
                  name="nama"
                  value={form.nama}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* TTL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FaCalendarAlt className="inline-block mr-1 text-blue-500" />
                  Tempat & Tanggal Lahir
                </label>
                <input
                  type="text"
                  name="ttl"
                  value={form.ttl}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* Jenis Kelamin */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FaTransgender className="inline-block mr-1 text-blue-500" />
                  Jenis Kelamin
                </label>
                <select
                  name="jenisKelamin"
                  value={form.jenisKelamin}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                >
                  <option value="">-- Pilih Jenis Kelamin --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              {/* No HP */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FaPhoneAlt className="inline-block mr-1 text-blue-500" />
                  Nomor HP Aktif
                </label>
                <input
                  type="tel"
                  name="nohp"
                  value={form.nohp}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FaEnvelope className="inline-block mr-1 text-blue-500" />
                  Email Aktif
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* Sosmed */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FaInstagram className="inline-block mr-1 text-blue-500" />
                  Akun Media Sosial
                </label>
                <input
                  type="text"
                  name="sosmed"
                  value={form.sosmed}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* Alamat */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  <FaHome className="inline-block mr-1 text-blue-500" />
                  Alamat Sesuai KTP
                </label>
                <textarea
                  name="alamat"
                  value={form.alamat}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                ></textarea>
              </div>

              {/* Submit */}
              <div className="md:col-span-2 pt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2 text-base"
                >
                  <FaArrowRight />
                  Simpan & Lanjut
                </button>
              </div>
            </form>
          ) : (
            <div className="p-10 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-5">
                Mohon Cek Kembali Data Anda Sebelum Melanjutkan
              </h2>

              <div className="text-left bg-gray-50 rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  📋 Rangkuman Data Peserta:
                </h3>
                <ul className="text-gray-700 leading-relaxed space-y-1">
                  <li>
                    <strong>Nama:</strong> {form.nama}
                  </li>
                  <li>
                    <strong>Tempat & Tanggal Lahir:</strong> {form.ttl}
                  </li>
                  <li>
                    <strong>Nomor HP:</strong> {form.nohp}
                  </li>
                  <li>
                    <strong>Email:</strong> {form.email}
                  </li>
                  <li>
                    <strong>Jenis Kelamin:</strong> {form.jenisKelamin}
                  </li>
                  <li>
                    <strong>Alamat:</strong> {form.alamat}
                  </li>
                  <li>
                    <strong>Akun Media Sosial:</strong> {form.sosmed}
                  </li>
                </ul>
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <button
                  onClick={handleKembali}
                  className="w-full md:w-1/2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2 text-base"
                >
                  <FaArrowLeft />
                  Kembali (Edit)
                </button>

                <button
                  onClick={handleMulaiUjian}
                  className="w-full md:w-1/2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2 text-base"
                >
                  Mulai Ujian Sekarang
                  <FaArrowRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-sm text-gray-400 py-4 border-t border-gray-200">
        © {new Date().getFullYear()} BPS Kota Salatiga. All rights reserved.
      </footer>
    </div>
  );
};

export default PartPeserta;
