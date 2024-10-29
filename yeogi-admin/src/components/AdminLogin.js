import React, { useState } from "react";
import axios from "axios";
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
      console.log("Sending login request:", formData);
      const response = await axios.post("/api/admin/login", formData);
      console.log("Login response:", response.data);

      if (response.data.token) {
        localStorage.setItem("token", response.data.token); // adminToken -> token으로 변경
        localStorage.setItem("adminId", response.data.adminId);
        console.log("Token stored:", localStorage.getItem("token"));

        // axios 기본 헤더 설정
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.token}`;

        navigate("/admin/dashboard");
      } else {
        setError("토큰이 발급되지 않았습니다.");
      }
    } catch (error) {
      console.error("Login error:", error.response?.data);
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
      </form>
    </div>
  );
};
export default AdminLogin;
