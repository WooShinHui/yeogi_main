import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../Header.css";

function Header({ title, showBackButton, centerTitle }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

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

      <div className="menu-container">
        <button onClick={toggleMenu} className="menu-button">
          <img src="/images/Menu.svg" alt="메뉴" />
        </button>
        {showMenu && (
          <div className="dropdown-menu">
            <Link to="/mypage" onClick={toggleMenu}>
              마이 페이지
            </Link>
            <Link to="/edit-profile" onClick={toggleMenu}>
              회원정보 수정
            </Link>
            <Link to="/inquiry" onClick={toggleMenu}>
              1:1 문의
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
