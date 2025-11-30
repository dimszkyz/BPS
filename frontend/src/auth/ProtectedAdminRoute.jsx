import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // Pastikan library ini terinstal

const ProtectedAdminRoute = ({ children }) => {
  const token = sessionStorage.getItem("adminToken");

  // 1. Cek apakah token ada
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    // 2. Cek apakah token sudah expired
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      // Jika expired, hapus sesi dan lempar ke login
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminData");
      return <Navigate to="/admin/login" replace />;
    }
  } catch (error) {
    // Jika token rusak/invalid
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminData");
    return <Navigate to="/admin/login" replace />;
  }

  // Jika aman, tampilkan halaman
  return children;
};

export default ProtectedAdminRoute;