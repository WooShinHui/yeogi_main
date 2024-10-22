import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>여기어때 관리자</h2>
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
