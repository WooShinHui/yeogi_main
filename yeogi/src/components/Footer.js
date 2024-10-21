import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../Footer.css";

function Footer() {
  const location = useLocation();

  const getIconColor = (path) => {
    return location.pathname === path ? "icon-active" : "";
  };

  const getTextClass = (path) => {
    return location.pathname === path ? "text-active" : "";
  };

  return (
    <nav className="bottom-navigation">
      <Link to="/yeogi" className={`nav-item ${getIconColor("/yeogi")}`}>
        <img src="/images/icon-home.png" alt="홈" className="nav-icon" />
        <span className={getTextClass("/yeogi")}>홈</span>
      </Link>
      <Link to="/mapPage" className={`nav-item ${getIconColor("/mapPage")}`}>
        <img src="/images/icon-map.png" alt="지도" className="nav-icon" />
        <span className={getTextClass("/mapPage")}>지도</span>
      </Link>
      <Link
        to="/favorites"
        className={`nav-item ${getIconColor("/favorites")}`}
      >
        <img src="/images/icon-heart.png" alt="찜" className="nav-icon" />
        <span className={getTextClass("/favorites")}>찜</span>
      </Link>
      <Link to="/search" className={`nav-item ${getIconColor("/search")}`}>
        <img src="/images/icon-search.png" alt="검색" className="nav-icon" />
        <span className={getTextClass("/search")}>검색</span>
      </Link>
      <Link to="/mypage" className={`nav-item ${getIconColor("/mypage")}`}>
        <img src="/images/icon-user.png" alt="내 정보" className="nav-icon" />
        <span className={getTextClass("/mypage")}>내 숙소</span>
      </Link>
    </nav>
  );
}

export default Footer;
