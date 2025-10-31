import Sidebar from "../component/sidebar.jsx";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Admin */}
      <Sidebar />

      {/* Konten utama + Footer */}
      <main className="flex-1 flex flex-col">
        {/* Area konten yang bisa di-scroll */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        {/* FOOTER */}
        <footer className="w-full border-t border-gray-200 bg-white py-3">
          <div className="max-w-7xl mx-auto text-center text-[12px] text-gray-500">
            © {new Date().getFullYear()} BPS Kota Salatiga. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AdminLayout;
