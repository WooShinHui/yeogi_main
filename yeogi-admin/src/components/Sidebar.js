import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./Sidebar.css";
import defaultProfile from "../images/default-image.jpg";

function Sidebar() {
  const [adminInfo, setAdminInfo] = useState({
    name: "",
    email: "",
    position: "",
    profile_image: null,
  });

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await axios.get("/api/admin/profile", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setAdminInfo(response.data);
      } catch (error) {
        console.error("관리자 정보 조회 실패:", error);
      }
    };

    fetchAdminInfo();
  }, []);

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
          <Link to="/admin/dashboard">대시보드</Link>
        </li>
        <li>
          <Link to="/admin/register-accommodation">숙소 등록</Link>
        </li>
        <li>
          <Link to="/admin/accommodation-edit">숙소 정보 수정</Link>
        </li>
        <li>
          <Link to="/admin/bookings">예약 관리</Link>
        </li>
        <li>
          <Link to="/admin/reviews">리뷰 관리</Link>
        </li>
        <li>
          <Link to="/admin/users">회원 관리</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Sidebar;
