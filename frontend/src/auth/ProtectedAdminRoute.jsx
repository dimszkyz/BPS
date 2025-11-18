// File: src/auth/ProtectedAdminRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedAdminRoute = ({ children }) => {
  // UBAH DI SINI: Gunakan sessionStorage, bukan localStorage
  const token = sessionStorage.getItem("adminToken");

  // Jika tidak ada token, redirect ke login admin
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // Jika ada token, tampilkan halaman
  return children;
};

export default ProtectedAdminRoute;