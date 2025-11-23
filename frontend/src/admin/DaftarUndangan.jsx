// File: src/admin/DaftarUndangan.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  FaSyncAlt,
  FaExclamationCircle,
  FaCopy,
  FaCheck,
  FaHistory,
  FaListUl,
  FaTrashAlt,
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

const DaftarUndangan = ({ refreshTrigger }) => {
  const [groupedInvitations, setGroupedInvitations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // --- Fetch Data ---
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
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();

      // Grouping by Exam ID
      const grouped = data.reduce((acc, invite) => {
        const examId = invite.exam_id || "unknown";
        if (!acc[examId]) {
          acc[examId] = {
            keterangan: invite.keterangan_ujian || `Ujian (ID: ${examId})`,
            list: [],
          };
        }
        acc[examId].list.push(invite);
        return acc;
      }, {});

      setGroupedInvitations(grouped);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // --- Copy Code Handler ---
  const handleCopy = (loginCode) => {
    navigator.clipboard.writeText(loginCode).then(
      () => {
        setCopiedCode(loginCode);
        setTimeout(() => setCopiedCode(null), 1500);
      },
      (err) => alert("Gagal menyalin kode.")
    );
  };

  // --- Cancel/Delete Handler ---
  const handleCancelInvitation = async (invitationId, email) => {
    if (!window.confirm(`Batalkan undangan untuk ${email}? \nPeserta tidak akan bisa login lagi.`)) {
      return;
    }
    setDeletingId(invitationId);
    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(`${API_URL}/api/invite/${invitationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Gagal membatalkan undangan.");
      
      // Refresh data setelah hapus berhasil
      fetchData();
    } catch (err) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Date Formatter ---
  const formatTanggal = (isoString) => {
    try {
      return new Date(isoString).toLocaleString("id-ID", {
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
    <div className="w-full">
      {/* Header Section Riwayat */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <FaHistory className="text-gray-500" /> Riwayat & Status Undangan
        </h3>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 hover:text-blue-600 transition text-sm font-medium shadow-sm"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} /> 
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

      <div className="p-6">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-8 text-gray-500 flex flex-col items-center">
            <FaSyncAlt className="animate-spin mb-2 w-6 h-6 text-blue-500" />
            Memuat data riwayat...
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200 flex items-center gap-2">
            <FaExclamationCircle className="text-lg" /> {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && Object.keys(groupedInvitations).length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 font-medium">Belum ada undangan yang dikirim.</p>
            <p className="text-sm text-gray-400 mt-1">Kirim undangan melalui form di atas.</p>
          </div>
        )}

        {/* Data Render */}
        {!loading && !error && Object.keys(groupedInvitations).length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedInvitations).map(([examId, groupData]) => (
              <div key={examId} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {/* Group Header */}
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                  <FaListUl className="text-blue-600" />
                  <h4 className="font-semibold text-blue-800 text-sm md:text-base">
                    {groupData.keterangan}
                  </h4>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider font-semibold">
                      <tr>
                        {/* Lebar kolom diatur agar tombol aksi tidak terhimpit */}
                        <th className="py-3 px-4 w-[35%]">Email Peserta</th>
                        <th className="py-3 px-4 w-[20%]">Kode Login</th>
                        <th className="py-3 px-4 w-[15%] text-center">Batas</th>
                        <th className="py-3 px-4 w-[20%]">Waktu Kirim</th>
                        <th className="py-3 px-4 w-[10%] text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {groupData.list.map((invite) => (
                        <tr key={invite.id} className="hover:bg-gray-50 transition-colors">
                          
                          {/* Email - Gunakan break-all agar email panjang turun ke bawah */}
                          <td className="py-3 px-4 text-gray-800 font-medium break-all align-middle">
                            {invite.email}
                          </td>

                          {/* Kode Login + Copy */}
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-2 bg-gray-100 w-fit px-2 py-1 rounded border border-gray-200">
                              <span className="font-mono text-gray-700 tracking-wide select-all">
                                {invite.login_code}
                              </span>
                              <button
                                onClick={() => handleCopy(invite.login_code)}
                                className={`ml-1 ${copiedCode === invite.login_code ? "text-green-600" : "text-gray-400 hover:text-blue-600"}`}
                                title="Salin Kode"
                              >
                                {copiedCode === invite.login_code ? <FaCheck/> : <FaCopy/>}
                              </button>
                            </div>
                          </td>

                          {/* Status Batas Login */}
                          <td className="py-3 px-4 text-center align-middle">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                invite.login_count >= invite.max_logins
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}>
                              {invite.login_count} / {invite.max_logins}
                            </span>
                          </td>

                          {/* Waktu Kirim */}
                          <td className="py-3 px-4 text-gray-500 text-xs align-middle">
                            {formatTanggal(invite.sent_at)}
                          </td>

                          {/* Tombol Hapus / Batalkan */}
                          <td className="py-3 px-4 text-center align-middle">
                            <button
                              onClick={() => handleCancelInvitation(invite.id, invite.email)}
                              disabled={deletingId === invite.id}
                              className={`p-2 rounded-lg transition-all ${
                                deletingId === invite.id 
                                ? "bg-gray-100 text-gray-400 cursor-wait" 
                                : "bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 hover:shadow-sm"
                              }`}
                              title="Batalkan Undangan & Hapus Akses"
                            >
                              {deletingId === invite.id ? (
                                <FaSyncAlt className="animate-spin w-4 h-4" />
                              ) : (
                                <FaTrashAlt className="w-4 h-4" />
                              )}
                            </button>
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
    </div>
  );
};

export default DaftarUndangan;