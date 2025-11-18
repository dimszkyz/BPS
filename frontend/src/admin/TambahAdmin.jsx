// File: src/admin/TambahAdmin.jsx (DIPERBARUI – UI LEBIH MODERN)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaUserPlus,
  FaUser,
  FaEnvelope,
  FaKey,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaSearch,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaClipboardList,
} from "react-icons/fa";

const API_URL = "http://localhost:5000";

/** Komponen notifikasi (success / error) */
const MemoizedMessage = ({ type, text, onDismiss }) => {
  if (!text) return null;
  const isSuccess = type === "success";
  const bgColor = isSuccess ? "bg-green-50" : "bg-red-50";
  const textColor = isSuccess ? "text-green-700" : "text-red-700";
  const borderColor = isSuccess ? "border-green-200" : "border-red-200";
  const Icon = isSuccess ? FaCheckCircle : FaExclamationTriangle;

  return (
    <div
      className={`flex items-start p-3 mb-4 text-sm border rounded-xl ${bgColor} ${textColor} ${borderColor}`}
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

const formatTanggal = (iso) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const RoleBadge = ({ role }) => {
  const c =
    role === "superadmin"
      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
      : "bg-emerald-100 text-emerald-700 border-emerald-200";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs border ${c}`}>
      {role || "admin"}
    </span>
  );
};

const StickyHeader = ({ children }) => (
  <thead className="bg-indigo-50 text-gray-700 sticky top-0 z-10">
    {children}
  </thead>
);

const TambahAdmin = () => {
  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Data
  const [adminList, setAdminList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Tabel helpers
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Dismiss notif
  const dismissMessage = useCallback(() => {
    setMsg({ type: "", text: "" });
  }, []);

  useEffect(() => {
    if (msg.text) {
      const t = setTimeout(dismissMessage, 4500);
      return () => clearTimeout(t);
    }
  }, [msg, dismissMessage]);

  // Fetch data admin
  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    const token = sessionStorage.getItem("adminToken");
    try {
      const res = await fetch(`${API_URL}/api/admin/invite-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setAdminList(data);
      }
    } catch (e) {
      console.error("Gagal memuat riwayat admin:", e);
      setMsg({ type: "error", text: "Gagal memuat riwayat admin." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Validasi ringan
  const emailError =
    email && !/\S+@\S+\.\S+/.test(email) ? "Format email tidak valid." : "";
  const pwMatchError =
    confirmPassword && password !== confirmPassword
      ? "Konfirmasi tidak sama."
      : "";
  const pwLenError =
    password && password.length < 6 ? "Minimal 6 karakter." : "";
  const formIncomplete =
    !username.trim() || !email.trim() || !password || !confirmPassword;

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    dismissMessage();

    if (formIncomplete) {
      setMsg({ type: "error", text: "Semua field wajib diisi." });
      return;
    }
    if (emailError) {
      setMsg({ type: "error", text: emailError });
      return;
    }
    if (pwLenError) {
      setMsg({ type: "error", text: pwLenError });
      return;
    }
    if (pwMatchError) {
      setMsg({ type: "error", text: "Password dan konfirmasi tidak cocok." });
      return;
    }

    setIsSaving(true);
    const token = sessionStorage.getItem("adminToken");

    try {
      const res = await fetch(`${API_URL}/api/admin/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal menambah admin.");
      }

      setMsg({ type: "success", text: "Admin baru berhasil ditambahkan!" });
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPw(false);
      setShowPw2(false);
      await fetchAdmins();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Terjadi kesalahan." });
    } finally {
      setIsSaving(false);
    }
  };

  // Derive data tabel
  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = adminList;
    if (q) {
      list = list.filter((a) => {
        const hay = `${a.username || ""} ${a.email || ""} ${a.role || ""} ${
          a.invited_by || ""
        }`.toLowerCase();
        return hay.includes(q);
      });
    }
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va =
        sortBy === "created_at"
          ? new Date(a[sortBy] || 0).getTime()
          : (a[sortBy] || "").toString().toLowerCase();
      const vb =
        sortBy === "created_at"
          ? new Date(b[sortBy] || 0).getTime()
          : (b[sortBy] || "").toString().toLowerCase();

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return list;
  }, [adminList, query, sortBy, sortDir]);

  const total = processed.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const startIdx = (pageSafe - 1) * pageSize;
  const pageRows = processed.slice(startIdx, startIdx + pageSize);

  useEffect(() => {
    // reset ke halaman 1 saat filter/sort berubah
    setPage(1);
  }, [query, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key) => {
    if (sortBy !== key) return <FaSort className="inline-block ml-1" />;
    return sortDir === "asc" ? (
      <FaSortUp className="inline-block ml-1" />
    ) : (
      <FaSortDown className="inline-block ml-1" />
    );
  };

  const pwStrength = calcStrength(password);

  return (
    <div className="min-h-[560px]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold">
          <FaShieldAlt />
          <span>Manajemen Admin</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mt-1">
          Tambah Admin Baru
        </h2>
        <p className="text-sm text-gray-600">
          Buat akun administrator untuk mengelola sistem.
        </p>
      </div>

      <MemoizedMessage {...msg} onDismiss={dismissMessage} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Kartu Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaUser />
                  </span>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Username unik"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaEnvelope />
                  </span>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      emailError
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-indigo-500"
                    }`}
                    placeholder="admin@contoh.com"
                    autoComplete="off"
                  />
                </div>
                {!!emailError && (
                  <p className="mt-1 text-xs text-red-600">{emailError}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaKey />
                  </span>
                  <input
                    type={showPw ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      pwLenError
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-indigo-500"
                    }`}
                    placeholder="Minimal 6 karakter (lebih baik 8+)"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                    title={showPw ? "Sembunyikan" : "Tampilkan"}
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {!!pwLenError && (
                  <p className="mt-1 text-xs text-red-600">{pwLenError}</p>
                )}

                {/* Indikator kekuatan password */}
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
                    Kekuatan: {strengthLabel(pwStrength)}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FaKey />
                  </span>
                  <input
                    type={showPw2 ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      pwMatchError
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-indigo-500"
                    }`}
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                    title={showPw2 ? "Sembunyikan" : "Tampilkan"}
                    aria-label="Toggle password visibility"
                  >
                    {showPw2 ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {!!pwMatchError && (
                  <p className="mt-1 text-xs text-red-600">{pwMatchError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    formIncomplete ||
                    !!emailError ||
                    !!pwLenError ||
                    !!pwMatchError
                  }
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaUserPlus />
                  )}
                  {isSaving ? "Menyimpan..." : "Tambah Admin"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername("");
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                    setShowPw(false);
                    setShowPw2(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Kartu Tabel */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="relative w-full sm:max-w-xs">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari username / email / role…"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                Total:{" "}
                <span className="font-semibold text-gray-800">{total}</span>{" "}
                akun
              </div>
            </div>

            <div className="overflow-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm text-left">
                <StickyHeader>
                  <tr className="text-gray-700">
                    <th className="p-3 min-w-[160px]">
                      <button
                        type="button"
                        onClick={() => toggleSort("username")}
                        className="inline-flex items-center gap-1 hover:text-indigo-600"
                        title="Urutkan"
                      >
                        Username {sortIcon("username")}
                      </button>
                    </th>
                    <th className="p-3 min-w-[220px]">
                      <button
                        type="button"
                        onClick={() => toggleSort("email")}
                        className="inline-flex items-center gap-1 hover:text-indigo-600"
                        title="Urutkan"
                      >
                        Email {sortIcon("email")}
                      </button>
                    </th>
                    <th className="p-3 min-w-[110px]">Role</th>
                    <th className="p-3 min-w-[160px]">
                      <button
                        type="button"
                        onClick={() => toggleSort("invited_by")}
                        className="inline-flex items-center gap-1 hover:text-indigo-600"
                        title="Urutkan"
                      >
                        Dibuat Oleh {sortIcon("invited_by")}
                      </button>
                    </th>
                    <th className="p-3 min-w-[170px]">
                      <button
                        type="button"
                        onClick={() => toggleSort("created_at")}
                        className="inline-flex items-center gap-1 hover:text-indigo-600"
                        title="Urutkan"
                      >
                        Tanggal {sortIcon("created_at")}
                      </button>
                    </th>
                  </tr>
                </StickyHeader>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-3">
                          <div className="h-3 w-28 bg-gray-200 rounded" />
                        </td>
                        <td className="p-3">
                          <div className="h-3 w-40 bg-gray-200 rounded" />
                        </td>
                        <td className="p-3">
                          <div className="h-3 w-16 bg-gray-200 rounded" />
                        </td>
                        <td className="p-3">
                          <div className="h-3 w-24 bg-gray-200 rounded" />
                        </td>
                        <td className="p-3">
                          <div className="h-3 w-32 bg-gray-200 rounded" />
                        </td>
                      </tr>
                    ))
                  ) : pageRows.length > 0 ? (
                    pageRows.map((a) => (
                      <tr
                        key={a.id}
                        className="border-t border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-indigo-50/40 transition-colors"
                      >
                        <td className="p-3 font-medium text-gray-800">
                          {a.username}
                        </td>
                        <td className="p-3 text-gray-700">{a.email}</td>
                        <td className="p-3">
                          <RoleBadge role={(a.role || "").toLowerCase()} />
                        </td>
                        <td className="p-3 text-gray-700">
                          {a.invited_by || "-"}
                        </td>
                        <td className="p-3 text-gray-600">
                          {formatTanggal(a.created_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-600">
                          <FaClipboardList className="text-2xl" />
                          <p className="text-sm">
                            Belum ada data admin yang cocok.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="text-xs text-gray-500">
                Menampilkan{" "}
                <span className="font-semibold text-gray-700">
                  {total === 0 ? 0 : startIdx + 1}–
                  {Math.min(startIdx + pageSize, total)}
                </span>{" "}
                dari <span className="font-semibold">{total}</span> data
              </div>
             <div className="flex items-center gap-2">
  <button
    type="button"
    onClick={() => setPage((p) => Math.max(1, p - 1))}
    disabled={pageSafe === 1}
    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
  >
    Prev
  </button>
  <span className="text-sm text-gray-700">
    {pageSafe} / {totalPages}
  </span>
  <button
    type="button"
    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
    disabled={pageSafe === totalPages}
    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
  >
    Next
  </button>
</div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TambahAdmin;
