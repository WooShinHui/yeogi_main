import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css"; // CSS 파일을 import 합니다

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/admin/login", {
        email,
        password,
      });
      console.log("Login response:", response.data);
      localStorage.setItem("token", response.data.token);
      console.log("Token saved:", localStorage.getItem("token"));
      localStorage.setItem("adminId", response.data.adminId);
      localStorage.setItem("adminName", response.data.name);

      if (response.data.hasAccommodations) {
        navigate("/admin/dashboard");
      } else {
        navigate("/admin/register-accommodation");
      }
    } catch (error) {
      setError("로그인에 실패했습니다.");
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">비밀번호:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-button">
          로그인
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;
