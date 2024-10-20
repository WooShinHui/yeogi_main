import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  console.log("Current token:", token); // 디버깅을 위한 로그

  if (!token) {
    console.log("No token found, redirecting to login"); // 디버깅을 위한 로그
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
