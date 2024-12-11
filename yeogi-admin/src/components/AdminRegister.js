import React, { useState } from "react";
import api from "../axiosConfig";
import { useNavigate } from "react-router-dom";
import "./AdminRegister.css";

function AdminRegister() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phoneNumber: "",
    position: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();

  const positions = ["매니저", "사원", "대표", "기타"];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!agreeTerms) {
      setError("이용 약관에 동의해야 합니다.");
      return;
    }
    try {
      const response = await api.post(
        "/api/admin/request-verification",
        formData
      );
      setMessage(response.data.message);
      setIsCodeSent(true);
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.error || "인증 코드 요청 중 오류가 발생했습니다."
      );
      setMessage("");
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/admin/verify-and-register", {
        email: formData.email,
        verificationCode,
      });
      setMessage(response.data.message);
      setTimeout(() => navigate("/admin/login"), 3000);
    } catch (error) {
      console.error("Error response:", error.response);
      setError(
        error.response?.data?.error || "인증 및 등록 중 오류가 발생했습니다."
      );
    }
  };
  return (
    <div className="admin-register-container">
      <h2 className="admin-register-title">관리자 회원가입</h2>
      <form
        onSubmit={isCodeSent ? handleVerifyAndRegister : handleRequestCode}
        className="admin-register-form"
      >
        <div className="form-group">
          <label htmlFor="email">이메일:</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isCodeSent}
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
            disabled={isCodeSent}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">비밀번호 확인:</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={isCodeSent}
          />
        </div>
        <div className="form-group">
          <label htmlFor="name">이름:</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isCodeSent}
          />
        </div>
        <div className="form-group">
          <label htmlFor="phoneNumber">전화번호:</label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            disabled={isCodeSent}
          />
        </div>
        <div className="form-group">
          <label htmlFor="position">직책:</label>
          <select
            id="position"
            name="position"
            value={formData.position}
            onChange={handleChange}
            required
            disabled={isCodeSent}
          >
            <option value="">직책을 선택하세요</option>
            {positions.map((position, index) => (
              <option key={index} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        {!isCodeSent && (
          <div className="form-group-checkbox">
            <label>
              <input
                className="checkbox"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                required
              />
            </label>
            <span>이용 약관에 동의합니다.</span>
          </div>
        )}
        {isCodeSent && (
          <div className="form-group">
            <label htmlFor="verificationCode">인증 코드:</label>
            <input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
            />
          </div>
        )}
        <button
          type="submit"
          className={isCodeSent ? "register-button" : "register-button"}
        >
          {isCodeSent ? "인증 및 등록" : "인증 코드 요청"}
        </button>
      </form>
    </div>
  );
}

export default AdminRegister;
