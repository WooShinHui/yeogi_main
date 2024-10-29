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
import ProtectedRoute from "./components/ProtectRoute";
import "./App.css";
import ReviewManagement from "./components/ReviewManagement";
import UserManagement from "./components/UserManagement";
import InquiryManagement from "./components/InquiryManagement";
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
              element={
                <ProtectedRoute>
                  <RegisterAccommodation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/accommodation-edit"
              element={
                <ProtectedRoute>
                  <AccommodationEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/accommodation-edit/:id"
              element={
                <ProtectedRoute>
                  <AccommodationEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute>
                  <BookingManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inquiry"
              element={
                <ProtectedRoute>
                  <InquiryManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reviews"
              element={
                <ProtectedRoute>
                  <ReviewManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<Navigate to="/admin/redirect" />} />
            <Route path="*" element={<Navigate to="/admin/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
