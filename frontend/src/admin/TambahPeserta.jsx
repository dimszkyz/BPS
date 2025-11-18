// File: src/admin/TambahPeserta.jsx

import React, { useState, useEffect } from "react";
import {
  FaEnvelope,
  FaSyncAlt,
  FaPaperPlane,
  FaPlus,
  FaTimes,
  FaListUl,
  FaKey,
  FaCog, // Ikon untuk tombol pengaturan
  FaCheckCircle, // <-- DITAMBAHKAN
} from "react-icons/fa";
import DaftarUndangan from "./DaftarUndangan";
import EmailPengirim from "./EmailPengirim"; // Import komponen modal pengaturan email

const API_URL = "http://localhost:5000";

// Helper validasi email sederhana
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const TambahPeserta = () => {
  const [pesan, setPesan] = useState("");
  const [emails, setEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // --- State Ujian & Batas Login ---
  const [ujianList, setUjianList] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loadingUjian, setLoadingUjian] = useState(true);
  const [maxLogins, setMaxLogins] = useState(1);

  // --- STATE UNTUK MODAL PENGATURAN EMAIL ---
  const [showEmailSettings, setShowEmailSettings] = useState(false);

  // --- STATE UNTUK TOAST ---
  const [successMessage, setSuccessMessage] = useState(""); // <-- DITAMBAHKAN

  // --- Fetch Daftar Ujian saat komponen dimuat ---
  useEffect(() => {
    const fetchUjianList = async () => {
      try {
        setLoadingUjian(true);
        const token = sessionStorage.getItem("adminToken");
        const res = await fetch(`${API_URL}/api/ujian`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Gagal memuat daftar ujian");
        const data = await res.json();
        // Filter hanya ujian yang belum dihapus
        setUjianList(data.filter((u) => !u.is_deleted));
      } catch (err) {
        console.error(err);
        alert(err.message);
      } finally {
        setLoadingUjian(false);
      }
    };
    fetchUjianList();
  }, []);

  // --- Handler Tambah Email ke List ---
  const handleAddEmail = () => {
    const emailToAdd = currentEmail.trim();

    if (!emailToAdd) {
      alert("Masukkan alamat email terlebih dahulu.");
      return;
    }
    if (!isValidEmail(emailToAdd)) {
      alert(`Format email "${emailToAdd}" tidak valid.`);
      return;
    }
    if (emails.includes(emailToAdd)) {
      alert(`Email "${emailToAdd}" sudah ada dalam daftar.`);
      setCurrentEmail("");
      return;
    }

    setEmails([...emails, emailToAdd]);
    setCurrentEmail("");
  };

  // --- Handler Hapus Email dari List ---
  const handleRemoveEmail = (indexToRemove) => {
    setEmails(emails.filter((_, index) => index !== indexToRemove));
  };

  // --- Handler Kirim Undangan ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedExamId) {
      alert("Pilih ujian yang akan diundang terlebih dahulu.");
      return;
    }

    // Validasi Batas Login
    const maxLoginsNum = parseInt(maxLogins, 10);
    if (isNaN(maxLoginsNum) || maxLoginsNum <= 0) {
      alert("Batas login minimal harus 1.");
      return;
    }

    // Cek apakah ada email yang belum ditambahkan dari input
    const finalCurrentEmail = currentEmail.trim();
    let finalEmails = [...emails];

    if (finalCurrentEmail) {
      if (!isValidEmail(finalCurrentEmail)) {
        alert(
          `Format email "${finalCurrentEmail}" di input tidak valid. Harap tambahkan atau hapus.`
        );
        return;
      }
      if (!finalEmails.includes(finalCurrentEmail)) {
        finalEmails.push(finalCurrentEmail);
      }
      setCurrentEmail("");
    }

    if (!pesan.trim()) {
      alert("Isi Email Undangan tidak boleh kosong.");
      return;
    }
    if (finalEmails.length === 0) {
      alert("Tambahkan setidaknya satu alamat email peserta.");
      return;
    }

    setLoading(true);

    try {
      // Payload yang dikirim ke backend
      const payload = {
        exam_id: selectedExamId,
        pesan,
        emails: finalEmails,
        max_logins: maxLoginsNum,
      };

      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(`${API_URL}/api/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let result = {};
      const responseBodyText = await response.text();

      try {
        result = JSON.parse(responseBodyText);
      } catch (jsonError) {
        console.error("Gagal parse JSON:", jsonError, responseBodyText);
        throw new Error("Respons server tidak valid.");
      }

      if (!response.ok && response.status !== 207) {
        const errorMessage =
          result.message ||
          (result.errors && result.errors.length > 0
            ? `Gagal: ${result.errors[0].reason}`
            : `Server error: ${response.status}`);
        throw new Error(errorMessage);
      }

      // --- PERUBAHAN DI SINI ---
      // Mengganti alert() dengan setSuccessMessage
      setSuccessMessage(result.message || `Proses pengiriman selesai.`);
      setTimeout(() => setSuccessMessage(""), 7000);
      // --- AKHIR PERUBAHAN ---

      setEmails([]);
      setCurrentEmail("");
      // Trigger refresh pada daftar riwayat undangan
      setRefreshKey((prevKey) => prevKey + 1);
    } catch (error) {
      console.error("Error mengirim undangan:", error);
      alert(`Gagal mengirim undangan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col relative">
      {/* --- TOAST SUKSES (DITAMBAHKAN) --- */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100]">
          <div className="flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg">
            <FaCheckCircle className="text-white w-5 h-5" />
            <span className="font-semibold text-base">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-300 px-8 py-5 sticky top-0 z-50 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <FaPaperPlane className="text-blue-600 w-6 h-6" />
          Undang Peserta Ujian
        </h2>

        {/* Tombol Pengaturan Email */}
        <button
          onClick={() => setShowEmailSettings(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition text-sm font-medium border border-gray-300"
          title="Konfigurasi Email Pengirim"
        >
          <FaCog /> Pengaturan Email
        </button>
      </div>

      {/* Konten Utama */}
      <div className="p-6 md:p-10 flex-1">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start max-w-6xl mx-auto">
          {/* Kolom Kiri: Form Undangan */}
          <div className="w-full md:w-7/12 lg:w-1/2">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* --- BAGIAN PENGATURAN UJIAN --- */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Pilih Ujian */}
                  <div className="col-span-2">
                    <label
                      htmlFor="ujian"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      <FaListUl className="inline-block mr-1 text-blue-500" />
                      Pilih Ujian
                    </label>
                    <select
                      id="ujian"
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                      required
                      disabled={loadingUjian}
                    >
                      <option value="">
                        {loadingUjian
                          ? "Memuat daftar ujian..."
                          : "-- Pilih Keterangan Ujian --"}
                      </option>
                      {ujianList.map((ujian) => (
                        <option key={ujian.id} value={ujian.id}>
                          {ujian.keterangan}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batas Login */}
                  <div>
                    <label
                      htmlFor="max_logins"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      <FaKey className="inline-block mr-1 text-yellow-500" />
                      Batas Akses Login
                    </label>
                    <input
                      type="number"
                      id="max_logins"
                      value={maxLogins}
                      onChange={(e) => setMaxLogins(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* Textarea Pesan */}
                <div>
                  <label
                    htmlFor="pesan"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Isi Email Undangan
                  </label>
                  <textarea
                    id="pesan"
                    value={pesan}
                    onChange={(e) => setPesan(e.target.value)}
                    rows="5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-400"
                    placeholder="Tulis isi email undangan di sini..."
                    required
                  />
                </div>

                {/* Input Email Dinamis */}
                <div>
                  <label
                    htmlFor="currentEmail"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Peserta
                  </label>

                  {/* Daftar Email */}
                  {emails.length > 0 && (
                    <div className="mb-3 p-3 border border-gray-200 rounded-md bg-gray-50 max-h-40 overflow-y-auto">
                      <ul className="space-y-1">
                        {emails.map((email, index) => (
                          <li
                            key={index}
                            className="flex justify-between items-center text-sm bg-white p-1.5 rounded border border-gray-300"
                          >
                            <span
                              className="text-gray-700 truncate mr-2"
                              title={email}
                            >
                              {email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(index)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                              title={`Hapus ${email}`}
                            >
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Input + Tombol Tambah */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FaEnvelope className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        id="currentEmail"
                        value={currentEmail}
                        onChange={(e) => setCurrentEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-400"
                        placeholder="Masukkan email lalu klik Tambah"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddEmail();
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEmail}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-sm font-medium"
                      title="Tambahkan email ke daftar"
                    >
                      <FaPlus className="w-3 h-3" /> Tambah
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tekan Enter atau klik Tambah.
                  </p>
                </div>

                {/* Tombol Kirim Undangan */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      (emails.length === 0 && !currentEmail.trim()) ||
                      !selectedExamId
                    }
                    className={`w-full flex justify-center items-center gap-2 px-4 py-3 rounded-md text-white font-semibold shadow transition ${
                      loading ||
                      (emails.length === 0 && !currentEmail.trim()) ||
                      !selectedExamId
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {loading ? (
                      <>
                        <FaSyncAlt className="animate-spin" /> Mengirim...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane /> Kirim Undangan ke{" "}
                        {emails.length +
                          (currentEmail.trim() &&
                          !emails.includes(currentEmail.trim())
                            ? 1
                            : 0)}{" "}
                        Email
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Kolom Kanan: Riwayat Undangan */}
          <div className="w-full md:w-5/12 lg:flex-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8">
              <DaftarUndangan refreshTrigger={refreshKey} />
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL PENGATURAN EMAIL --- */}
      {showEmailSettings && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          {/* Overlay agar bisa klik di luar untuk menutup (opsional) */}
          <div
            className="absolute inset-0"
            onClick={() => setShowEmailSettings(false)}
          ></div>

          {/* Konten Modal */}
          <div className="relative w-full max-w-2xl z-10">
            <EmailPengirim onClose={() => setShowEmailSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TambahPeserta;