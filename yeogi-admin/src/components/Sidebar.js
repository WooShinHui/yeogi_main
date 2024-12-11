import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../axiosConfig";
import "./Sidebar.css";
import defaultProfile from "../images/default-image.jpg";

function Sidebar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminInfo, setAdminInfo] = useState({
    name: "",
    email: "",
    position: "",
    profile_image: null,
  });

  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      try {
        const response = await api.get("/api/admin/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAdminInfo(response.data);
        setIsLoggedIn(true);
      } catch (error) {
        console.error("관리자 정보 조회 실패:", error);
        setIsLoggedIn(false);
        localStorage.removeItem("token");
        localStorage.removeItem("adminId");
        navigate("/admin/login");
      }
    };

    checkLoginStatus();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminId");
    setIsLoggedIn(false);
    setAdminInfo({
      name: "",
      email: "",
      position: "",
      profile_image: null,
    });
    navigate("/"); // "/admin/login" -> "/"
  };

  // 로그인 상태가 아니면 빈 컴포넌트 반환
  if (!isLoggedIn) {
    return null;
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="admin-profile">
          <div className="profile-image">
            <img
              src={adminInfo.profile_image || defaultProfile}
              alt="관리자 프로필"
            />
          </div>
          <div className="profile-info">
            <h3 className="admin-name">{adminInfo.name}</h3>
            <p className="admin-email">{adminInfo.email}</p>
            <span className="admin-position">{adminInfo.position}</span>
          </div>
        </div>
      </div>
      <ul className="sidebar-menu">
        <li>
          <Link to="/dashboard">대시보드</Link>
        </li>
        <li>
          <Link to="/register-accommodation">숙소 등록</Link>
        </li>
        <li>
          <Link to="/accommodation-edit">숙소 정보 수정</Link>
        </li>
        <li>
          <Link to="/bookings">예약 관리</Link>
        </li>
        <li>
          <Link to="/reviews">리뷰 관리</Link>
        </li>
        <li>
          <Link to="/users">회원 관리</Link>
        </li>
        <li>
          <Link to="/inquiry">문의 관리</Link>
        </li>
      </ul>
      {isLoggedIn && (
        <div className="sidebar-footer">
          <hr className="divider" />
          <button className="logout-button" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      )}
    </nav>
  );
}

export default Sidebar;
