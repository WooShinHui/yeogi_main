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
            {/* 루트 경로를 로그인 페이지로 설정 */}
            <Route path="/" element={<AdminLogin />} />
            <Route path="/register" element={<AdminRegister />} />
            <Route path="/redirect" element={<AdminRedirect />} />

            {/* Protected Routes */}
            <Route
              path="/register-accommodation"
              element={
                <ProtectedRoute>
                  <RegisterAccommodation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accommodation-edit"
              element={
                <ProtectedRoute>
                  <AccommodationEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accommodation-edit/:id"
              element={
                <ProtectedRoute>
                  <AccommodationEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inquiry"
              element={
                <ProtectedRoute>
                  <InquiryManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <ProtectedRoute>
                  <ReviewManagement />
                </ProtectedRoute>
              }
            />

            {/* Redirect old admin paths to new paths */}
            <Route path="/admin/*" element={<Navigate to="/" />} />

            {/* Catch all other routes and redirect to login */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
