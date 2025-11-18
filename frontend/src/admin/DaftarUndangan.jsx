import React, { useState, useEffect, useCallback } from "react";
import {
  FaSyncAlt,
  FaExclamationCircle,
  FaCopy,
  FaCheck,
  FaUsers,
  FaListUl, // Ganti/tambah ikon untuk judul grup
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

const DaftarUndangan = ({ refreshTrigger }) => {
  // --- STATE BERUBAH ---
  // Kita tidak lagi menyimpan array datar, tapi objek yang dikelompokkan
  const [groupedInvitations, setGroupedInvitations] = useState({});
  // ---------------------

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(`${API_URL}/api/invite/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        let errorMsg = "Gagal memuat daftar undangan.";
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {
          /* Abaikan */
        }
        throw new Error(errorMsg);
      }
      const data = await response.json(); // data adalah array datar [invite1, invite2, ...]

      // --- LOGIKA PENGELOMPOKAN BARU ---
      const grouped = data.reduce((acc, invite) => {
        // Gunakan exam_id sebagai kunci unik
        const examId = invite.exam_id || "unknown";

        // Buat grup jika belum ada
        if (!acc[examId]) {
          acc[examId] = {
            // Ambil keterangan dari undangan pertama yang kita temui
            keterangan:
              invite.keterangan_ujian || `Ujian (ID: ${examId})`,
            list: [], // Buat daftar kosong untuk undangan
          };
        }

        // Tambahkan undangan ini ke daftar grupnya
        acc[examId].list.push(invite);
        return acc;
      }, {}); // Mulai dengan objek kosong

      setGroupedInvitations(grouped); // Simpan data yang sudah dikelompokkan
      // --- AKHIR LOGIKA PENGELOMPOKAN ---

    } catch (err) {
      console.error("Error fetching invitations:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleCopy = (loginCode) => {
    navigator.clipboard.writeText(loginCode).then(
      () => {
        setCopiedCode(loginCode);
        setTimeout(() => setCopiedCode(null), 1500);
      },
      (err) => {
        console.error("Gagal menyalin kode:", err);
        alert("Gagal menyalin kode.");
      }
    );
  };

  const formatTanggal = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FaUsers className="text-gray-500" />
          Riwayat Undangan
        </h3>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-xs font-medium"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 text-center py-4">Memuat riwayat...</p>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 flex items-center gap-2">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {/* --- PERUBAHAN LOGIKA CEK DATA KOSONG --- */}
      {!loading &&
        !error &&
        Object.keys(groupedInvitations).length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Belum ada undangan yang tersimpan.
          </p>
        )}

      {/* --- PERUBAHAN LOGIKA RENDER TABEL --- */}
      {!loading && !error && Object.keys(groupedInvitations).length > 0 && (
        // Wrapper untuk semua grup, dengan scroll
        <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
          {/* Loop melalui Objek Grup, bukan Array */}
          {Object.entries(groupedInvitations).map(([examId, groupData]) => (

            // 1. Buat kontainer untuk setiap grup
            <div
              key={examId}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              {/* 2. Tampilkan Judul Keterangan Ujian di atas tabel */}
              <h4 className="text-sm font-semibold text-gray-800 bg-gray-50 p-3 border-b border-gray-200 rounded-t-lg flex items-center gap-2">
                <FaListUl className="text-blue-600" />
                {groupData.keterangan}
              </h4>

              {/* 3. Buat tabel HANYA untuk grup ini */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left table-fixed">
                  <thead className="bg-white text-gray-600 uppercase">
                    <tr>
                      {/* Kolom Keterangan Ujian HILANG dari sini */}
                      <th className="py-2 px-3 w-[40%] border-b border-gray-200">
                        Email
                      </th>
                      <th className="py-2 px-3 w-[20%] border-b border-gray-200">
                        Kode Login
                      </th>
                      <th className="py-2 px-3 w-[15%] border-b border-gray-200">
                        Batas
                      </th>
                      <th className="py-2 px-3 w-[25%] border-b border-gray-200">
                        Waktu Kirim
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* 4. Loop melalui daftar undangan di grup ini */}
                    {groupData.list.map((invite) => (
                      <tr key={invite.id} className="hover:bg-gray-50 align-top">

                        {/* Sel Email */}
                        <td
                          className="py-2 px-3 font-medium text-gray-800 whitespace-normal break-words"
                          title={invite.email}
                        >
                          {invite.email}
                        </td>

                        {/* Kolom Keterangan Ujian HILANG dari sini */}

                        {/* Sel Kode Login + Tombol Copy */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                              {invite.login_code}
                            </span>
                            <button
                              onClick={() => handleCopy(invite.login_code)}
                              className={`p-1 rounded ${copiedCode === invite.login_code
                                  ? "text-green-600"
                                  : "text-gray-400 hover:text-blue-600"
                                }`}
                              title={
                                copiedCode === invite.login_code
                                  ? "Tersalin!"
                                  : "Salin Kode"
                              }
                            >
                              {copiedCode === invite.login_code ? (
                                <FaCheck />
                              ) : (
                                <FaCopy />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Sel Batas Login */}
                        <td className="py-2 px-3 whitespace-nowrap text-gray-600">
                          <span
                            className={`font-semibold ${invite.login_count >= invite.max_logins
                                ? "text-red-500"
                                : "text-green-600"
                              }`}
                            title="Digunakan / Batas"
                          >
                            {invite.login_count} / {invite.max_logins}
                          </span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DaftarUndangan;