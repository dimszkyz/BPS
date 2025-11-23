import React, { useState, useEffect, useCallback } from "react";
import {
  FaUserShield,
  FaArrowLeft,
  FaListUl,
  FaEnvelopeOpenText,
  FaPoll,
  FaSearch,
  FaSyncAlt,
  FaSpinner,
  FaExclamationCircle,
  FaUserTie
} from "react-icons/fa";

// Import Komponen Tab Ujian
import TabUjianAdmin from "./TabUjianAdmin";
// Import Komponen Tab Undangan
import TabUndanganAdmin from "./TabUndanganAdmin";
// Import Komponen Tab Hasil (BARU)
import TabHasilAdmin from "./TabHasilAdmin";

const API_URL = "http://localhost:5000";

// ==========================================
// KOMPONEN UTAMA: LAYOUT DAFTAR ADMIN
// ==========================================
const LayoutDaftarAdmin = () => {
  const [viewMode, setViewMode] = useState("LIST"); // 'LIST' or 'DETAIL'
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState("ujian"); // 'ujian', 'undangan', 'hasil'
  
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("adminToken");
      const res = await fetch(`${API_URL}/api/admin-list`, { 
         headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      } else {
         setAdmins([]); 
      }
    } catch (error) {
      console.error("Network error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const filteredAdmins = admins.filter(a => 
    (a.username || "").toLowerCase().includes(search.toLowerCase()) || 
    (a.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAdmin = (admin) => {
    setSelectedAdmin(admin);
    setActiveTab("ujian");
    setViewMode("DETAIL");
  };

  const handleBackToList = () => {
    setSelectedAdmin(null);
    setViewMode("LIST");
  };

  // === TAMPILAN DETAIL ===
  if (viewMode === "DETAIL" && selectedAdmin) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col animate-in fade-in duration-300">
        {/* Header Detail */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBackToList}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                title="Kembali ke daftar"
              >
                <FaArrowLeft />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaUserShield className="text-indigo-600" />
                  {selectedAdmin.username}
                </h2>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  {selectedAdmin.email} 
                  <span className="w-1 h-1 rounded-full bg-gray-400"></span> 
                  Bergabung: {new Date(selectedAdmin.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-2 border-b border-gray-200">
             <button 
                onClick={() => setActiveTab("ujian")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 flex items-center gap-2 ${activeTab === 'ujian' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
             >
                <FaListUl /> Daftar Ujian
             </button>
             <button 
                onClick={() => setActiveTab("undangan")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 flex items-center gap-2 ${activeTab === 'undangan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
             >
                <FaEnvelopeOpenText /> Riwayat Undangan
             </button>
             <button 
                onClick={() => setActiveTab("hasil")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 flex items-center gap-2 ${activeTab === 'hasil' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
             >
                <FaPoll /> Hasil Ujian
             </button>
          </div>
        </div>

        {/* Konten Detail */}
        <div className="p-6 max-w-7xl mx-auto w-full">
           {/* Panggil Komponen Sesuai Tab Aktif */}
           {activeTab === "ujian" && <TabUjianAdmin adminId={selectedAdmin.id} />}
           {activeTab === "undangan" && <TabUndanganAdmin adminId={selectedAdmin.id} />}
           
           {/* Panggil TabHasilAdmin yang baru */}
           {activeTab === "hasil" && <TabHasilAdmin adminId={selectedAdmin.id} />}
        </div>
      </div>
    );
  }

  // === TAMPILAN LIST (UTAMA) ===
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* Header List */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-6 sticky top-0 z-40">
         <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
               <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FaUserShield className="text-indigo-600" />
                  Akses Daftar Admin
               </h2>
               <p className="text-gray-500 mt-1 text-sm">
                  Pantau aktivitas ujian, undangan, dan hasil dari admin yang terdaftar.
               </p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:flex-none">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                     type="text"
                     placeholder="Cari admin..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-full md:w-64 text-sm shadow-sm"
                  />
               </div>
               <button 
                  onClick={fetchAdmins}
                  className="p-2.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition shadow-sm"
                  title="Refresh Data"
               >
                  <FaSyncAlt className={loading ? "animate-spin" : ""} />
               </button>
            </div>
         </div>
      </div>

      {/* Content List */}
      <div className="p-8 max-w-7xl mx-auto w-full">
         {loading ? (
            <div className="text-center py-16 text-gray-500">
               <FaSpinner className="animate-spin text-4xl mx-auto mb-3 text-indigo-400"/>
               <p>Sedang memuat data admin...</p>
            </div>
         ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
               <FaExclamationCircle className="text-4xl mx-auto mb-3 text-gray-300"/>
               <h3 className="text-lg font-medium text-gray-800">Tidak ada admin ditemukan</h3>
               <p className="text-gray-500 text-sm">Coba kata kunci lain atau pastikan ada admin yang terdaftar selain Superadmin.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredAdmins.map((admin) => (
                  <div 
                     key={admin.id} 
                     onClick={() => handleSelectAdmin(admin)}
                     className="bg-white p-0 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-indigo-300 cursor-pointer transition-all duration-200 group relative overflow-hidden flex flex-col"
                  >
                     <div className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-4">
                           <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                              <FaUserTie size={20} />
                           </div>
                           <span className="text-[10px] font-bold tracking-wider px-2 py-1 bg-gray-100 text-gray-600 rounded uppercase border border-gray-200">
                              {admin.role}
                           </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition mb-1">
                           {admin.username}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{admin.email}</p>
                     </div>
                     
                     <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs">
                        <span className="text-gray-400"></span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                           Lihat Detail &rarr;
                        </span>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
};

export default LayoutDaftarAdmin;