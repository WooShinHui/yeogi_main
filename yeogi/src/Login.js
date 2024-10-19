import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Component.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [birth, setBirth] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [birthError, setBirthError] = useState(""); // 생년월일 오류 상태 추가

  const navigate = useNavigate();

  const handleRegister = () => {
    let hasError = false;

    if (password !== passwordCheck) {
      setPasswordMatchError("비밀번호를 확인해주세요.");
      hasError = true;
    } else {
      setPasswordMatchError("");
    }
    if (birth.length !== 8) {
      setBirthError("생년월일을 확인하세요."); // 생년월일 오류 메시지 설정
      hasError = true;
    } else {
      setBirthError(""); // 오류 메시지 초기화
    }
    if (hasError) return;

    // 인증 코드 요청
    fetch("http://localhost:3001/request-verification-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, birth }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "사용자 등록 성공") {
          setIsCodeSent(true);
          setGeneratedCode(data.verificationCode);
        } else {
          setEmailError(data.error || "이메일 중복");
        }
      })
      .catch((error) => {
        console.error("에러 발생:", error);
        alert("서버 오류");
      });
  };

  const handleVerifyCode = () => {
    if (verificationCode === generatedCode) {
      // 인증 코드 확인 후 데이터베이스에 저장
      fetch("http://localhost:3001/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, birth }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "사용자 등록 완료") {
            navigate("/next-page");
          } else {
            setError(data.error || "등록 실패");
          }
        });
    } else {
      setError("잘못된 인증 코드입니다.");
    }
  };

  return (
    <div className="App">
      <div className="App-header">
        <p>로그인</p>
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
          <>
            <input
              placeholder="인증 코드 입력"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
            <button onClick={handleVerifyCode} className="Button-Login">
              인증 코드 확인
            </button>
            {error && <div className="Error">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
