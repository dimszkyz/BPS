// src/page/LoginPeserta.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaKey, FaSignInAlt } from "react-icons/fa";

const API_URL = "http://localhost:5000";

const LoginPeserta = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [examId, setExamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const validate = () => {
    if (!email.trim() || !examId.trim()) {
      setErrMsg("Email dan ID Ujian wajib diisi.");
      return false;
    }
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!okEmail) {
      setErrMsg("Format email tidak valid.");
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrMsg("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/invite/list`);
      const list = await res.json();
      if (!res.ok) throw new Error(list.message || "Gagal memuat daftar undangan.");

      const emailLower = email.trim().toLowerCase();
      const codeUpper = examId.trim().toUpperCase();

      const found = Array.isArray(list)
        ? list.find(
            (row) =>
              String(row.email || "").toLowerCase() === emailLower &&
              String(row.exam_id || "").toUpperCase() === codeUpper
          )
        : null;

      if (!found) {
        setErrMsg(
          "Kredensial tidak cocok. Pastikan Email & ID Ujian sesuai undangan dari admin."
        );
        return;
      }

      localStorage.setItem(
        "loginPeserta",
        JSON.stringify({
          email: emailLower,
          examId: codeUpper,
          loginAt: new Date().toISOString(),
        })
      );

      navigate("/peserta");
    } catch (err) {
      console.error(err);
      setErrMsg(err.message || "Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* MAIN (card center) */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl border border-gray-200 p-7">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Login Peserta</h1>
          <p className="text-sm text-gray-500 mb-6">
            Masukkan Email dan ID Ujian yang Anda terima dari admin.
          </p>

          {errMsg && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
              {errMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FaEnvelope />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  placeholder="Masukan Email Terdaftar"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* ID Ujian */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Ujian
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FaKey />
                </span>
                <input
                  type="text"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  placeholder="Masukan ID Ujian Terdaftar"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ID Ujian adalah kode acak (6 karakter) yang dikirim lewat email undangan admin.
              </p>
            </div>

            {/* Tombol Login */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-semibold shadow
              ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              <FaSignInAlt />
              {loading ? "Memverifikasi..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-xs text-gray-500">
            Lupa ID Ujian? Hubungi admin untuk mengirim ulang undangan.
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full mt-8 border-t border-gray-200 bg-white py-3">
        <div className="max-w-7xl mx-auto text-center text-[12px] text-gray-500">
          © {new Date().getFullYear()} BPS Kota Salatiga. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LoginPeserta;
