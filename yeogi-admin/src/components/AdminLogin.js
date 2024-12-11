import React, { useState } from "react";
import api from "../axiosConfig";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    adminCode: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/admin/login", {
        email: formData.email,
        password: formData.password,
        adminCode: formData.adminCode,
      });

      console.log("Login response:", response.data); // 응답 확인

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("adminId", response.data.adminId);
        console.log("Stored token:", localStorage.getItem("token")); // 토큰 저장 확인
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.response?.data?.error || "로그인에 실패했습니다.");
    }
  };
  return (
    <div className="admin-login-container">
      <h2 className="admin-login-title">관리자 로그인</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit} className="admin-login-form">
        <div className="form-group">
          <label htmlFor="email">이메일:</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">비밀번호:</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="adminCode">관리자 코드:</label>
          <input
            id="adminCode"
            name="adminCode"
            type="text"
            value={formData.adminCode}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="login-button">
          로그인
        </button>
        <div className="register-link-container">
          <button
            type="button"
            className="register-link"
            onClick={() => navigate("/register")}
          >
            <p>회원가입</p>
          </button>
        </div>
      </form>
    </div>
  );
};
export default AdminLogin;
