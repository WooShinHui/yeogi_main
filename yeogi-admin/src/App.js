import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import AdminLogin from "./components/AdminLogin";
import AdminRegister from "./components/AdminRegister";
import AdminRedirect from "./components/AdminRedirect";
import RegisterAccommodation from "./components/RegisterAccommodation";
import AccommodationEdit from "./components/AccommodationsEdit";
import BookingManagement from "./components/BookingManagement";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/admin/redirect" element={<AdminRedirect />} />
            <Route
              path="/admin/register-accommodation"
              element={<RegisterAccommodation />}
            />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Navigate to="/admin/redirect" />} />
            <Route
              path="/admin/accommodation-edit"
              element={<AccommodationEdit />}
            />
            <Route path="/admin/bookings" element={<BookingManagement />} />
            <Route path="*" element={<Navigate to="/admin/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
