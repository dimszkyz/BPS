// File: src/admin/UbahPassword.jsx (LAYOUT WIDEN RIGHT PANEL)
import React, { useEffect, useState, useCallback } from "react";
import {
  FaKey,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaShieldAlt,
  FaLock,
} from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import PermintaanResetPassword from "./PermintaanResetPassword";

const API_URL = "http://localhost:5000";
const CHANGE_PW_ENDPOINT = "/api/admin/change-password";

const MemoizedMessage = ({ type, text, onDismiss }) => {
  if (!text) return null;
  const isSuccess = type === "success";
  const bgColor = isSuccess ? "bg-green-50" : "bg-red-50";
  const textColor = isSuccess ? "text-green-700" : "text-red-700";
  const borderColor = isSuccess ? "border-green-200" : "border-red-200";
  const Icon = isSuccess ? FaCheckCircle : FaExclamationTriangle;

  return (
    <div
      className={`flex items-start p-3 mb-5 text-sm border rounded-xl ${bgColor} ${textColor} ${borderColor}`}
      role="alert"
    >
      <Icon className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <span className="font-medium">{text}</span>
      </div>
      <button
        type="button"
        className={`ml-3 ${textColor} rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-black/5`}
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        title="Tutup"
      >
        <FaTimes />
      </button>
    </div>
  );
};

const strengthLabel = (s) => {
  switch (s) {
    case 0:
    case 1:
      return "Sangat lemah";
    case 2:
      return "Lemah";
    case 3:
      return "Cukup";
    case 4:
      return "Kuat";
    default:
      return "-";
  }
};

const calcStrength = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

const UbahPassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // ✅ cek role login
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const dismissMessage = useCallback(() => {
    setMsg({ type: "", text: "" });
  }, []);

  useEffect(() => {
    if (msg.text) {
      const t = setTimeout(dismissMessage, 4500);
      return () => clearTimeout(t);
    }
  }, [msg, dismissMessage]);

  // detect role dari adminData dulu, fallback ke JWT
  useEffect(() => {
    try {
      const adminDataRaw = sessionStorage.getItem("adminData");
      if (adminDataRaw) {
        const adminData = JSON.parse(adminDataRaw);
        const role = (adminData?.role || "").toLowerCase();
        setIsSuperadmin(role === "superadmin");
        return;
      }
      const token = sessionStorage.getItem("adminToken");
      if (token) {
        const decoded = jwtDecode(token);
        const role = (decoded?.role || "").toLowerCase();
        setIsSuperadmin(role === "superadmin");
      }
    } catch {
      setIsSuperadmin(false);
    }
  }, []);

  const pwLenError =
    newPassword && newPassword.length < 6
      ? "Password baru minimal 6 karakter."
      : "";
  const pwSameError =
    currentPassword && newPassword && currentPassword === newPassword
      ? "Password baru tidak boleh sama dengan password lama."
      : "";
  const pwMatchError =
    confirmNewPassword && newPassword !== confirmNewPassword
      ? "Konfirmasi password baru tidak sama."
      : "";

  const formIncomplete = !currentPassword || !newPassword || !confirmNewPassword;
  const pwStrength = calcStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dismissMessage();

    if (formIncomplete) {
      setMsg({ type: "error", text: "Semua field wajib diisi." });
      return;
    }
    if (pwLenError || pwSameError || pwMatchError) {
      setMsg({ type: "error", text: "Periksa kembali input password." });
      return;
    }

    const token = sessionStorage.getItem("adminToken");
    if (!token) {
      setMsg({
        type: "error",
        text: "Token admin tidak ditemukan. Silakan login ulang.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}${CHANGE_PW_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengubah password.");

      setMsg({
        type: "success",
        text: data.message || "Password berhasil diubah.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowCur(false);
      setShowNew(false);
      setShowConf(false);
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Terjadi kesalahan." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowCur(false);
    setShowNew(false);
    setShowConf(false);
    dismissMessage();
  };

  // ✅ container width beda sesuai role (superadmin lebih lebar)
  const containerClass = isSuperadmin
    ? "max-w-7xl mx-auto"
    : "max-w-2xl mx-auto";

  // ✅ FORM CARD (dipakai di admin & superadmin)
  const FormUbahPassword = (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-gray-50/60 flex items-center gap-2">
        <FaShieldAlt className="text-indigo-600" />
        <h2 className="text-base font-semibold text-gray-900">
          Form Ubah Password
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Password Lama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password Lama
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <FaLock />
            </span>
            <input
              type={showCur ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Masukkan password lama"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCur((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
              title={showCur ? "Sembunyikan" : "Tampilkan"}
            >
              {showCur ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        {/* Password Baru */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password Baru
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <FaKey />
            </span>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                pwLenError || pwSameError
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-300 focus:border-indigo-500"
              }`}
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
              title={showNew ? "Sembunyikan" : "Tampilkan"}
            >
              {showNew ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {!!pwLenError && (
            <p className="mt-1 text-xs text-red-600">{pwLenError}</p>
          )}
          {!!pwSameError && (
            <p className="mt-1 text-xs text-red-600">{pwSameError}</p>
          )}

          {/* Strength bar */}
          <div className="mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    pwStrength > i ? "bg-indigo-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Kekuatan: {strengthLabel(pwStrength)} • gunakan huruf besar, angka,
              dan simbol biar kuat.
            </p>
          </div>
        </div>

        {/* Konfirmasi Password Baru */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <FaKey />
            </span>
            <input
              type={showConf ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                pwMatchError
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-300 focus:border-indigo-500"
              }`}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConf((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
              title={showConf ? "Sembunyikan" : "Tampilkan"}
            >
              {showConf ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {!!pwMatchError && (
            <p className="mt-1 text-xs text-red-600">{pwMatchError}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={
              isSaving ||
              formIncomplete ||
              !!pwLenError ||
              !!pwSameError ||
              !!pwMatchError
            }
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaCheckCircle />
            )}
            {isSaving ? "Menyimpan..." : "Simpan Password Baru"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Reset
          </button>
        </div>

        {/* Hint */}
        <div className="mt-2 text-xs text-gray-500 flex items-start gap-2">
          <FaExclamationTriangle className="mt-0.5" />
          <p>
            Setelah password diubah, gunakan password baru saat login berikutnya.
          </p>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header Page */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-5 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <FaKey />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Ubah Password
            </h1>
            <p className="text-sm text-gray-600">
              Perbarui password akun anda untuk keamanan akses sistem.
            </p>
          </div>
        </div>
      </div>

      {/* Konten */}
      <div className="p-6">
        <div className={containerClass}>
          <MemoizedMessage {...msg} onDismiss={dismissMessage} />

          {/* ✅ Layout Superadmin: kanan lebih lebar */}
          {isSuperadmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* kiri: form */}
              <div className="lg:col-span-5 min-w-0">{FormUbahPassword}</div>

              {/* kanan: permintaan reset (lebih lebar) */}
              <div className="lg:col-span-7 min-w-0">
                <PermintaanResetPassword />
              </div>
            </div>
          ) : (
            /* ✅ Layout Admin biasa: form di tengah */
            <div className="flex justify-center">
              <div className="w-full">{FormUbahPassword}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UbahPassword;
