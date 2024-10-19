import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api/axiosConfig";
import "./Component.css";

function NextPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isKakaoInitialized, setIsKakaoInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://developers.kakao.com/sdk/js/kakao.js";
    script.async = true;
    script.onload = () => {
      window.Kakao.init("2d218dc43789eda5952b97c178f26fe9");
      setIsKakaoInitialized(true);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleKakaoLogin = useCallback(
    async (kakaoEmail) => {
      try {
        const response = await api.post("/api/kakao-login", {
          email: kakaoEmail,
        });
        if (response.data && response.data.token) {
          localStorage.setItem("token", response.data.token);
          try {
            const payload = JSON.parse(atob(response.data.token.split(".")[1]));
            console.log("Decoded token payload:", payload);
            localStorage.setItem("userId", payload.id);
            navigate("/yeogi");
          } catch (error) {
            console.error("토큰 디코딩 실패:", error);
            // 토큰 디코딩에 실패해도 로그인은 성공한 것으로 처리
            navigate("/yeogi");
          }
        } else {
          throw new Error("토큰이 없거나 올바르지 않습니다.");
        }
      } catch (error) {
        console.error("카카오 로그인 실패:", error);
        handleLoginError(error);
      }
    },
    [navigate]
  );

  const checkKakaoLogin = useCallback(async () => {
    if (isKakaoInitialized && window.Kakao.Auth.getAccessToken()) {
      try {
        const response = await window.Kakao.API.request({
          url: "/v2/user/me",
        });
        const kakaoEmail = response.kakao_account.email;
        setEmail(kakaoEmail);
        handleKakaoLogin(kakaoEmail);
      } catch (error) {
        console.error("카카오 사용자 정보 가져오기 실패:", error);
      }
    }
  }, [isKakaoInitialized, handleKakaoLogin]);

  useEffect(() => {
    if (isKakaoInitialized) {
      checkKakaoLogin();
    }
  }, [isKakaoInitialized, checkKakaoLogin]);

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");

    try {
      const response = await api.post("/api/login", { email, password });
      if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
        try {
          const payload = JSON.parse(atob(response.data.token.split(".")[1]));
          console.log("Decoded token payload:", payload);
          localStorage.setItem("userId", payload.id);
          navigate("/yeogi");
        } catch (error) {
          console.error("토큰 디코딩 실패:", error);
          // 토큰 디코딩에 실패해도 로그인은 성공한 것으로 처리
          navigate("/yeogi");
        }
      } else {
        throw new Error("토큰이 없거나 올바르지 않습니다.");
      }
    } catch (error) {
      console.error("로그인 실패:", error);
      handleLoginError(error);
    }
  };

  const handleLoginError = (error) => {
    if (error.response) {
      console.error("서버 응답:", error.response.data);
      const errorMessage =
        error.response.data.error || "로그인에 실패했습니다.";

      if (typeof errorMessage === "string") {
        if (errorMessage.toLowerCase().includes("이메일")) {
          setEmailError(errorMessage);
        } else if (errorMessage.toLowerCase().includes("비밀번호")) {
          setPasswordError(errorMessage);
        } else {
          setEmailError(errorMessage);
        }
      } else {
        setEmailError("알 수 없는 오류가 발생했습니다.");
      }
    } else if (error.request) {
      console.error("요청 오류:", error.request);
      setEmailError("서버에 연결할 수 없습니다.");
    } else {
      console.error("기타 오류:", error.message);
      setEmailError("알 수 없는 오류가 발생했습니다.");
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
        <div className="SNS-Login">
          <button
            onClick={() => {
              if (isKakaoInitialized) {
                window.Kakao.Auth.login({
                  success: function (authObj) {
                    console.log(authObj);
                    checkKakaoLogin();
                  },
                  fail: function (err) {
                    console.error(err);
                  },
                });
              } else {
                console.error("Kakao SDK is not initialized");
              }
            }}
          >
            <img src="/images/kakao.png" alt="Kakao" />
            <span>카카오로 로그인</span>
          </button>
        </div>
      </div>
      <div className="Login-Button">
        <button onClick={handleLogin} className="Button-Login">
          <p>로그인</p>
        </button>
      </div>
    </div>
  );
}

export default NextPage;
