// File: src/component/sidebar.jsx
import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  FaClipboardList,
  FaEdit,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaUserPlus,
  FaPoll,
  FaExclamationTriangle,
  FaSpinner,
  FaUserShield,
  FaKey,
  FaBars,
  FaTimes,          // <-- TAMBAHAN
} from "react-icons/fa";
import { jwtDecode } from "jwt-decode";

const API_URL = "http://localhost:5000";

const Sidebar = () => {
  const [hasNewResult, setHasNewResult] = useState(false);
  const [adminData, setAdminData] = useState({
    username: "",
    email: "",
    role: "admin",
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // drawer mobile

  // --- LOGIC AUTHENTICATION ---
  const forceLogout = () => {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminData");
    sessionStorage.removeItem("newHasilUjian");
    window.location.href = "/admin/login";
  };

  useEffect(() => {
    const token = sessionStorage.getItem("adminToken");
    if (!token) {
      forceLogout();
      return;
    }

    try {
      const storedAdmin = JSON.parse(
        sessionStorage.getItem("adminData") || "{}"
      );
      setAdminData({
        username: storedAdmin.username || "Nama Admin",
        email: storedAdmin.email || "admin@example.com",
        role: storedAdmin.role || "admin",
      });

      const newResult = sessionStorage.getItem("newHasilUjian") === "true";
      if (newResult) setHasNewResult(true);
    } catch (error) {
      console.error("Data admin error:", error);
    }

    const checkTokenValidity = () => {
      const currentToken = sessionStorage.getItem("adminToken");
      if (!currentToken) {
        forceLogout();
        return;
      }
      try {
        const decodedToken = jwtDecode(currentToken);
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp < currentTime) {
          forceLogout();
        }
      } catch (error) {
        forceLogout();
      }
    };

    const pingActiveStatus = async () => {
      const currentToken = sessionStorage.getItem("adminToken");
      if (!currentToken) return;

      // --- TAMBAHAN: Cek validitas waktu SEBELUM melakukan fetch ---
      try {
        const decoded = jwtDecode(currentToken);
        if (decoded.exp * 1000 < Date.now() + 5000) {
          return; 
        }
      } catch (e) {
        return; 
      }

      try {
        await fetch(`${API_URL}/api/admin/ping`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch (error) {
        console.error("Ping error:", error);
      }
    };

    checkTokenValidity();
    pingActiveStatus();

    const tokenIntervalId = setInterval(checkTokenValidity, 5000);
    const pingIntervalId = setInterval(pingActiveStatus, 15000);

    return () => {
      clearInterval(tokenIntervalId);
      clearInterval(pingIntervalId);
    };
  }, []);

  const getNavLinkClass = ({ isActive }) => {
    const baseClasses =
      "flex items-center space-x-3 py-2.5 px-4 rounded-md transition-colors duration-200 ease-in-out text-sm";
    const activeClasses = "bg-indigo-600 text-white font-medium shadow-sm";
    const inactiveClasses =
      "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700";
    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
  };

  const handleHasilUjianClick = () => {
    if (hasNewResult) {
      sessionStorage.removeItem("newHasilUjian");
      setHasNewResult(false);
    }
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      forceLogout();
    }, 1200);
  };

  const getInitial = (name = "") => {
    const t = (name || "").trim();
    return t ? t[0].toUpperCase() : "A";
  };

  const renderSidebarBody = () => (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col shadow-md">
      {/* Header Sidebar */}
      <div className="flex items-center space-x-3 px-4 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          A
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Admin Panel</h2>
      </div>

      {/* Menu Navigasi */}
      <nav className="flex-grow space-y-4 pt-4 px-4 overflow-y-auto">
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

        <div>
          <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Manajemen Ujian
          </h3>
          <ul className="space-y-1">
            <li>
              <NavLink to="/admin/tambah-soal" className={getNavLinkClass}>
                <FaEdit className="w-5 h-5" />
                <span>Tambah Ujian</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/daftar-soal" className={getNavLinkClass}>
                <FaClipboardList className="w-5 h-5" />
                <span>Daftar Ujian</span>
              </NavLink>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Manajemen Pengguna
          </h3>
          <ul className="space-y-1">
            <li>
              <NavLink to="/admin/tambah-peserta" className={getNavLinkClass}>
                <FaUserPlus className="w-5 h-5" />
                <span>Undang &amp; Daftar Peserta</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/hasil-ujian"
                className={getNavLinkClass}
                onClick={handleHasilUjianClick}
              >
                <FaPoll className="w-5 h-5" />
                <span>Hasil Ujian</span>
                {hasNewResult && (
                  <span
                    className="w-2.5 h-2.5 bg-red-500 rounded-full ml-auto animate-pulse"
                    title="Ada hasil ujian baru"
                  />
                )}
              </NavLink>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Sistem
          </h3>
          <ul className="space-y-1">
            {adminData.role === "superadmin" && (
              <>
                <li>
                  <NavLink
                    to="/admin/daftar-admin"
                    className={getNavLinkClass}
                  >
                    <FaUserShield className="w-5 h-5" />
                    <span>Monitoring Admin</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/tambah-admin"
                    className={getNavLinkClass}
                  >
                    <FaUserPlus className="w-5 h-5" />
                    <span>Kelola Admin</span>
                  </NavLink>
                </li>
              </>
            )}
            <li>
              <NavLink to="/admin/ubah-password" className={getNavLinkClass}>
                <FaKey className="w-5 h-5" />
                <span>Ubah Password</span>
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer Sidebar */}
      <div className="mt-auto bg-gray-50 border-t border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-3">
          {adminData.role !== "superadmin" && (
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm ring-1 ring-indigo-700/60">
              {getInitial(adminData.username)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate">
              {adminData.username}
            </p>
            <p className="text-xs text-gray-500 truncate">{adminData.email}</p>
          </div>
          {adminData.role === "superadmin" && (
            <NavLink
              to="/admin/pengaturan"
              className="p-2 rounded-lg text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 transition"
            >
              <FaCog className="w-5 h-5" />
            </NavLink>
          )}
        </div>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center space-x-3 w-full py-2.5 px-3 rounded-md text-sm text-gray-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-200 ease-in-out"
        >
          <FaSignOutAlt className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className={`
    md:hidden fixed top-3 left-3 z-[90]
    flex items-center justify-center
    w-9 h-9 text-gray-700
    transition-all duration-300 transform focus:outline-none
    ${isSidebarOpen
            // SAAT SIDEBAR TERBUKA → X DI DALAM KOTAK PUTIH
            ? "rounded-lg bg-white/90 shadow-sm hover:bg-gray-100 translate-x-64"
            // SAAT SIDEBAR TERTUTUP → HANYA GARIS 3 TANPA KOTAK
            : "bg-transparent shadow-none translate-x-0"
          }
  `}
        aria-label={isSidebarOpen ? "Tutup menu" : "Buka menu"}
      >
        {isSidebarOpen ? (
          <FaTimes className="w-5 h-5" />
        ) : (
          <FaBars className="w-5 h-5" />
        )}
      </button>


      {/* DESKTOP: sidebar penuh */}
      <div className="hidden md:flex h-screen sticky top-0">
        {renderSidebarBody()}
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      <div
        className={`fixed inset-0 z-[70] md:hidden transition-all duration-300 ${isSidebarOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute left-0 top-0 bottom-0 transform transition-transform duration-300 shadow-2xl ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          {renderSidebarBody()}
        </div>
      </div>

      {/* Modal Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 md:p-8">
            <div className="flex justify-center mb-4">
              <FaExclamationTriangle className="text-6xl text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-3">
              Logout dari akun?
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Apakah yakin <b>{adminData.username}</b> ingin logout dari sistem
              ini?
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoggingOut ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Keluar...</span>
                  </>
                ) : (
                  <>
                    <FaSignOutAlt />
                    <span>Ya, Logout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
