// src/components/AdminDashboard.js
import React, { useState, useEffect } from "react";
import axios from "axios";

function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get("/api/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        });
        setDashboardData(response.data);
      } catch (error) {
        console.error("대시보드 데이터 조회 실패:", error);
      }
    };

    fetchDashboardData();
  }, []);

  if (!dashboardData) return <div>로딩 중...</div>;

  return (
    <div>
      <h2>관리자 대시보드</h2>
      <p>총 예약 수: {dashboardData.totalBookings}</p>
      <p>오늘의 체크인: {dashboardData.todayCheckIns}</p>
      <p>오늘의 체크아웃: {dashboardData.todayCheckOuts}</p>
    </div>
  );
}

export default AdminDashboard;
