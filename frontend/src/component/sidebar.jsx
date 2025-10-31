import React, { useState, useEffect } from 'react'; // <-- IMPORT useState & useEffect
import { NavLink } from 'react-router-dom';
import {
  FaClipboardList,
  FaEdit,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaUserPlus,
  FaPoll,
  FaTrophy
} from 'react-icons/fa';

const Sidebar = () => {
  // --- [PERUBAHAN 1: TAMBAHKAN STATE] ---
  const [hasNewResult, setHasNewResult] = useState(false);
  
  // --- [PERUBAHAN 2: CEK LOCALSTORAGE SAAT KOMPONEN DIMUAT] ---
  useEffect(() => {
    // Cek apakah ada notifikasi hasil ujian baru
    const newResult = localStorage.getItem("newHasilUjian") === "true";
    if (newResult) {
      setHasNewResult(true);
    }
  }, []); // [] berarti efek ini hanya berjalan sekali saat komponen dimuat


  const getNavLinkClass = ({ isActive }) => {
    const baseClasses = "flex items-center space-x-3 py-2.5 px-4 rounded-md transition-colors duration-200 ease-in-out text-sm";
    const activeClasses = "bg-indigo-600 text-white font-medium shadow-sm";
    const inactiveClasses = "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700";
    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
  };

  // --- [PERUBAHAN 3: BUAT FUNGSI UNTUK MENGHAPUS NOTIFIKASI] ---
  const handleHasilUjianClick = () => {
    // Jika ada notifikasi baru, hapus
    if (hasNewResult) {
      localStorage.removeItem("newHasilUjian");
      setHasNewResult(false);
    }
    // Navigasi akan tetap dijalankan oleh NavLink
  };

  return (
    // Container Sidebar
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col shadow-md">

      {/* Logo / Judul Admin */}
      <div className="flex items-center space-x-3 px-4 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          A
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Admin Panel</h2>
      </div>

      {/* Menu Navigasi Utama */}
      <nav className="flex-grow space-y-4 pt-4 px-4 overflow-y-auto">

        {/* Dashboard */}
        <div>
          <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Utama
          </h3>
          <ul className="space-y-1">
            <li>
              <NavLink to="/admin/dashboard" className={getNavLinkClass}>
                <FaChartLine className="w-5 h-5" />
                <span>Dashboard</span>
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Grup Manajemen Soal */}
        <div>
          <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Manajemen Soal
          </h3>
          <ul className="space-y-1">
            <li>
              <NavLink to="/admin/tambah-soal" className={getNavLinkClass}>
                <FaEdit className="w-5 h-5" />
                <span>Tambah Soal</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/daftar-soal" className={getNavLinkClass}>
                <FaClipboardList className="w-5 h-5" />
                <span>Daftar Soal</span>
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Grup Manajemen pengguna */}
        <div>
          <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Manajemen Pengguna
          </h3>
          <ul className="space-y-1">
            <li>
              <NavLink to="/admin/tambah-peserta" className={getNavLinkClass}>
                <FaUserPlus className="w-5 h-5" />
                <span>Tambah & Daftar Peserta</span>
              </NavLink>
            </li>
            
            {/* --- [PERUBAHAN 4: MODIFIKASI LINK HASIL UJIAN] --- */}
            <li>
              <NavLink 
                to="/admin/hasil-ujian" 
                className={getNavLinkClass}
                onClick={handleHasilUjianClick} // Tambahkan onClick di sini
              >
                <FaPoll className="w-5 h-5" />
                
                <span>Hasil Ujian</span>
                
                {/* Titik Notifikasi */}
                {hasNewResult && (
                  <span 
                    className="w-2.5 h-2.5 bg-red-500 rounded-full ml-auto animate-pulse"
                    title="Ada hasil ujian baru"
                  ></span>
                )}
              </NavLink>
            </li>
            
          </ul>
        </div>

        {/* Grup Pengaturan (Contoh) */}
        <div>
          <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Sistem
          </h3>
          <ul className="space-y-1">
            <li>
              <NavLink to="/admin/pengaturan" className={getNavLinkClass}>
                <FaCog className="w-5 h-5" />
                <span>Pengaturan</span>
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Bagian Bawah Sidebar */}
      <div className="mt-auto bg-gray-50 border-t border-gray-200 p-4 space-y-3">
        {/* Info User */}
        <div className="flex items-center space-x-3 cursor-pointer group">
          <img
            className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-300 group-hover:ring-indigo-500 transition-all duration-150"
            src="https://via.placeholder.com/100" // Ganti dengan foto user
            alt="Profil"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate group-hover:text-indigo-700">Nama Admin</p>
            <p className="text-xs text-gray-500 truncate">admin@example.com</p>
          </div>
        </div>

        {/* Tombol Logout */}
        <button className="flex items-center space-x-3 w-full py-2.5 px-3 rounded-md text-sm text-gray-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-200 ease-in-out">
          <FaSignOutAlt className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;