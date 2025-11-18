// File: src/page/LoginAdmin.jsx (Tanpa Efek Blur & Overlay)
import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserShield, FaKey, FaSignInAlt, FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import ReCAPTCHA from "react-google-recaptcha";
import Header from "../component/header";

const API_URL = "http://localhost:5000";
const SITE_KEY = "6LfRKwwsAAAAAE-gjwO95HkRq62ke8WCGxs0P_Fh";
const defaultBgAdmin = "bg-gray-50";

const LoginAdmin = () => {
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [bgUrl, setBgUrl] = useState("");
  const [bgLoading, setBgLoading] = useState(true);

  useEffect(() => {
    const fetchBgSetting = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings`);
        const data = await res.json();
        if (data.adminBgImage) {
          setBgUrl(`${API_URL}${data.adminBgImage}`);
        }
      } catch (err) {
        console.error("Gagal memuat BG Admin:", err);
      } finally {
        setBgLoading(false);
      }
    };
    fetchBgSetting();
  }, [API_URL]); // Menggunakan konstanta API_URL sebagai dependensi

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrMsg("");

    if (!username || !password) {
      setErrMsg("Username/Email dan Password wajib diisi.");
      return;
    }
    if (!captcha) {
      setErrMsg("Verifikasi captcha terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, captcha }),
      });

      let data = {};
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Respons bukan JSON valid:", text);
          setErrMsg("Terjadi kesalahan parsing respons.");
          setLoading(false); // <-- Diperlukan di sini jika parsing gagal
          if (recaptchaRef.current) {
            recaptchaRef.current.reset();
          }
          setCaptcha(null);
          return;
        }
      }

      if (!res.ok) throw new Error(data.message || "Gagal login.");

      // Sukses: Simpan ke sessionStorage dan navigasi
      sessionStorage.setItem("adminToken", data.token);
      sessionStorage.setItem("adminData", JSON.stringify(data.admin));
      navigate("/admin/dashboard");

      // JANGAN set loading false di sini, biarkan komponen unmount
      
    } catch (err) {
      // Gagal: Tangani error, reset captcha, DAN set loading false
      console.error(err);
      setErrMsg(err.message || "Terjadi kesalahan saat login.");
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setCaptcha(null);
      setLoading(false); // <-- PINDAHKAN KE SINI
    } 
    // HAPUS BLOK 'finally' DARI SINI
  };

  const bgStyle = bgUrl ? { backgroundImage: `url(${bgUrl})` } : {};
  const bgClass = bgUrl ? "bg-cover bg-center" : defaultBgAdmin;

  if (bgLoading) {
    return (
      <div className={`min-h-screen ${defaultBgAdmin} flex items-center justify-center`}>
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-gray-800 flex flex-col ${bgClass}`} style={bgStyle}>
      <Header />
      <div className={`flex-1 flex items-center justify-center px-4`}>
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl border border-gray-200 p-7">

          <div className="flex items-center gap-3 mb-2">
            <FaUserShield className="text-2xl text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Admin Panel Login</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Halaman ini khusus untuk administrator.
          </p>

          {errMsg && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-300 rounded-md p-3">
              {errMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* USERNAME */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username atau Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FaUserShield />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border bg-white border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  placeholder="Masukan username atau email"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FaKey />
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border bg-white border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  placeholder="Masukan password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* CAPTCHA */}
            <div className="scale-90 origin-left">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={SITE_KEY}
                onChange={(val) => setCaptcha(val)}
              />
            </div>

            {/* TOMBOL LOGIN */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-semibold shadow transition ${loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaSignInAlt />}
              {loading ? "Memverifikasi..." : "Login"}
            </button>
          </form>
        </div>
      </div>

      {/* FOOTER */}
      <footer className={`w-full mt-8 border-t border-gray-200 ${bgUrl ? 'bg-white/80' : 'bg-white'} py-3`}>
        <div className="max-w-7xl mx-auto text-center text-[12px] text-gray-500">
          © {new Date().getFullYear()} BPS Kota Salatiga. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LoginAdmin;