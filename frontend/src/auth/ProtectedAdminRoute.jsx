import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedAdminRoute = ({ children }) => {
  const token = sessionStorage.getItem("adminToken");

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    // DEBUG: Lihat hasil ini di Console Browser (F12)
    // console.log("Auth Check:", {
    //   exp: decoded.exp,
    //   now: currentTime,
    //   sisa: decoded.exp - currentTime
    // });

    // BUFFER: Anggap expired jika sisa waktu kurang dari 10 detik
    // Ini mencegah request dikirim saat token "hampir mati" di tengah jalan
    if (decoded.exp < (currentTime + 10)) {
      console.warn("Token expired atau sisa waktu terlalu sedikit. Logout...");
      sessionStorage.clear();
      return <Navigate to="/admin/login" replace />;
    }

  } catch (error) {
    console.error("Token rusak:", error);
    sessionStorage.clear();
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;