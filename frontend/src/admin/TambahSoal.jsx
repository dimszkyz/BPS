// File: src/admin/TambahSoal.jsx
import React, { useState, useRef } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaPlus,
  FaSave,
  FaCheckCircle,
  FaTrash,
  FaCogs,
  FaListAlt,
  FaImage,
  FaFileExcel,
  FaDownload,
  FaUpload,
} from "react-icons/fa";
import * as XLSX from "xlsx";

const getAdminToken = () => {
  const token = sessionStorage.getItem("adminToken");
  if (!token) throw new Error("Token tidak ditemukan.");
  return token;
};

// ---------- Excel Helpers ----------
const downloadWorkbook = (wb, filename = "template_soal.xlsx") => {
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

const buildTemplateWorkbook = () => {
  // Sheet TEMPLATE_SOAL
  const soalHeaders = [
    "tipeSoal",
    "soalText",
    "pilihan1",
    "pilihan2",
    "pilihan3",
    "pilihan4",
    "pilihan5",
    "kunciJawaban",
    "gambarUrl",
  ];

  const contohSoal = [
    {
      tipeSoal: "pilihanGanda",
      soalText: "Contoh soal PG: Ibu membeli 2 apel ... berapa totalnya?",
      pilihan1: "10.000",
      pilihan2: "15.000",
      pilihan3: "20.000",
      pilihan4: "",
      pilihan5: "",
      kunciJawaban: "3",
      gambarUrl: "",
    },
    {
      tipeSoal: "teksSingkat",
      soalText: "Contoh teks singkat: 2 + 2 = ?",
      pilihan1: "",
      pilihan2: "",
      pilihan3: "",
      pilihan4: "",
      pilihan5: "",
      kunciJawaban: "4, empat",
      gambarUrl: "",
    },
    {
      tipeSoal: "esay",
      soalText: "Contoh esai: Jelaskan pendapatmu tentang ...",
      pilihan1: "",
      pilihan2: "",
      pilihan3: "",
      pilihan4: "",
      pilihan5: "",
      kunciJawaban: "",
      gambarUrl: "",
    },
  ];

  const wsSoal = XLSX.utils.json_to_sheet(contohSoal, { header: soalHeaders });
  XLSX.utils.sheet_add_aoa(wsSoal, [soalHeaders], { origin: "A1" });

  // Sheet PENGATURAN_UJIAN (1 baris)
  const settingHeaders = [
    "keterangan",
    "tanggalMulai",
    "tanggalBerakhir",
    "jamMulai",
    "jamBerakhir",
    "durasiMenit",
    "acakSoal",
    "acakOpsi",
  ];

  const contohSetting = [
    {
      keterangan: "Ujian Matematika Dasar",
      tanggalMulai: "2025-01-01",
      tanggalBerakhir: "2025-01-02",
      jamMulai: "08:00",
      jamBerakhir: "17:00",
      durasiMenit: "90",
      acakSoal: "TRUE",
      acakOpsi: "TRUE",
    },
  ];

  const wsSetting = XLSX.utils.json_to_sheet(contohSetting, {
    header: settingHeaders,
  });
  XLSX.utils.sheet_add_aoa(wsSetting, [settingHeaders], { origin: "A1" });

  // Sheet PETUNJUK
  const petunjuk = [
    ["PETUNJUK PENGISIAN TEMPLATE"],
    [""],
    ["A. PENGATURAN_UJIAN (isi hanya 1 baris)"],
    ["1) keterangan: judul/keterangan ujian."],
    ["2) tanggalMulai & tanggalBerakhir format: YYYY-MM-DD (contoh 2025-01-01)."],
    ["3) jamMulai & jamBerakhir format: HH:MM (contoh 08:00)."],
    ["4) durasiMenit wajib angka > 0 (menit)."],
    ["5) acakSoal & acakOpsi isi TRUE/FALSE atau 1/0."],
    [""],
    ["B. TEMPLATE_SOAL (1 soal per baris)"],
    ["1) tipeSoal: pilihanGanda / teksSingkat / esay (boleh juga: esai/essay -> otomatis jadi esay)."],
    ["2) soalText wajib diisi."],
    ["3) Untuk pilihanGanda, isi minimal pilihan1 & pilihan2. pilihan3-5 opsional."],
    ["4) kunciJawaban untuk pilihanGanda boleh angka 1-5, huruf A-E, atau teks jawaban yang sama persis dengan salah satu pilihan."],
    ["5) kunciJawaban untuk teksSingkat isi jawaban benar, kalau lebih dari satu pisahkan dengan koma. Contoh: 2, dua"],
    ["6) esay tidak perlu kunciJawaban dan pilihan."],
    ["7) gambarUrl opsional: isi URL gambar (preview tampil), tapi tidak upload file otomatis."],
  ];
  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjuk);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSetting, "PENGATURAN_UJIAN");
  XLSX.utils.book_append_sheet(wb, wsSoal, "TEMPLATE_SOAL");
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, "PETUNJUK");

  return wb;
};

const normalizeTipe = (raw) => {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return "pilihanGanda";
  if (["pg", "pilihanganda", "pilihan ganda", "pilihan_ganda"].includes(v))
    return "pilihanGanda";
  if (["teks", "singkat", "teks singkat", "textsingkat", "short"].includes(v))
    return "teksSingkat";
  if (["esai", "essay", "esay", "uraian"].includes(v)) return "esay";
  return "pilihanGanda";
};

const parseKunciPG = (rawKunci, pilihanTexts) => {
  const v = String(rawKunci || "").trim();
  if (!v) return 1;

  const num = parseInt(v, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= pilihanTexts.length) return num;

  const letterMap = { A: 1, B: 2, C: 3, D: 4, E: 5 };
  const up = v.toUpperCase();
  if (letterMap[up] && letterMap[up] <= pilihanTexts.length)
    return letterMap[up];

  const idx = pilihanTexts.findIndex(
    (p) => String(p).trim().toLowerCase() === v.toLowerCase()
  );
  if (idx !== -1) return idx + 1;

  return 1;
};

const pad2 = (n) => String(n).padStart(2, "0");

const excelDateToISO = (val) => {
  if (!val) return "";
  if (val instanceof Date && !isNaN(val)) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d && d.y && d.m && d.d) {
      return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`;
    }
  }
  const s = String(val).trim();
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    const [_, dd, mm, yyyy] = m1;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }
  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) {
    const [_, yyyy, mm, dd] = m2;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }
  return s;
};

const excelTimeToHHMM = (val) => {
  if (!val) return "";
  if (typeof val === "number") {
    const totalMinutes = Math.round(val * 24 * 60);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return `${pad2(hh)}:${pad2(mm)}`;
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})[:.](\d{1,2})/);
  if (m) return `${pad2(m[1])}:${pad2(m[2])}`;
  return s;
};

const excelBoolToJS = (val) => {
  const v = String(val || "").trim().toLowerCase();
  if (["true", "1", "ya", "yes", "y"].includes(v)) return true;
  return false;
};

const TambahSoal = () => {
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [tanggalBerakhir, setTanggalBerakhir] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamBerakhir, setJamBerakhir] = useState("");
  const [durasi, setDurasi] = useState("");

  const [acakSoal, setAcakSoal] = useState(false);
  const [acakOpsi, setAcakOpsi] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [daftarSoal, setDaftarSoal] = useState([
    {
      id: 1,
      tipeSoal: "pilihanGanda",
      soalText: "",
      gambar: null,
      gambarPreview: null,
      pilihan: [
        { id: 1, text: "" },
        { id: 2, text: "" },
      ],
      kunciJawaban: 1,
      kunciJawabanText: "",
    },
  ]);

  const excelInputRef = useRef(null);

  const handleFileChange = (soalId, file) => {
    const updated = daftarSoal.map((s) => {
      if (s.id === soalId) {
        return {
          ...s,
          gambar: file,
          gambarPreview: file ? URL.createObjectURL(file) : null,
        };
      }
      return s;
    });
    setDaftarSoal(updated);
  };

  const handleTambahSoal = () => {
    const newId = daftarSoal.length + 1;
    setDaftarSoal([
      ...daftarSoal,
      {
        id: newId,
        tipeSoal: "pilihanGanda",
        soalText: "",
        gambar: null,
        gambarPreview: null,
        pilihan: [
          { id: 1, text: "" },
          { id: 2, text: "" },
        ],
        kunciJawaban: 1,
        kunciJawabanText: "",
      },
    ]);
  };

  const handleHapusSoal = (id) => {
    if (daftarSoal.length <= 1) {
      alert("Minimal harus ada satu soal.");
      return;
    }
    setDaftarSoal(daftarSoal.filter((s) => s.id !== id));
  };

  const handleSoalChange = (id, field, value) => {
    const updated = daftarSoal.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    setDaftarSoal(updated);
  };

  const handleTambahPilihan = (soalId) => {
    setDaftarSoal((prev) =>
      prev.map((s) =>
        s.id === soalId
          ? {
              ...s,
              pilihan: [...s.pilihan, { id: s.pilihan.length + 1, text: "" }],
            }
          : s
      )
    );
  };

  const handleHapusPilihan = (soalId, pilihanId) => {
    setDaftarSoal((prev) =>
      prev.map((s) => {
        if (s.id === soalId) {
          if (s.pilihan.length <= 2) {
            alert("Minimal harus ada 2 pilihan.");
            return s;
          }
          const newPilihan = s.pilihan.filter((p) => p.id !== pilihanId);
          return {
            ...s,
            pilihan: newPilihan,
            kunciJawaban:
              s.kunciJawaban === pilihanId
                ? newPilihan[0]?.id || 0
                : s.kunciJawaban,
          };
        }
        return s;
      })
    );
  };

  const handlePilihanChange = (soalId, pilihanId, text) => {
    setDaftarSoal((prev) =>
      prev.map((s) =>
        s.id === soalId
          ? {
              ...s,
              pilihan: s.pilihan.map((p) =>
                p.id === pilihanId ? { ...p, text } : p
              ),
            }
          : s
      )
    );
  };

  const handleKunciJawabanChange = (soalId, pilihanId) => {
    setDaftarSoal((prev) =>
      prev.map((s) =>
        s.id === soalId ? { ...s, kunciJawaban: pilihanId } : s
      )
    );
  };

  // ---------- Excel Actions ----------
  const handleDownloadTemplate = () => {
    const wb = buildTemplateWorkbook();
    downloadWorkbook(wb, "template_import_ujian_dan_soal.xlsx");
  };

  const handleExportSoalExcel = () => {
    const settingHeaders = [
      "keterangan",
      "tanggalMulai",
      "tanggalBerakhir",
      "jamMulai",
      "jamBerakhir",
      "durasiMenit",
      "acakSoal",
      "acakOpsi",
    ];

    const settingRow = [
      {
        keterangan: keterangan || "",
        tanggalMulai: tanggal || "",
        tanggalBerakhir: tanggalBerakhir || "",
        jamMulai: jamMulai || "",
        jamBerakhir: jamBerakhir || "",
        durasiMenit: durasi || "",
        acakSoal: acakSoal ? "TRUE" : "FALSE",
        acakOpsi: acakOpsi ? "TRUE" : "FALSE",
      },
    ];

    const wsSetting = XLSX.utils.json_to_sheet(settingRow, {
      header: settingHeaders,
    });
    XLSX.utils.sheet_add_aoa(wsSetting, [settingHeaders], { origin: "A1" });

    const soalHeaders = [
      "tipeSoal",
      "soalText",
      "pilihan1",
      "pilihan2",
      "pilihan3",
      "pilihan4",
      "pilihan5",
      "kunciJawaban",
      "gambarUrl",
    ];

    const soalRows = daftarSoal.map((s) => {
      const pilihanTexts =
        s.tipeSoal === "pilihanGanda" ? s.pilihan.map((p) => p.text) : [];
      return {
        tipeSoal: s.tipeSoal,
        soalText: s.soalText,
        pilihan1: pilihanTexts[0] || "",
        pilihan2: pilihanTexts[1] || "",
        pilihan3: pilihanTexts[2] || "",
        pilihan4: pilihanTexts[3] || "",
        pilihan5: pilihanTexts[4] || "",
        kunciJawaban:
          s.tipeSoal === "pilihanGanda"
            ? String(s.kunciJawaban || 1)
            : s.tipeSoal === "teksSingkat"
            ? s.kunciJawabanText || ""
            : "",
        gambarUrl: s.gambarPreview && !s.gambar ? s.gambarPreview : "",
      };
    });

    const wsSoal = XLSX.utils.json_to_sheet(soalRows, { header: soalHeaders });
    XLSX.utils.sheet_add_aoa(wsSoal, [soalHeaders], { origin: "A1" });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSetting, "PENGATURAN_UJIAN");
    XLSX.utils.book_append_sheet(wb, wsSoal, "TEMPLATE_SOAL");

    downloadWorkbook(wb, "export_ujian_dan_soal.xlsx");
  };

  const handleImportExcelFile = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });

      // --- Import Pengaturan (opsional) ---
      const settingSheetName = wb.SheetNames.find(
        (n) => n.toLowerCase() === "pengaturan_ujian"
      );
      if (settingSheetName) {
        const wsSetting = wb.Sheets[settingSheetName];
        const settingJson = XLSX.utils.sheet_to_json(wsSetting, {
          defval: "",
          raw: false,
        });
        const s0 = settingJson[0] || {};
        const norm = Object.fromEntries(
          Object.entries(s0).map(([k, v]) => [String(k).trim().toLowerCase(), v])
        );

        setKeterangan(String(norm["keterangan"] || ""));
        setTanggal(excelDateToISO(norm["tanggalmulai"] || norm["tanggal_mulai"]));
        setTanggalBerakhir(
          excelDateToISO(norm["tanggalberakhir"] || norm["tanggal_berakhir"])
        );
        setJamMulai(excelTimeToHHMM(norm["jammulai"] || norm["jam_mulai"]));
        setJamBerakhir(
          excelTimeToHHMM(norm["jamberakhir"] || norm["jam_berakhir"])
        );
        setDurasi(String(norm["durasimenit"] || norm["durasi"] || ""));
        setAcakSoal(excelBoolToJS(norm["acaksoal"]));
        setAcakOpsi(excelBoolToJS(norm["acakopsi"]));
      }

      // --- Import Soal ---
      const soalSheetName =
        wb.SheetNames.find((n) =>
          ["template_soal", "soal", "sheet1"].includes(n.toLowerCase())
        ) || wb.SheetNames[0];

      const wsSoal = wb.Sheets[soalSheetName];
      const json = XLSX.utils.sheet_to_json(wsSoal, { defval: "" });

      const imported = [];
      let idCounter = 1;

      for (const row of json) {
        const lowerRow = Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            String(k).trim().toLowerCase(),
            v,
          ])
        );

        const tipeSoal = normalizeTipe(
          lowerRow["tipesoal"] || lowerRow["tipe_soal"]
        );
        const soalText =
          lowerRow["soaltext"] ||
          lowerRow["soal_text"] ||
          lowerRow["pertanyaan"] ||
          "";

        if (!String(soalText).trim()) continue;

        const pilihanTexts = [];
        for (let i = 1; i <= 5; i++) {
          const val =
            lowerRow[`pilihan${i}`] ||
            lowerRow[`opsi${i}`] ||
            lowerRow[`opsi ${i}`] ||
            lowerRow[`choice${i}`] ||
            "";
          if (String(val).trim()) pilihanTexts.push(String(val));
        }

        let pgTexts = pilihanTexts;
        if (tipeSoal === "pilihanGanda") {
          if (pgTexts.length < 2) pgTexts = [...pgTexts, "", ""].slice(0, 2);
        } else {
          pgTexts = [];
        }

        const kunciRaw =
          lowerRow["kuncijawaban"] ||
          lowerRow["kunci_jawaban"] ||
          lowerRow["jawaban"] ||
          "";

        const gambarUrl =
          lowerRow["gambarurl"] || lowerRow["gambar_url"] || "";

        const pilihanObjs = pgTexts.map((t, idx) => ({
          id: idx + 1,
          text: t,
        }));

        imported.push({
          id: idCounter++,
          tipeSoal,
          soalText: String(soalText),
          gambar: null,
          gambarPreview: String(gambarUrl).trim() || null,
          pilihan:
            tipeSoal === "pilihanGanda"
              ? pilihanObjs
              : [
                  { id: 1, text: "" },
                  { id: 2, text: "" },
                ],
          kunciJawaban:
            tipeSoal === "pilihanGanda"
              ? parseKunciPG(kunciRaw, pgTexts)
              : 1,
          kunciJawabanText:
            tipeSoal === "teksSingkat" ? String(kunciRaw) : "",
        });
      }

      if (imported.length === 0) {
        alert("File Excel tidak berisi soal yang valid.");
        return;
      }

      setDaftarSoal(imported);
      alert(`Berhasil import ${imported.length} soal dari Excel.`);
    } catch (err) {
      console.error(err);
      alert("Gagal membaca file Excel. Pastikan formatnya sesuai template.");
    }
  };

  const handleClickImport = () => {
    if (excelInputRef.current) excelInputRef.current.click();
  };

  // === SUBMIT ===
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!jamMulai || !jamBerakhir) {
      alert("Jam mulai dan jam berakhir wajib diisi.");
      return;
    }
    if (!tanggalBerakhir) {
      alert("Tanggal berakhir wajib diisi.");
      return;
    }
    if (!durasi || parseInt(durasi, 10) <= 0) {
      alert("Durasi pengerjaan wajib diisi dan harus lebih dari 0.");
      return;
    }

    const soalList = daftarSoal.map((s) => ({
      tipeSoal: s.tipeSoal,
      soalText: s.soalText,
      pilihan:
        s.tipeSoal === "pilihanGanda" ? s.pilihan.map((p) => p.text) : [],
      kunciJawabanText:
        s.tipeSoal === "pilihanGanda"
          ? s.pilihan.find((p) => p.id === s.kunciJawaban)?.text || ""
          : s.tipeSoal === "teksSingkat"
          ? s.kunciJawabanText || ""
          : "",
    }));

    const formData = new FormData();
    formData.append(
      "data",
      JSON.stringify({
        keterangan,
        tanggal,
        tanggalBerakhir,
        jamMulai,
        jamBerakhir,
        durasi,
        acakSoal,
        acakOpsi,
        soalList,
      })
    );

    daftarSoal.forEach((s, i) => {
      if (s.gambar) formData.append(`gambar_${i}`, s.gambar);
    });

    try {
      const token = getAdminToken();
      if (!token) throw new Error("Token tidak ditemukan.");

      const res = await fetch("http://localhost:5000/api/ujian", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menyimpan ujian");

      setSuccessMessage("Ujian Berhasil Disimpan");
      setTimeout(() => setSuccessMessage(""), 7000);

      setKeterangan("");
      setTanggal("");
      setTanggalBerakhir("");
      setJamMulai("");
      setJamBerakhir("");
      setDurasi("");
      setAcakSoal(false);
      setAcakOpsi(false);

      setDaftarSoal([
        {
          id: 1,
          tipeSoal: "pilihanGanda",
          soalText: "",
          gambar: null,
          gambarPreview: null,
          pilihan: [
            { id: 1, text: "" },
            { id: 2, text: "" },
          ],
          kunciJawaban: 1,
          kunciJawabanText: "",
        },
      ]);
    } catch (err) {
      console.error("Error:", err);
      alert("Terjadi kesalahan: " + err.message);
    }
  };

  const labelClass =
    "block text-sm font-semibold text-gray-700 mb-1 tracking-wide";
  const inputClass =
    "block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm py-2.5 px-3";
  const textAreaClass =
    "block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm p-3 min-h-[100px]";
  const fieldsetClass =
    "bg-white rounded-xl border border-gray-100 shadow-sm p-6 transition duration-200";

  return (
    <div className="bg-gray-50 min-h-screen">
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg">
            <FaCheckCircle className="text-white w-5 h-5" />
            <span className="font-semibold text-base">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm border-b border-gray-300 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          🧩 Tambah Ujian
        </h2>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 py-2 px-4 rounded-md bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 transition text-sm"
          >
            <FaDownload className="w-4 h-4" />
            Template Excel
          </button>

          <button
            type="button"
            onClick={handleExportSoalExcel}
            className="flex items-center gap-2 py-2 px-4 rounded-md bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition text-sm"
          >
            <FaFileExcel className="w-4 h-4" />
            Export Ujian
          </button>

          <button
            type="button"
            onClick={handleClickImport}
            className="flex items-center gap-2 py-2 px-4 rounded-md bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 transition text-sm"
          >
            <FaUpload className="w-4 h-4" />
            Import Excel
          </button>

          <button
            type="submit"
            form="form-ujian"
            className="flex items-center gap-2 py-2.5 px-5 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition text-sm"
          >
            <FaSave className="w-4 h-4" />
            Simpan Semua Soal
          </button>

          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportExcelFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="p-6 md:p-10">
        <form
          id="form-ujian"
          onSubmit={handleSubmit}
          className="space-y-8 max-w-5xl mx-auto"
        >
          {/* PENGATURAN UJIAN */}
          <fieldset className={fieldsetClass}>
            <div className="flex items-center gap-2 mb-5 border-b pb-2 border-gray-200">
              <FaCogs className="text-blue-600 text-xl" />
              <h3 className="text-lg font-bold text-gray-800">
                Pengaturan Ujian
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Keterangan Ujian</label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div className="relative">
                <label className={labelClass}>
                  Tanggal Mulai (Akses Dibuka)
                </label>
                <div className="absolute inset-y-0 left-3 flex items-center pt-6 z-10">
                  <FaCalendarAlt className="text-gray-400" />
                </div>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={`${inputClass} pl-10`}
                  required
                />
              </div>

              <div className="relative">
                <label className={labelClass}>
                  Tanggal Berakhir (Akses Ditutup)
                </label>
                <div className="absolute inset-y-0 left-3 flex items-center pt-6 z-10">
                  <FaCalendarAlt className="text-gray-400" />
                </div>
                <input
                  type="date"
                  value={tanggalBerakhir}
                  onChange={(e) => setTanggalBerakhir(e.target.value)}
                  className={`${inputClass} pl-10`}
                  required
                />
              </div>

              <div className="relative">
                <label className={labelClass}>Jam Mulai (Akses Dibuka)</label>
                <div className="absolute inset-y-0 left-3 flex items-center pt-6 z-10">
                  <FaClock className="text-gray-400" />
                </div>
                <input
                  type="time"
                  value={jamMulai}
                  onChange={(e) => setJamMulai(e.target.value)}
                  className={`${inputClass} pl-10`}
                  required
                />
              </div>

              <div className="relative">
                <label className={labelClass}>
                  Jam Berakhir (Akses Ditutup)
                </label>
                <div className="absolute inset-y-0 left-3 flex items-center pt-6 z-10">
                  <FaClock className="text-gray-400" />
                </div>
                <input
                  type="time"
                  value={jamBerakhir}
                  onChange={(e) => setJamBerakhir(e.target.value)}
                  className={`${inputClass} pl-10`}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Durasi Pengerjaan (Menit)</label>
                <input
                  type="number"
                  min="1"
                  value={durasi}
                  onChange={(e) => setDurasi(e.target.value)}
                  className={inputClass}
                  placeholder="Contoh: 90"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ini adalah waktu hitung mundur yang akan didapat peserta setelah
                  menekan tombol "Mulai".
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex flex-col gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={acakSoal}
                    onChange={() => setAcakSoal(!acakSoal)}
                    className="h-4 w-4"
                  />
                  Acak soal pilihan ganda untuk setiap peserta
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={acakOpsi}
                    onChange={() => setAcakOpsi(!acakOpsi)}
                    className="h-4 w-4"
                  />
                  Acak jawaban pilihan ganda untuk setiap peserta
                </label>
              </div>
            </div>
          </fieldset>

          {/* DAFTAR SOAL */}
          {daftarSoal.map((soal, index) => (
            <fieldset key={soal.id} className={fieldsetClass}>
              <div className="flex justify-between items-center mb-5 border-b pb-2 border-gray-200">
                <div className="flex items-center gap-2">
                  <FaListAlt className="text-green-600 text-xl" />
                  <h3 className="text-lg font-bold text-gray-800">
                    Soal {index + 1}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleHapusSoal(soal.id)}
                  className="text-gray-400 hover:text-red-500 transition"
                  disabled={daftarSoal.length <= 1}
                >
                  <FaTrash />
                </button>
              </div>

              <div className="mb-4">
                <label className={labelClass}>
                  <FaImage className="inline mr-1 text-blue-500" />
                  Gambar Soal (opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(soal.id, e.target.files[0])}
                  className="block text-sm border border-gray-300 rounded-md p-1 w-full"
                />
                {soal.gambarPreview && (
                  <img
                    src={soal.gambarPreview}
                    alt="Preview"
                    className="mt-2 rounded-md border w-48 shadow-sm"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Tipe Soal</label>
                  <select
                    value={soal.tipeSoal}
                    onChange={(e) =>
                      handleSoalChange(soal.id, "tipeSoal", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="pilihanGanda">Pilihan Ganda</option>
                    <option value="teksSingkat">Teks Singkat (Auto-Nilai)</option>
                    <option value="esay">Esai (Nilai Manual)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Pertanyaan</label>
                  <textarea
                    value={soal.soalText}
                    onChange={(e) =>
                      handleSoalChange(soal.id, "soalText", e.target.value)
                    }
                    className={textAreaClass}
                    placeholder="Masukkan teks pertanyaan..."
                    required
                  />
                </div>
              </div>

              {soal.tipeSoal === "pilihanGanda" && (
                <div className="mt-5 border-t border-gray-200 pt-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    Pilihan Jawaban{" "}
                    <span className="text-xs text-gray-500 ml-1">
                      (Pilih satu sebagai jawaban benar)
                    </span>
                  </h4>

                  {soal.pilihan.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-md p-2.5 mb-2 hover:bg-gray-100 transition"
                    >
                      <input
                        type="radio"
                        checked={soal.kunciJawaban === p.id}
                        onChange={() => handleKunciJawabanChange(soal.id, p.id)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <input
                        type="text"
                        placeholder={`Pilihan ${i + 1}`}
                        value={p.text}
                        onChange={(e) =>
                          handlePilihanChange(soal.id, p.id, e.target.value)
                        }
                        className={`${inputClass} flex-1`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleHapusPilihan(soal.id, p.id)}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleTambahPilihan(soal.id)}
                    className="mt-2 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                  >
                    <FaPlus className="w-4 h-4" />
                    Tambah Pilihan
                  </button>
                </div>
              )}

              {soal.tipeSoal === "teksSingkat" && (
                <div className="mt-5 border-t border-gray-200 pt-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">
                    Kunci Jawaban
                  </h4>
                  <input
                    type="text"
                    placeholder="Masukkan jawaban singkat yang benar (case-insensitive)"
                    value={soal.kunciJawabanText}
                    onChange={(e) =>
                      handleSoalChange(
                        soal.id,
                        "kunciJawabanText",
                        e.target.value
                      )
                    }
                    className={inputClass}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Gunakan tanda <b>,</b> untuk memisahkan jika ada lebih dari
                    satu jawaban benar.
                    <br />
                    Contoh: <b>2 , dua , 2 (dua)</b>
                  </p>
                </div>
              )}

              {soal.tipeSoal === "esay" && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md mt-4">
                  <div className="flex">
                    <FaCheckCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                    <p className="ml-3 text-sm text-blue-700">
                      Untuk soal esai, jawaban akan dinilai manual oleh pengajar.
                    </p>
                  </div>
                </div>
              )}
            </fieldset>
          ))}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleTambahSoal}
              className="flex items-center gap-2 py-2.5 px-4 rounded-md bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
            >
              <FaPlus className="w-4 h-4" />
              Tambah Soal Lagi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TambahSoal;
