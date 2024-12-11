import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Component.css";
import api from "./api/axiosConfig"; // 추가
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [birth, setBirth] = useState("");
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [birthError, setBirthError] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    let hasError = false;

    if (password !== passwordCheck) {
      setPasswordMatchError("비밀번호를 확인해주세요.");
      hasError = true;
    } else {
      setPasswordMatchError("");
    }

    if (birth.length !== 8) {
      setBirthError("생년월일을 확인하세요.");
      hasError = true;
    } else {
      setBirthError("");
    }

    if (!nickname.trim()) {
      setNicknameError("닉네임을 입력해주세요.");
      hasError = true;
    } else {
      setNicknameError("");
    }

    if (!phoneNumber.trim()) {
      setPhoneNumberError("전화번호를 입력해주세요.");
      hasError = true;
    } else {
      setPhoneNumberError("");
    }

    if (hasError) return;

    try {
      const response = await api.post("/request-verification-code", {
        email,
        password,
        birth,
        nickname,
        phoneNumber,
      });

      if (response.data.message === "인증 코드 전송 성공") {
        setIsCodeSent(true);
        setGeneratedCode(response.data.verificationCode);
      } else {
        setEmailError(response.data.error || "인증 코드 전송 실패");
      }
    } catch (error) {
      console.error("에러 발생:", error);
      setEmailError(error.response?.data?.error || "서버 오류가 발생했습니다");
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode === generatedCode) {
      try {
        const response = await api.post("/register", {
          email,
          password,
          birth,
          nickname,
          phoneNumber,
        });

        if (response.data.message === "사용자 등록 완료") {
          navigate("/next-page");
        } else {
          setError(response.data.error || "등록 실패");
        }
      } catch (error) {
        console.error("등록 실패:", error);
        setError(error.response?.data?.error || "서버 오류가 발생했습니다");
      }
    } else {
      setError("잘못된 인증 코드입니다.");
    }
  };

  return (
    <div className="App">
      <div className="App-header">
        <p>회원가입</p>
      </div>
      <div className="Input">
        <input
          className="Email"
          placeholder="이메일"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError("");
          }}
        />
        {emailError && (
          <div className="Error">
            <p>{emailError}</p>
          </div>
        )}
        <input
          className="Password"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError("");
          }}
        />
        {passwordError && (
          <div className="Error">
            <p>{passwordError}</p>
          </div>
        )}
        <input
          type="password"
          className="Password-Check"
          placeholder="비밀번호 확인"
          value={passwordCheck}
          onChange={(e) => setPasswordCheck(e.target.value)}
        />
        {passwordMatchError && (
          <div className="Error">
            <p>{passwordMatchError}</p>
          </div>
        )}
        <input
          className="Nickname"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        {nicknameError && (
          <div className="Error">
            <p>{nicknameError}</p>
          </div>
        )}
        <input
          className="PhoneNumber"
          placeholder="전화번호"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        {phoneNumberError && (
          <div className="Error">
            <p>{phoneNumberError}</p>
          </div>
        )}
      </div>
      <div className="Birth">
        <p>생년월일</p>
        <div className="Input-Birth">
          <input
            className="Year"
            placeholder="년도(8자리)"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
          {birthError && (
            <div className="Error">
              <p>{birthError}</p>
            </div>
          )}
        </div>
      </div>
      <div className="Login-Button">
        {!isCodeSent ? (
          <button onClick={handleRegister} className="Button-Login">
            회원가입
          </button>
        ) : (
          <div className="Verification-Code">
            <input
              className="Code-Input"
              placeholder="인증 코드 입력"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
            <button onClick={handleVerifyCode} className="Button-Login">
              인증 코드 확인
            </button>
            {error && <div className="Error">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
