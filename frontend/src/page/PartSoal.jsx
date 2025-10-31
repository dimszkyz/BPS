import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaClock, FaCheckCircle, FaRegCircle } from "react-icons/fa";

const API_URL = "http://localhost:5000";

// --- FUNGSI SHUFFLE (TIDAK BERUBAH) ---
const shuffleArray = (array) => {
  let currentIndex = array.length,
    randomIndex;
  const newArray = [...array];
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex],
      newArray[currentIndex],
    ];
  }
  return newArray;
};

// --- KOMPONEN StatusUjianBox (TIDAK BERUBAH DARI VERSI SEBELUMNYA) ---
const StatusUjianBox = ({
  totalSoal,
  jumlahTerjawab,
  timerDisplay,
  soalList,
  jawabanUser,
  raguRagu,
  currentIndex,
  onNavClick,
  onSubmit,
}) => {
  const getStatusSoal = (idx) => {
    const soalId = soalList[idx]?.id;
    if (!soalId) return "belum";
    if (raguRagu[soalId]) return "ragu";
    if (jawabanUser[soalId] && jawabanUser[soalId] !== "") return "jawab";
    return "belum";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Status Ujian
      </h3>
      <div className="mt-4 space-y-2 text-sm text-gray-700">
        <p>
          Soal dikerjakan:{" "}
          <span className="font-bold text-gray-900">
            {jumlahTerjawab} / {totalSoal}
          </span>
        </p>
        <p>
          Waktu tersisa:{" "}
          <span className="font-bold text-blue-600">{timerDisplay}</span>
        </p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-blue-700"></span>
          <span>Aktif</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-green-500 border border-green-600"></span>
          <span>Sudah jawab</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-500"></span>
          <span>Ragu</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-gray-100 border border-gray-300"></span>
          <span>Belum</span>
        </div>
      </div>
      <div className="mt-5 pt-5 border-t border-gray-200">
        <div className="flex flex-wrap gap-2.5">
          {soalList.map((_, idx) => {
            const status = getStatusSoal(idx);
            const isActive = currentIndex === idx;
            let baseClasses =
              "w-9 h-9 flex items-center justify-center rounded-md text-sm font-semibold cursor-pointer transition";
            if (isActive) {
              baseClasses += " bg-blue-600 text-white ring-2 ring-blue-300";
            } else if (status === "ragu") {
              baseClasses +=
                " bg-yellow-400 text-yellow-900 hover:bg-yellow-500";
            } else if (status === "jawab") {
              baseClasses += " bg-green-500 text-white hover:bg-green-600";
            } else {
              baseClasses +=
                " bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200";
            }
            return (
              <button
                key={idx}
                className={baseClasses}
                onClick={() => onNavClick(idx)}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-6">
        <button
          onClick={onSubmit}
          className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold px-4 py-3 rounded-lg"
        >
          Kumpulkan Jawaban
        </button>
      </div>
    </div>
  );
};

// ================================================================
// KOMPONEN UTAMA: PartSoal
// ================================================================
const PartSoal = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State (Tidak berubah)
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamBerakhir, setJamBerakhir] = useState("");
  const [durasiMenit, setDurasiMenit] = useState(0);
  const [soalList, setSoalList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawabanUser, setJawabanUser] = useState({});
  const [raguRagu, setRaguRagu] = useState({});
  const [sisaDetik, setSisaDetik] = useState(null);
  const [startMs, setStartMs] = useState(null);
  const [endMs, setEndMs] = useState(null);

  // Helper (Tidak berubah)
  const pad2 = (n) => String(n).padStart(2, "0");
  const toLocalDateOnly = (val) => {
    const d = new Date(val);
    if (!isNaN(d)) {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    const s = String(val || "");
    return s.includes("T") ? s.slice(0, 10) : s;
  };
  const formatTanggal = (raw) => {
    if (!raw) return "-";
    const [y, m, d] = toLocalDateOnly(raw).split("-");
    if (!y || !m || !d) return raw;
    return `${d}/${m}/${y}`;
  };

  // Helper Kunci localStorage (Progress Jawaban)
  const getProgressKey = () => {
    const peserta = JSON.parse(localStorage.getItem("pesertaData"));
    const pesertaId = peserta?.id || "anon";
    return `progress_${pesertaId}_${id}`;
  };

  // --- [PERUBAHAN 1] ---
  // Helper Kunci localStorage BARU (Urutan Soal)
  const getOrderKey = () => {
    const peserta = JSON.parse(localStorage.getItem("pesertaData"));
    const pesertaId = peserta?.id || "anon";
    return `order_${pesertaId}_${id}`;
  };

  // ===== FETCH DETAIL UJIAN =====
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/ujian/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal memuat ujian.");

        setKeterangan(data.keterangan || "");
        setTanggal(data.tanggal || "");
        setJamMulai(data.jam_mulai || "");
        setJamBerakhir(data.jam_berakhir || "");

        // Perhitungan Waktu (Tidak berubah)
        const jm = data.jam_mulai || "";
        const jb = data.jam_berakhir || "";
        const padTime = (t) => (t?.length === 5 ? `${t}:00` : t || "00:00:00");
        const dateOnly = toLocalDateOnly(data.tanggal);
        if (dateOnly && jm && jb) {
          let start = new Date(`${dateOnly}T${padTime(jm)}`);
          let end = new Date(`${dateOnly}T${padTime(jb)}`);
          if (end <= start) {
            end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
          }
          const durasi = Math.max(0, Math.floor((end - start) / 1000));
          setDurasiMenit(Math.floor(durasi / 60));
          const now = Date.now();
          let sisa = 0;
          if (now < start.getTime()) {
            sisa = durasi;
          } else if (now >= start.getTime() && now <= end.getTime()) {
            sisa = Math.max(0, Math.floor((end.getTime() - now) / 1000));
          } else {
            sisa = 0;
          }
          setStartMs(start.getTime());
          setEndMs(end.getTime());
          setSisaDetik(sisa);
        } else {
          setStartMs(null);
          setEndMs(null);
          setSisaDetik(null);
          setDurasiMenit(0);
        }

        // --- [PERUBAHAN 2: LOGIKA INTI PENGURUTAN SOAL] ---
        
        let soalListDariApi = data.soalList || [];
        let soalListTerurut; // Ini akan menjadi list final

        const orderKey = getOrderKey();
        const savedOrderJson = localStorage.getItem(orderKey);

        if (savedOrderJson) {
          // --- A. JIKA URUTAN TERSIMPAN ADA (Refresh) ---
          console.log("Memuat urutan soal dari localStorage...");
          const savedSoalIds = JSON.parse(savedOrderJson);
          
          // Buat Peta (Map) dari soal API agar mudah dicari
          const soalMap = new Map(soalListDariApi.map(s => [s.id, s]));
          
          // Susun ulang 'soalListTerurut' berdasarkan urutan ID yang tersimpan
          soalListTerurut = savedSoalIds.map(id => soalMap.get(id)).filter(Boolean);

        } else if (data.acak_soal === true) {
          // --- B. JIKA TIDAK ADA URUTAN TERSIMPAN & MINTA ACAK (Load Pertama) ---
          console.log("Mengacak soal dan menyimpan urutan...");
          const shuffledList = shuffleArray(soalListDariApi);
          
          // Simpan urutan ID yang BARU di-shuffle
          const shuffledIds = shuffledList.map(s => s.id);
          localStorage.setItem(orderKey, JSON.stringify(shuffledIds));
          
          // Gunakan list yang baru di-shuffle
          soalListTerurut = shuffledList;

        } else {
          // --- C. JIKA TIDAK ADA URUTAN & TIDAK MINTA ACAK ---
          console.log("Memuat soal tanpa acak...");
          soalListTerurut = soalListDariApi;
        }
        // --- [AKHIR PERUBAHAN 2] ---


        // Mapping Soal (Gunakan 'soalListTerurut' hasil logika di atas)
        const mapped = soalListTerurut.map((s) => {
          let pilihanNormalized = [];
          if (Array.isArray(s.pilihan)) {
            if (s.pilihan.length > 0 && typeof s.pilihan[0] === "object") {
              pilihanNormalized = s.pilihan.map((p, idx) => ({
                id: p.id || idx + 1,
                text: p.text ?? p,
              }));
            } else {
              pilihanNormalized = s.pilihan.map((pText, idx) => ({
                id: idx + 1,
                text: pText,
              }));
            }
          }
          return {
            id: s.id, // ID Soal (question_id)
            tipeSoal: s.tipeSoal || "pilihanGanda",
            soalText: s.soalText || "",
            gambarUrl: s.gambar ? `${API_URL}/api/ujian${s.gambar}` : null,
            pilihan: pilihanNormalized,
          };
        });

        setSoalList(mapped); // Set state dengan list yang urutannya sudah benar

        // Inisialisasi state jawaban (Logika ini sudah benar dari vesi sebelumnya)
        const progressKey = getProgressKey();
        const savedProgress = JSON.parse(localStorage.getItem(progressKey)) || {};
        const initJawab = {};
        const initRagu = {};
        mapped.forEach((soal) => {
          const soalId = soal.id;
          initJawab[soalId] = savedProgress.jawabanUser?.[soalId] || "";
          initRagu[soalId] = savedProgress.raguRagu?.[soalId] || false;
        });
        setJawabanUser(initJawab);
        setRaguRagu(initRagu);

      } catch (err) {
        console.error(err);
        setErrMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  // ===== TIMER COUNTDOWN (Tidak berubah) =====
  useEffect(() => {
    if (startMs == null || endMs == null) return;
    const tick = () => {
      const now = Date.now();
      let next = 0;
      if (now < startMs) {
        next = Math.max(0, Math.floor((endMs - startMs) / 1000));
      } else if (now >= startMs && now <= endMs) {
        next = Math.max(0, Math.floor((endMs - now) / 1000));
      } else {
        next = 0;
      }
      setSisaDetik(next);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startMs, endMs]);

  // Format waktu (Tidak berubah)
  const timerDisplay = useMemo(() => {
    if (sisaDetik === null) return "--:--";
    const h = Math.floor(sisaDetik / 3600);
    const m = Math.floor((sisaDetik % 3600) / 60);
    const s = sisaDetik % 60;
    return h > 0
      ? `${pad2(h)}:${pad2(m)}:${pad2(s)}`
      : `${pad2(m)}:${pad2(s)}`;
  }, [sisaDetik]);

  // ===== Auto-save progress jawaban (Tidak berubah) =====
  useEffect(() => {
    if (loading || soalList.length === 0) return;
    const progressKey = getProgressKey();
    const progressData = {
      jawabanUser,
      raguRagu,
      lastUpdated: new Date().toISOString(),
    };
    try {
      localStorage.setItem(progressKey, JSON.stringify(progressData));
    } catch (e) {
      console.warn("Gagal menyimpan progress ke localStorage:", e);
    }
  }, [jawabanUser, raguRagu, id, loading, soalList.length]);

  // ===== HANDLER (Tidak berubah dari versi sebelumnya) =====
  const handleJawabPilihan = (pilihanId) => {
    const soalId = soalList[currentIndex]?.id;
    if (!soalId) return;
    setJawabanUser((prev) => ({ ...prev, [soalId]: pilihanId }));
  };

  const handleJawabEsai = (text) => {
    const soalId = soalList[currentIndex]?.id;
    if (!soalId) return;
    setJawabanUser((prev) => ({ ...prev, [soalId]: text }));
  };

  const toggleRagu = () => {
    const soalId = soalList[currentIndex]?.id;
    if (!soalId) return;
    setRaguRagu((prev) => ({ ...prev, [soalId]: !prev[soalId] }));
  };

  const gotoPrev = () => {
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
  };
  const gotoNext = () => {
    setCurrentIndex((idx) => (idx < soalList.length - 1 ? idx + 1 : idx));
  };
  const gotoNomor = (idx) => setCurrentIndex(idx);

  // ===== Submit jawaban =====
  const handleSubmit = async () => {
    const peserta = JSON.parse(localStorage.getItem("pesertaData"));
    if (!peserta || !peserta.id) {
      alert("Data peserta tidak ditemukan...");
      navigate("/peserta");
      return;
    }
    const konfirmasi = window.confirm(
      "Apakah Anda yakin ingin mengumpulkan jawaban?"
    );
    if (!konfirmasi) return;

    // Persiapan payload (Tidak berubah dari versi sebelumnya)
    const jawabanArray = soalList.map((soal) => {
      const jawaban = jawabanUser[soal.id] || null;
      return {
        question_id: soal.id,
        tipe_soal: soal.tipeSoal,
        jawaban_text: jawaban,
      };
    });
    const payload = {
      peserta_id: peserta.id,
      exam_id: id,
      jawaban: jawabanArray,
    };

    try {
      const res = await fetch(`${API_URL}/api/hasil`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert("✅ Jawaban berhasil dikumpulkan!");

      // --- [PERUBAHAN BARU: SET NOTIFIKASI UNTUK ADMIN] ---
      // Menandai di localStorage bahwa ada hasil ujian baru
      localStorage.setItem("newHasilUjian", "true");
      // --- [AKHIR PERUBAHAN BARU] ---


      // --- [PEMBERSIHAN LOCALSTORAGE PESERTA] ---
      // Hapus data 'pesertaData'
      localStorage.removeItem("pesertaData");
      // Hapus data 'progress' jawaban
      const progressKey = getProgressKey();
      localStorage.removeItem(progressKey);
      // Hapus data 'urutan' soal
      const orderKey = getOrderKey();
      localStorage.removeItem(orderKey);
      // --- [AKHIR PEMBERSIHAN] ---

      navigate("/peserta");
    } catch (err) {
      alert("Gagal menyimpan hasil ujian: " + err.message);
    }
  };

  // ===== UI STATE (Tidak berubah) =====
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-400 border-t-transparent mx-auto mb-4" />
          <p className="text-sm font-medium tracking-wide">Memuat ujian...</p>
        </div>
      </div>
    );

  if (errMsg)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-600 p-6">
        <p className="text-lg font-semibold mb-2">Gagal memuat ujian</p>
        <p className="text-sm text-red-500">{errMsg}</p>
      </div>
    );

  const soalAktif = soalList[currentIndex];
  const jumlahTerjawab = Object.values(jawabanUser).filter(
    (v) => v !== ""
  ).length;

  // ================================================================
  // RENDER (Tidak berubah dari versi sebelumnya)
  // ================================================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* NAVBAR */}
      <header className="relative z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-md bg-blue-600 text-white text-[11px] font-semibold shrink-0">
              UJIAN
            </div>
            <div className="flex flex-col min-w-0">
              <div className="text-sm font-semibold text-gray-800 break-words leading-snug">
                {keterangan || "Ujian"}
              </div>
              <div className="text-[11px] text-gray-500 leading-snug flex gap-2 items-center">
                <span>{formatTanggal(tanggal)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FaClock className="inline-block" />
                  {jamMulai || "--:--"}–{jamBerakhir || "--:--"}
                </span>
                <span>•</span>
                <span>Durasi {durasiMenit} menit</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* KONTEN SOAL DAN NAVIGASI */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Kolom Kiri: Soal */}
          <main className="flex-1 w-full">
            <div className="w-full bg-white rounded-xl border border-gray-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between p-5 border-b border-gray-200">
                <div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Soal {currentIndex + 1} / {soalList.length}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">
                    {soalAktif?.tipeSoal === "pilihanGanda"
                      ? "Pilihan Ganda"
                      : "Esai / Uraian"}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex items-center gap-2 text-[12px]">
                    <button
                      onClick={gotoPrev}
                      disabled={currentIndex === 0}
                      className="px-3 py-1.5 rounded-md border text-gray-700 text-[12px] bg-white hover:bg-gray-50 border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={gotoNext}
                      disabled={currentIndex === soalList.length - 1}
                      className="px-3 py-1.5 rounded-md border text-gray-700 text-[12px] bg-white hover:bg-gray-50 border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  
                  <button
                    onClick={toggleRagu}
                    className={`text-[12px] px-3 py-1.5 rounded-md border ${
                      raguRagu[soalAktif?.id]
                        ? "bg-yellow-50 border-yellow-400 text-yellow-700"
                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {raguRagu[soalAktif?.id]
                      ? "Ditandai ragu-ragu"
                      : "Tandai ragu-ragu"}
                  </button>
                </div>
              </div>

              {/* Isi Soal */}
              <div className="p-5">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 rounded-lg p-4 text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
                  {soalAktif?.soalText || "(soal kosong)"}
                </div>

                {soalAktif?.gambarUrl && (
                  <div className="mt-5 flex justify-center">
                    <img
                      src={soalAktif.gambarUrl}
                      alt="Gambar Soal"
                      className="max-h-64 rounded-md border border-gray-200 object-contain bg-white p-2"
                    />
                  </div>
                )}

                {/* Pilihan Ganda */}
                {soalAktif?.tipeSoal === "pilihanGanda" && (
                  <div className="mt-6 space-y-3">
                    {soalAktif.pilihan.map((pil, idxPil) => {
                      const jawabanTersimpan = jawabanUser[soalAktif.id];
                      const aktif = jawabanTersimpan === pil.id;
                      const labelHuruf = String.fromCharCode(
                        "A".charCodeAt(0) + idxPil
                      );
                      return (
                        <button
                          key={pil.id}
                          onClick={() => handleJawabPilihan(pil.id)}
                          className={`w-full text-left flex items-start gap-3 rounded-lg border p-4 text-[15px] leading-relaxed transition ${
                            aktif
                              ? "bg-white border-blue-500 ring-2 ring-blue-200"
                              : "bg-white border-gray-300 hover:bg-gray-50 hover:border-blue-300"
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold ${
                              aktif
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 border border-gray-300"
                            }`}
                          >
                            {labelHuruf}
                          </div>

                          <div className="flex-1 text-gray-800 break-words text-left">
                            {pil.text || "(kosong)"}
                          </div>

                          <div
                            className={`text-lg ${
                              aktif ? "text-blue-600" : "text-gray-400"
                            }`}
                          >
                            {aktif ? <FaCheckCircle /> : <FaRegCircle />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Esai */}
                {soalAktif?.tipeSoal === "esay" && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jawaban Anda
                    </label>
                    <textarea
                      className="w-full min-h-[160px] bg-white border border-gray-300 rounded-lg p-4 text-gray-800 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
                      value={jawabanUser[soalAktif.id] || ""}
                      onChange={(e) => handleJawabEsai(e.target.value)}
                      placeholder="Ketik jawaban Anda di sini..."
                    />
                  </div>
                )}
              </div>

            </div>
          </main>

          {/* Kolom Kanan: Status Ujian */}
          <aside className="w-full lg:w-72 xl:w-80">
            <StatusUjianBox
              totalSoal={soalList.length}
              jumlahTerjawab={jumlahTerjawab}
              timerDisplay={timerDisplay}
              soalList={soalList}
              jawabanUser={jawabanUser}
              raguRagu={raguRagu}
              currentIndex={currentIndex}
              onNavClick={gotoNomor}
              onSubmit={handleSubmit}
            />
          </aside>
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

export default PartSoal;