import React, { useState, useEffect, useCallback } from 'react';
// Import FaUsers atau ikon lain untuk judul
import { FaSyncAlt, FaExclamationCircle, FaCopy, FaCheck, FaUsers } from 'react-icons/fa';

const API_URL = "http://localhost:5000";

// Prop `refreshTrigger` akan diisi oleh parent (TambahPeserta)
// setiap kali undangan baru berhasil dikirim
const DaftarUndangan = ({ refreshTrigger }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null); // State untuk feedback copy

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/invite/list`); // Panggil endpoint GET
      if (!response.ok) {
        // Coba baca pesan error dari backend jika ada
        let errorMsg = 'Gagal memuat daftar undangan.';
        try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
        } catch(e) { /* Abaikan jika body bukan JSON */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setInvitations(data);
    } catch (err) {
      console.error("Error fetching invitations:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data saat komponen dimuat DAN saat refreshTrigger berubah
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleCopy = (examId) => {
    navigator.clipboard.writeText(examId).then(() => {
      setCopiedId(examId); // Tandai ID yang berhasil dicopy
      setTimeout(() => setCopiedId(null), 1500); // Hilangkan tanda setelah 1.5 detik
    }).catch(err => {
      console.error("Gagal menyalin ID:", err);
      alert("Gagal menyalin ID.");
    });
  };

  // Helper format tanggal
  const formatTanggal = (isoString) => {
    try {
      const date = new Date(isoString);
      // Format id-ID dengan WIB (jika server dalam UTC)
      // Perhatikan: Ini mengasumsikan browser user di zona waktu yg benar
      return date.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta', // Tentukan zona waktu eksplisit
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit' // Tambah detik jika perlu
      });
    } catch {
      return isoString; // Fallback jika format tidak valid
    }
  };

  return (
    // PERBAIKAN: Hapus mt-8 pt-6 border-t dari div terluar
    <div>
      <div className="flex justify-between items-center mb-4">
        {/* PERBAIKAN: Tambah ikon pada judul */}
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
           <FaUsers className="text-gray-500"/> {/* Ikon Riwayat */}
           Riwayat Undangan
        </h3>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-xs font-medium"
        >
          <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Tampilan Loading, Error, Kosong (Tidak Berubah) */}
      {loading && <p className="text-sm text-gray-500 text-center py-4">Memuat riwayat...</p>}
      {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 flex items-center gap-2">
            <FaExclamationCircle /> {error}
          </div>
      )}
      {!loading && !error && invitations.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Belum ada undangan yang tersimpan.</p>
      )}

      {/* Tabel Riwayat */}
      {!loading && !error && invitations.length > 0 && (
        // Wrapper tabel dengan max-height dan overflow-y-auto
        <div className="overflow-y-auto bg-white rounded-lg shadow-sm border border-gray-200 max-h-96"> {/* Tingginya bisa disesuaikan */}
          <table className="min-w-full text-xs text-left table-fixed">
            {/* Header Tabel Sticky */}
            {/* PERBAIKAN: Tambahkan z-10 agar header tetap di atas saat scroll */}
            <thead className="bg-gray-100 text-gray-600 uppercase sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 w-[40%] border-b border-gray-200">Email</th>
                <th className="py-2 px-3 w-[25%] border-b border-gray-200">ID Ujian</th>
                <th className="py-2 px-3 w-[35%] border-b border-gray-200">Waktu Kirim</th>
              </tr>
            </thead>
            {/* Body Tabel */}
            <tbody className="divide-y divide-gray-100">
              {invitations.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50 align-top">
                  {/* Sel Email */}
                  <td className="py-2 px-3 font-medium text-gray-800 whitespace-normal break-words" title={invite.email}>
                    {invite.email}
                  </td>
                  {/* Sel ID Ujian + Tombol Copy */}
                  <td className="py-2 px-3 whitespace-nowrap">
                     <div className="flex items-center gap-2">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{invite.exam_id}</span>
                        <button
                           onClick={() => handleCopy(invite.exam_id)}
                           className={`p-1 rounded ${copiedId === invite.exam_id ? 'text-green-600' : 'text-gray-400 hover:text-blue-600'}`}
                           title={copiedId === invite.exam_id ? 'Tersalin!' : 'Salin ID'}
                        >
                           {copiedId === invite.exam_id ? <FaCheck/> : <FaCopy/>}
                        </button>
                     </div>
                  </td>
                  {/* Sel Waktu Kirim */}
                  <td className="py-2 px-3 whitespace-nowrap text-gray-600">
                     {formatTanggal(invite.sent_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DaftarUndangan;