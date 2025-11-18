import Sidebar from "../component/sidebar.jsx";
import { Outlet } from "react-router-dom";
import Footer from "../component/footer.jsx"; 

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>

        <Footer bgUrl={null} />
        
      </main>
    </div>
  );
};

export default AdminLayout;