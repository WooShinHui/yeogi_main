import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AdminRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/admin/register", {
        email,
        password,
        name,
      });
      // 회원가입 성공 시 로컬 스토리지에 토큰 저장 (백엔드에서 토큰을 제공한다고 가정)
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }
      // 숙소 등록 페이지로 이동
      navigate("/admin/register-accommodation");
    } catch (error) {
      setError(
        error.response?.data?.error || "회원가입 중 오류가 발생했습니다."
      );
    }
  };

  return (
    <div>
      <h2>관리자 회원가입</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>이메일:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>비밀번호:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label>이름:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <button type="submit">회원가입</button>
      </form>
    </div>
  );
}

export default AdminRegister;
