// File: src/admin/DaftarUndangan.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaSyncAlt,
  FaExclamationCircle,
  FaCopy,
  FaCheck,
  FaHistory,
  FaListUl,
  FaTrashAlt,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

const DaftarUndangan = ({ refreshTrigger }) => {
  // --- STATE DATA ---
  const [allData, setAllData] = useState([]); // Menyimpan semua data mentah dari API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Ubah angka ini untuk mengatur jumlah baris per halaman

  // --- STATE DELETE ---
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(`${API_URL}/api/invite/list`, {
        headers: { Authorization: `Bearer ${token}` },
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
      
      // Simpan data mentah ke state
      setAllData(data);
      // Reset ke halaman 1 setiap kali fetch ulang
      setCurrentPage(1); 
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

  // --- LOGIKA PAGINATION & GROUPING ---
  const groupedInvitations = useMemo(() => {
    // 1. Hitung index potong data
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    // 2. Ambil data untuk halaman ini saja
    const currentItems = allData.slice(indexOfFirstItem, indexOfLastItem);

    // 3. Grouping data yang sudah dipotong berdasarkan Exam ID
    return currentItems.reduce((acc, invite) => {
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
  }, [allData, currentPage, itemsPerPage]);

  // Hitung total halaman
  const totalPages = Math.ceil(allData.length / itemsPerPage);

  // --- Handler Pagination ---
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleCopy = (loginCode) => {
    navigator.clipboard.writeText(loginCode).then(
      () => {
        setCopiedCode(loginCode);
        setTimeout(() => setCopiedCode(null), 1500);
      },
      (err) => alert("Gagal menyalin kode.")
    );
  };

  const onClickDelete = (id, email) => {
    setItemToDelete({ id, email });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const { id } = itemToDelete;
    setDeletingId(id);

    try {
      const token = sessionStorage.getItem("adminToken");
      const response = await fetch(`${API_URL}/api/invite/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Gagal membatalkan undangan.");

      // Refresh data (Fetch ulang agar data sinkron)
      fetchData();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

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
    <div className="w-full relative flex flex-col min-h-[400px]">
      {/* Header Section */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <FaHistory className="text-gray-500" /> Riwayat & Status Undangan
        </h3>
        <div className="flex items-center gap-3">
          {/* Dropdown Limit per Halaman */}
          <select 
            value={itemsPerPage}
            onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
            }}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-600 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={5}>5 / hal</option>
            <option value={10}>10 / hal</option>
            <option value={20}>20 / hal</option>
            <option value={50}>50 / hal</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 hover:text-blue-600 transition text-sm font-medium shadow-sm"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      <div className="p-6 flex-1">
        {loading && (
          <div className="text-center py-8 text-gray-500 flex flex-col items-center">
            <FaSyncAlt className="animate-spin mb-2 w-6 h-6 text-blue-500" />
            Memuat data riwayat...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200 flex items-center gap-2">
            <FaExclamationCircle className="text-lg" /> {error}
          </div>
        )}

        {!loading && !error && allData.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 font-medium">Belum ada undangan yang dikirim.</p>
            <p className="text-sm text-gray-400 mt-1">
              Kirim undangan melalui form di atas.
            </p>
          </div>
        )}

        {!loading && !error && Object.keys(groupedInvitations).length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedInvitations).map(([examId, groupData]) => (
              <div
                key={examId}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm animate-fade-in"
              >
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
                        <th className="py-3 px-4 w-[35%]">Email Peserta</th>
                        <th className="py-3 px-4 w-[20%]">Kode Login</th>
                        <th className="py-3 px-4 w-[15%] text-center">Batas</th>
                        <th className="py-3 px-4 w-[20%]">Waktu Kirim</th>
                        <th className="py-3 px-4 w-[10%] text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {groupData.list.map((invite) => (
                        <tr
                          key={invite.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4 text-gray-800 font-medium break-all align-middle">
                            {invite.email}
                          </td>
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-2 bg-gray-100 w-fit px-2 py-1 rounded border border-gray-200">
                              <span className="font-mono text-gray-700 tracking-wide select-all">
                                {invite.login_code}
                              </span>
                              <button
                                onClick={() => handleCopy(invite.login_code)}
                                className={`ml-1 ${
                                  copiedCode === invite.login_code
                                    ? "text-green-600"
                                    : "text-gray-400 hover:text-blue-600"
                                }`}
                                title="Salin Kode"
                              >
                                {copiedCode === invite.login_code ? (
                                  <FaCheck />
                                ) : (
                                  <FaCopy />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center align-middle">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                invite.login_count >= invite.max_logins
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {invite.login_count} / {invite.max_logins}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs align-middle">
                            {formatTanggal(invite.sent_at)}
                          </td>
                          <td className="py-3 px-4 text-center align-middle">
                            <button
                              onClick={() => onClickDelete(invite.id, invite.email)}
                              disabled={deletingId === invite.id}
                              className={`p-2 rounded-lg transition-all ${
                                deletingId === invite.id
                                  ? "bg-gray-100 text-gray-400 cursor-wait"
                                  : "bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 hover:shadow-sm"
                              }`}
                              title="Batalkan Undangan"
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

      {/* --- FOOTER: PAGINATION CONTROLS --- */}
      {!loading && !error && allData.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Info Text */}
            <div className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-semibold">{Math.min(currentPage * itemsPerPage, allData.length)}</span> dari <span className="font-semibold">{allData.length}</span> data
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-2">
                {/* TOMBOL SEBELUMNYA (Diperbarui sesuai HasilUjian.jsx) */}
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition"
                >
                    <FaChevronLeft /> Sebelumnya
                </button>

                {/* Page Numbers (Tetap dipertahankan, hanya style container) */}
                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                         let pageNum = i + 1;
                         if (totalPages > 5 && currentPage > 3) {
                             pageNum = currentPage - 3 + i;
                             if(pageNum > totalPages) return null; 
                         }
                         
                         return (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-md transition ${
                                    currentPage === pageNum
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* TOMBOL SELANJUTNYA (Diperbarui sesuai HasilUjian.jsx) */}
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition"
                >
                    Selanjutnya <FaChevronRight />
                </button>
            </div>
        </div>
      )}


      {/* MODAL DELETE */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center transform transition-all scale-100">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-yellow-100 mb-4">
              <FaExclamationTriangle className="text-yellow-500 text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Batalkan Undangan?
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed text-sm">
              Apakah Anda yakin ingin membatalkan undangan untuk <br />
              <span className="font-semibold text-gray-900">
                {itemToDelete.email}
              </span>
              ? <br />
              <span className="text-xs text-red-500 mt-1 block">
                (Peserta tidak akan bisa login lagi)
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition duration-200"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition duration-200 flex justify-center items-center gap-2"
              >
                {deletingId ? (
                  <FaSyncAlt className="animate-spin" />
                ) : (
                  <>
                    <FaTrashAlt className="text-sm" /> Ya, Batalkan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DaftarUndangan;