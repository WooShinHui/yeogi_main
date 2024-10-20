import React, { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./Dashboard.css";

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    today_check_ins: 0,
    today_check_outs: 0,
    total_bookings: 0,
    monthly_revenue: 0,
    average_stay_duration: 0,
    recentBookings: [],
    dailyRevenue: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get("/api/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        console.log("Dashboard data:", response.data);
        setDashboardData(response.data);
      } catch (error) {
        console.error("대시보드 데이터 조회 실패:", error);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString) => {
    return format(parseISO(dateString), "yyyy-MM-dd");
  };
  return (
    <div className="dashboard">
      <h1 className="dashboard-title">관리자 대시보드</h1>
      <div className="dashboard-stats">
        <div className="left-column">
          <div className="check-in-out-container">
            <div className="card check-in">
              <h2 className="card-title">체크인</h2>
              <p
                className={`card-value ${
                  dashboardData.today_check_ins > 0 ? "highlight" : "0"
                }`}
              >
                {dashboardData.today_check_ins}
              </p>
            </div>
            <div className="card check-out">
              <h2 className="card-title">체크아웃</h2>
              <p
                className={`card-value ${
                  dashboardData.today_check_outs > 0 ? "highlight red" : ""
                }`}
              >
                {dashboardData.today_check_outs}
              </p>
            </div>
          </div>
          <div className="card total-bookings">
            <h2 className="card-title">총 예약 수</h2>
            <p className="card-value">{dashboardData.total_bookings}</p>
          </div>
        </div>
        <div className="right-column">
          <div className="card monthly-revenue">
            <h2 className="card-title">이번 달 매출</h2>
            <p className="card-value">
              {new Intl.NumberFormat("ko-KR", {
                style: "currency",
                currency: "KRW",
              }).format(dashboardData.monthly_revenue || 0)}
            </p>
            {dashboardData.dailyRevenue &&
            dashboardData.dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      new Intl.NumberFormat("ko-KR", {
                        style: "currency",
                        currency: "KRW",
                      }).format(value)
                    }
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="일별 매출"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>일별 매출 데이터가 없습니다.</p>
            )}
          </div>
          <div className="card average-stay">
            <h2 className="card-title">평균 숙박 일수</h2>
            <p className="card-value">
              {dashboardData.average_stay_duration?.toFixed(1) || 0}일
            </p>
          </div>
        </div>
      </div>
      <div className="card recent-bookings">
        <h2 className="card-title">최근 예약</h2>
        <ul className="booking-list">
          {dashboardData.recentBookings.map((booking) => (
            <li key={booking.id} className="booking-item">
              <span className="booking-name">{booking.accommodation_name}</span>
              <span className="booking-date">
                {formatDate(booking.check_in_date)} ~{" "}
                {formatDate(booking.check_out_date)}
              </span>
              <span className="guest-name">예약자: {booking.nickname}</span>
              <span className="guest-email">이메일: {booking.email}</span>
              <span className="guest-phone">
                전화번호: {booking.phone_number || "미등록"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
