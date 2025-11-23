// File: src/page/PartSoal.jsx
// UPDATED: acak opsi pilihan ganda per peserta + simpan urutan opsi di localStorage
// (tetap include autosave draft ke backend + beacon on close)

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaClock,
  FaCheckCircle,
  FaRegCircle,
  FaUser,
  FaPhoneAlt,
  FaEnvelope,
  FaCalendarAlt,
  FaRegClock,
  FaInfoCircle,
} from "react-icons/fa";
import SubmitUjianModal from "../component/submitujian.jsx";

const API_URL = "http://localhost:5000";

// --- FUNGSI SHUFFLE ---
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

// --- KOMPONEN StatusUjianBox ---
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

// --- KOMPONEN InfoPesertaBox ---
const InfoPesertaBox = ({ peserta }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Data Peserta
      </h3>
      <ul className="space-y-3 text-sm">
        <li className="flex items-center gap-3 text-gray-700">
          <FaUser className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium break-words min-w-0">
            {peserta.nama}
          </span>
        </li>
        <li className="flex items-center gap-3 text-gray-700">
          <FaPhoneAlt className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium">{peserta.nohp}</span>
        </li>
        <li className="flex items-center gap-3 text-gray-700">
          <FaEnvelope className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium break-words min-w-0">
            {peserta.email}
          </span>
        </li>
      </ul>
    </div>
  );
};

// --- KOMPONEN InfoUjianBox ---
const InfoUjianBox = ({
  keterangan,
  tanggal,
  jamMulai,
  jamBerakhir,
  durasi,
  formatTanggal,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Informasi Ujian
      </h3>
      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3 text-gray-700">
          <FaInfoCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <span className="font-medium break-words min-w-0">
            {keterangan}
          </span>
        </li>
        <li className="flex items-center gap-3 text-gray-700">
          <FaCalendarAlt className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium">{formatTanggal(tanggal)}</span>
        </li>
        <li className="flex items-center gap-3 text-gray-700">
          <FaClock className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium">
            {jamMulai} – {jamBerakhir} (WIB)
          </span>
        </li>
        <li className="flex items-center gap-3 text-gray-700">
          <FaRegClock className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium">Durasi: {durasi} menit</span>
        </li>
      </ul>
    </div>
  );
};

// --- KOMPONEN UTAMA: PartSoal ---
const PartSoal = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [durasiMenit, setDurasiMenit] = useState(0);
  const [windowStartMs, setWindowStartMs] = useState(null);
  const [windowEndMs, setWindowEndMs] = useState(null);
  const [displayTanggal, setDisplayTanggal] = useState("");
  const [displayJamMulai, setDisplayJamMulai] = useState("");
  const [displayJamBerakhir, setDisplayJamBerakhir] = useState("");
  const [soalList, setSoalList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawabanUser, setJawabanUser] = useState({});
  const [raguRagu, setRaguRagu] = useState({});
  const [sisaDetik, setSisaDetik] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pesertaInfo, setPesertaInfo] = useState({
    nama: "Memuat...",
    nohp: "Memuat...",
    email: "Memuat...",
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(10);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // --- Helper ---
  const pad2 = (n) => String(n).padStart(2, "0");
  const toLocalDateOnly = (val) => {
    const d = new Date(val);
    if (!isNaN(d)) {
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
        d.getDate()
      )}`;
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
  const padTime = (t) => (t?.length === 5 ? `${t}:00` : t || "00:00:00");

  const getProgressKey = useCallback(() => {
    const peserta = JSON.parse(localStorage.getItem("pesertaData"));
    const pesertaId = peserta?.id;
    if (!pesertaId) {
      throw new Error(
        "getProgressKey: ID Peserta tidak ditemukan di localStorage."
      );
    }
    return `progress_${pesertaId}_${id}`;
  }, [id]);

  const getOrderKey = useCallback(() => {
    const peserta = JSON.parse(localStorage.getItem("pesertaData"));
    const pesertaId = peserta?.id;
    if (!pesertaId) {
      throw new Error("getOrderKey: ID Peserta tidak ditemukan di localStorage.");
    }
    return `order_${pesertaId}_${id}`;
  }, [id]);

  // NEW: key urutan opsi per soal per peserta
  const getOptionOrderKey = useCallback(
    (soalId) => {
      const peserta = JSON.parse(localStorage.getItem("pesertaData"));
      const pesertaId = peserta?.id;
      if (!pesertaId) {
        throw new Error(
          "getOptionOrderKey: ID Peserta tidak ditemukan di localStorage."
        );
      }
      return `order_opsi_${pesertaId}_${id}_${soalId}`;
    },
    [id]
  );

  // =======================================================
  // FETCH DETAIL UJIAN (PUBLIC)
  // =======================================================
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_URL}/api/ujian/public/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal memuat ujian.");

        // 1. Set Info Tampilan
        setKeterangan(data.keterangan || "");
        setDisplayTanggal(data.tanggal || "");
        setDisplayJamMulai(data.jam_mulai || "");
        setDisplayJamBerakhir(data.jam_berakhir || "");

        // 2. Set DURASI
        const durasiDariDb = parseInt(data.durasi, 10) || 0;
        if (durasiDariDb <= 0) {
          throw new Error("Durasi ujian tidak valid (0 menit).");
        }
        setDurasiMenit(durasiDariDb);

        // 3. Set JENDELA WAKTU
        const tglMulai = toLocalDateOnly(data.tanggal);
        const tglBerakhir = toLocalDateOnly(data.tanggal_berakhir);
        const jm = padTime(data.jam_mulai);
        const jb = padTime(data.jam_berakhir);
        if (!tglMulai || !tglBerakhir || !jm || !jb) {
          throw new Error("Jadwal ujian (tanggal/jam) tidak lengkap.");
        }
        const startWindow = new Date(`${tglMulai}T${jm}`).getTime();
        const endWindow = new Date(`${tglBerakhir}T${jb}`).getTime();
        if (endWindow <= startWindow) {
          throw new Error(
            "Jadwal ujian tidak valid (waktu berakhir < waktu mulai)."
          );
        }
        setWindowStartMs(startWindow);
        setWindowEndMs(endWindow);

        // 4. Logika Urutan Soal
        let soalListDariApi = data.soalList || [];
        let soalListTerurut;
        const orderKey = getOrderKey();
        const savedOrderJson = localStorage.getItem(orderKey);
        const isAcakSoal =
          data.acak_soal === 1 ||
          data.acak_soal === "1" ||
          data.acak_soal === true;

        const isAcakOpsi =
          data.acak_opsi === 1 ||
          data.acak_opsi === "1" ||
          data.acak_opsi === true ||
          data.acak_opsi === "true";

        if (savedOrderJson) {
          console.log("Memuat urutan soal dari localStorage...");
          const savedSoalIds = JSON.parse(savedOrderJson);
          const soalMap = new Map(soalListDariApi.map((s) => [s.id, s]));
          soalListTerurut = savedSoalIds
            .map((sid) => soalMap.get(sid))
            .filter(Boolean);
        } else if (isAcakSoal) {
          console.log("Mengacak soal dan menyimpan urutan...");
          const shuffledList = shuffleArray(soalListDariApi);
          const shuffledIds = shuffledList.map((s) => s.id);
          localStorage.setItem(orderKey, JSON.stringify(shuffledIds));
          soalListTerurut = shuffledList;
        } else {
          console.log("Memuat soal tanpa acak...");
          soalListTerurut = soalListDariApi;
        }

        // 5. Mapping Soal + (NEW) Acak Opsi Pilihan Ganda per Peserta
        const mapped = soalListTerurut.map((s) => {
          let pilihanNormalized = [];
          if (Array.isArray(s.pilihan)) {
            if (s.pilihan.length > 0 && typeof s.pilihan[0] === "object") {
              pilihanNormalized = s.pilihan.map((p, idx) => ({
                id: p.id ?? idx + 1,
                text: p.text ?? p,
              }));
            } else {
              pilihanNormalized = s.pilihan.map((pText, idx) => ({
                id: idx + 1,
                text: pText,
              }));
            }
          }

          // NEW: acak opsi hanya untuk pilihan ganda
          let pilihanTerurut = pilihanNormalized;
          if (
            isAcakOpsi &&
            (s.tipeSoal || "pilihanGanda") === "pilihanGanda" &&
            pilihanNormalized.length > 1
          ) {
            try {
              const opsiOrderKey = getOptionOrderKey(s.id);
              const savedOpsiOrderJson =
                localStorage.getItem(opsiOrderKey);

              if (savedOpsiOrderJson) {
                const savedOpsiIds = JSON.parse(savedOpsiOrderJson);
                const opsiMap = new Map(
                  pilihanNormalized.map((o) => [o.id, o])
                );
                const ordered = savedOpsiIds
                  .map((oid) => opsiMap.get(oid))
                  .filter(Boolean);

                // pakai order saved jika lengkap, kalau tidak fallback
                if (ordered.length === pilihanNormalized.length) {
                  pilihanTerurut = ordered;
                } else {
                  pilihanTerurut = pilihanNormalized;
                }
              } else {
                const shuffledOpsi = shuffleArray(pilihanNormalized);
                const shuffledOpsiIds = shuffledOpsi.map((o) => o.id);
                localStorage.setItem(
                  opsiOrderKey,
                  JSON.stringify(shuffledOpsiIds)
                );
                pilihanTerurut = shuffledOpsi;
              }
            } catch (e) {
              console.warn("Gagal mengacak opsi:", e.message);
              pilihanTerurut = pilihanNormalized;
            }
          }

          return {
            id: s.id,
            tipeSoal: s.tipeSoal || "pilihanGanda",
            soalText: s.soalText || "",
            gambarUrl: s.gambar ? `${API_URL}${s.gambar}` : null,
            pilihan: pilihanTerurut,
          };
        });

        setSoalList(mapped);

        // 6. Inisialisasi State Jawaban dari LocalStorage
        const progressKey = getProgressKey();
        const savedProgress =
          JSON.parse(localStorage.getItem(progressKey)) || {};
        const initJawab = {};
        const initRagu = {};
        mapped.forEach((soal) => {
          const soalId = soal.id;
          initJawab[soalId] = savedProgress.jawabanUser?.[soalId] || "";
          initRagu[soalId] = savedProgress.raguRagu?.[soalId] || false;
        });
        setJawabanUser(initJawab);
        setRaguRagu(initRagu);

        // 7. Inisialisasi TIMER
        const nowMs = Date.now();
        if (nowMs < startWindow) {
          throw new Error("Ujian belum dimulai.");
        }
        if (nowMs > endWindow) {
          throw new Error("Jendela waktu untuk memulai ujian sudah ditutup.");
        }

        let startTimeMs = savedProgress.startTimeMs;
        if (!startTimeMs) {
          console.log("Memulai timer ujian...");
          startTimeMs = nowMs;
          savedProgress.startTimeMs = startTimeMs;
          localStorage.setItem(progressKey, JSON.stringify(savedProgress));
        }
        const durationEndMs = startTimeMs + durasiDariDb * 60 * 1000;
        const actualEndMs = durationEndMs;

        if (nowMs > actualEndMs) {
          setSisaDetik(0);
        } else {
          const sisa = Math.max(0, Math.floor((actualEndMs - nowMs) / 1000));
          setSisaDetik(sisa);
        }

        // 8. Muat Data Peserta
        try {
          const dataPeserta = JSON.parse(localStorage.getItem("pesertaData"));
          if (dataPeserta && dataPeserta.nama) {
            setPesertaInfo({
              nama: dataPeserta.nama,
              nohp: dataPeserta.nohp,
              email: dataPeserta.email,
            });
          } else {
            throw new Error("Data peserta tidak ditemukan di localStorage.");
          }
        } catch (e) {
          console.warn("Gagal memuat data peserta:", e.message);
          setPesertaInfo({
            nama: "Data Error",
            nohp: "-",
            email: "-",
          });
        }
      } catch (err) {
        console.error(err);
        setErrMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, getOrderKey, getProgressKey, getOptionOrderKey]);

  // =======================================================
  // TIMER COUNTDOWN
  // =======================================================
  useEffect(() => {
    if (sisaDetik === null) return;
    if (sisaDetik === 0) return;

    const t = setInterval(() => {
      setSisaDetik((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [sisaDetik]);

  const timerDisplay = useMemo(() => {
    if (sisaDetik === null) return "--:--";
    const h = Math.floor(sisaDetik / 3600);
    const m = Math.floor((sisaDetik % 3600) / 60);
    const s = sisaDetik % 60;
    return h > 0
      ? `${pad2(h)}:${pad2(m)}:${pad2(s)}`
      : `${pad2(m)}:${pad2(s)}`;
  }, [sisaDetik]);

  // =======================================================
  // AUTO-SAVE PROGRESS -> localStorage
  // =======================================================
  useEffect(() => {
    if (loading || soalList.length === 0 || sisaDetik === null) return;
    const progressKey = getProgressKey();
    const savedProgress =
      JSON.parse(localStorage.getItem(progressKey)) || {};
    const progressData = {
      ...savedProgress,
      jawabanUser,
      raguRagu,
      lastUpdated: new Date().toISOString(),
    };
    try {
      localStorage.setItem(progressKey, JSON.stringify(progressData));
    } catch (e) {
      console.warn("Gagal menyimpan progress ke localStorage:", e);
    }
  }, [
    jawabanUser,
    raguRagu,
    loading,
    soalList.length,
    getProgressKey,
    sisaDetik,
  ]);

  // =======================================================
  // AUTO-SAVE DRAFT ke BACKEND /api/hasil/draft
  // =======================================================
  const saveDraftToServer = useCallback(async () => {
    try {
      if (isSubmitting) return;
      const peserta = JSON.parse(localStorage.getItem("pesertaData"));
      if (!peserta?.id || soalList.length === 0) return;

      const jawabanArray = soalList.map((soal) => ({
        question_id: soal.id,
        tipe_soal: soal.tipeSoal,
        jawaban_text: jawabanUser[soal.id] || null,
      }));

      await fetch(`${API_URL}/api/hasil/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peserta_id: peserta.id,
          exam_id: id,
          jawaban: jawabanArray,
        }),
        keepalive: true,
      });
    } catch (e) {
      console.warn("Autosave draft gagal:", e.message);
    }
  }, [id, soalList, jawabanUser, isSubmitting]);

  useEffect(() => {
    if (loading || soalList.length === 0 || sisaDetik === null) return;
    const iv = setInterval(saveDraftToServer, 15000);
    return () => clearInterval(iv);
  }, [saveDraftToServer, loading, soalList.length, sisaDetik]);

  // Kirim draft terakhir ketika tab ditutup / refresh / hidden
  useEffect(() => {
    if (loading || soalList.length === 0) return;

    const sendDraftBeacon = () => {
      try {
        if (isSubmitting) return;
        const peserta = JSON.parse(localStorage.getItem("pesertaData"));
        if (!peserta?.id) return;

        const jawabanArray = soalList.map((soal) => ({
          question_id: soal.id,
          tipe_soal: soal.tipeSoal,
          jawaban_text: jawabanUser[soal.id] || null,
        }));

        const payload = {
          peserta_id: peserta.id,
          exam_id: id,
          jawaban: jawabanArray,
        };

        const url = `${API_URL}/api/hasil/draft`;

        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], {
            type: "application/json",
          });
          navigator.sendBeacon(url, blob);
        } else {
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          });
        }
      } catch (e) {
        console.warn("Beacon draft gagal:", e.message);
      }
    };

    const onPageHide = () => sendDraftBeacon();
    const onBeforeUnload = () => sendDraftBeacon();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendDraftBeacon();
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loading, soalList, jawabanUser, id, isSubmitting]);

  // =======================================================
  // HANDLER JAWABAN
  // =======================================================
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

  const handleBatalJawab = () => {
    const soalId = soalList[currentIndex]?.id;
    if (!soalId) return;
    setJawabanUser((prev) => ({ ...prev, [soalId]: "" }));
  };

  const gotoPrev = () => {
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
  };

  const gotoNext = () => {
    setCurrentIndex((idx) =>
      idx < soalList.length - 1 ? idx + 1 : idx
    );
  };

  const gotoNomor = (idx) => setCurrentIndex(idx);

  // =======================================================
  // SUBMIT FINAL
  // =======================================================
  const handleSubmit = useCallback(
    async (isAutoSubmit = false) => {
      if (isSubmitting) return;

      const peserta = JSON.parse(localStorage.getItem("pesertaData"));
      if (!peserta || !peserta.id) {
        alert("Data peserta tidak ditemukan...");
        navigate("/");
        return;
      }

      setIsSubmitting(true);

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

        localStorage.setItem("newHasilUjian", "true");

        // ambil key dulu
        const progressKey = getProgressKey();
        const orderKey = getOrderKey();

        // NEW: hapus juga urutan opsi per soal
        try {
          soalList.forEach((soal) => {
            const ok = getOptionOrderKey(soal.id);
            localStorage.removeItem(ok);
          });
        } catch (e) {
          console.warn("Gagal hapus order opsi:", e.message);
        }

        // hapus semua data ujian di localStorage
        localStorage.removeItem("pesertaData");
        localStorage.removeItem("loginPeserta");
        localStorage.removeItem(progressKey);
        localStorage.removeItem(orderKey);

        if (isAutoSubmit) {
          setIsSubmitting(false);
          countdownIntervalRef.current = setInterval(() => {
            setAutoSubmitCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownIntervalRef.current);
                navigate("/selesai");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setShowConfirmModal(false);
          navigate("/selesai");
        }
      } catch (err) {
        alert("Gagal menyimpan hasil ujian: " + err.message);
        setIsSubmitting(false);
        setShowConfirmModal(false);
        setShowAutoSubmitModal(false);
      }
    },
    [
      isSubmitting,
      id,
      soalList,
      jawabanUser,
      navigate,
      getProgressKey,
      getOrderKey,
      getOptionOrderKey,
    ]
  );

  // =======================================================
  // AUTO-SUBMIT saat timer 0
  // =======================================================
  useEffect(() => {
    if (loading || sisaDetik === null || isSubmitting) return;

    if (sisaDetik === 0) {
      if (countdownIntervalRef.current === null && !showAutoSubmitModal) {
        console.log("WAKTU HABIS: Auto-submit dipicu.");
        setShowAutoSubmitModal(true);
        handleSubmit(true);
      }
    }
  }, [sisaDetik, isSubmitting, loading, handleSubmit, showAutoSubmitModal]);

  // =======================================================
  // RENDER
  // =======================================================
  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-400 border-t-transparent mx-auto mb-4" />
          <p className="text-sm font-medium tracking-wide">Memuat ujian...</p>
        </div>
      </div>
    );

  if (errMsg)
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-red-50 text-red-600 p-6">
        <p className="text-lg font-semibold mb-2">Gagal memuat ujian</p>
        <p className="text-sm text-red-500">{errMsg}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md"
        >
          Kembali ke Halaman Utama
        </button>
      </div>
    );

  const soalAktif = soalList[currentIndex];
  const jumlahTerjawab = Object.values(jawabanUser).filter((v) => v !== "")
    .length;

  return (
    <>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 bg-gray-50">
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
                      : soalAktif?.tipeSoal === "teksSingkat"
                      ? "Jawaban Singkat"
                      : "Esai / Uraian"}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex items-center gap-2 text-[12px]">
                    <button
                      onClick={gotoPrev}
                      disabled={currentIndex === 0}
                      className="
                        px-3 py-1.5 rounded-md border text-[12px]
                        bg-blue-600 text-white border-blue-600
                        hover:bg-blue-700 hover:border-blue-700
                        disabled:opacity-40 disabled:cursor-not-allowed
                      "
                    >
                      Kembali
                    </button>

                    <button
                      onClick={gotoNext}
                      disabled={currentIndex === soalList.length - 1}
                      className="
                        px-3 py-1.5 rounded-md border text-[12px]
                        bg-green-600 text-white border-green-600
                        hover:bg-green-700 hover:border-green-700
                        disabled:opacity-40 disabled:cursor-not-allowed
                      "
                    >
                      Lanjut
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Tombol Batal */}
                    {soalAktif?.tipeSoal === "pilihanGanda" &&
                      jawabanUser[soalAktif.id] && (
                        <button
                          onClick={handleBatalJawab}
                          className="px-3 py-1.5 rounded-md border text-[12px] bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors"
                          title="Hapus jawaban terpilih"
                        >
                          Batal
                        </button>
                      )}

                    <button
                      onClick={toggleRagu}
                      className={`text-[12px] px-3 py-1.5 rounded-md border ${
                        raguRagu[soalAktif?.id]
                          ? "bg-yellow-50 border-yellow-400 text-yellow-700"
                          : "bg-white border-orange-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {raguRagu[soalAktif?.id]
                        ? "Ditandai ragu-ragu"
                        : "Tandai ragu-ragu"}
                    </button>
                  </div>
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

                {/* Esai / Teks Singkat */}
                {(soalAktif?.tipeSoal === "esay" ||
                  soalAktif?.tipeSoal === "teksSingkat") && (
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
                    {soalAktif?.tipeSoal === "teksSingkat" && (
                      <p className="text-xs text-gray-500 mt-1"></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Kolom Kanan */}
          <aside className="w-full lg:w-72 xl:w-80 space-y-6">
            <InfoPesertaBox peserta={pesertaInfo} />
            <StatusUjianBox
              totalSoal={soalList.length}
              jumlahTerjawab={jumlahTerjawab}
              timerDisplay={timerDisplay}
              soalList={soalList}
              jawabanUser={jawabanUser}
              raguRagu={raguRagu}
              currentIndex={currentIndex}
              onNavClick={gotoNomor}
              onSubmit={() => setShowConfirmModal(true)}
            />
            <InfoUjianBox
              keterangan={keterangan}
              tanggal={displayTanggal}
              jamMulai={displayJamMulai}
              jamBerakhir={displayJamBerakhir}
              durasi={durasiMenit}
              formatTanggal={formatTanggal}
            />
          </aside>
        </div>
      </div>

      {/* MODAL */}
      {showConfirmModal && (
        <SubmitUjianModal
          mode="confirm"
          isSubmitting={isSubmitting}
          onConfirm={() => handleSubmit(false)}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      {showAutoSubmitModal && (
        <SubmitUjianModal
          mode="auto_submit"
          isSubmitting={isSubmitting}
          countdown={autoSubmitCountdown}
        />
      )}
    </>
  );
};

export default PartSoal;
