import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../Header.css";

function Header({ title, showBackButton, centerTitle }) {
  const navigate = useNavigate();

  return (
    <header className="yeogi-header">
      {showBackButton ? (
        <button onClick={() => navigate(-1)} className="back-button">
          <img src="/images/back-arrow.svg" alt="뒤로 가기" />
        </button>
      ) : (
        <Link to="/Yeogi" className="logo-container">
          <img
            src="/images/yeogi.svg"
            className="yeogi-header-logo"
            alt="여기 로고"
          />
        </Link>
      )}

      {title && (
        <h1 className={`header-title ${centerTitle ? "center-title" : ""}`}>
          {title}
        </h1>
      )}

      <Link to="/mypage" className="mypage-button">
        <img src="/images/mypage.svg" alt="마이페이지" />
      </Link>
    </header>
  );
}

export default Header;
