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
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    today_check_ins: 0,
    today_check_outs: 0,
    total_bookings: 0,
    monthly_revenue: 0,
    average_stay_duration: 0,
    recentBookings: [],
    dailyRevenue: [],
    dailyCheckIns: [],
    popularAccommodations: [],
    recentReviews: [],
    averageRating: 0,
  });
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const handleManageReview = (review) => {
    setSelectedReview(review);
    setShowDeleteModal(true);
  };

  const handleDeleteReview = async () => {
    try {
      console.log("Deleting review with ID:", selectedReview.id); // 디버깅을 위한 로그 추가
      const response = await axios.delete(
        `/api/admin/reviews/${selectedReview.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      console.log("Delete response:", response.data); // 디버깅을 위한 로그 추가

      // 대시보드 데이터 새로고침
      const dashboardResponse = await axios.get("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setDashboardData(dashboardResponse.data);
      setShowDeleteModal(false);
      setSelectedReview(null);
    } catch (error) {
      console.error("리뷰 삭제 중 오류 발생:", error);
      // 사용자에게 오류 메시지 표시
      alert("리뷰 삭제 중 오류가 발생했습니다.");
    }
  };
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(
          <span key={i} className="star filled">
            ★
          </span>
        );
      } else {
        stars.push(
          <span key={i} className="star">
            ☆
          </span>
        );
      }
    }
    return stars;
  };

  const handleManageAccommodation = (accommodationId) => {
    navigate(`/admin/accommodation-edit/${accommodationId}`);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get("/api/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
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
        <div className="column left-column">
          <div className="card check-in-out-container">
            <div className="check-in">
              <h2 className="card-title">오늘의 체크인</h2>
              <p
                className={`card-value ${
                  dashboardData.today_check_ins > 0 ? "highlight" : ""
                }`}
              >
                {dashboardData.today_check_ins}
              </p>
            </div>
            <div className="check-out">
              <h2 className="card-title">오늘의 체크아웃</h2>
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
          <div className="stats-row">
            <div className="stats-card average-stay">
              <h2 className="card-title">평균 숙박 일수</h2>
              <p className="card-value">
                {dashboardData.average_stay_duration?.toFixed(1) || 0}일
              </p>
            </div>
            <div className="stats-card average-rating">
              <h2 className="card-title">평균 평점</h2>
              <p className="card-value">
                {renderStars(Math.round(dashboardData.averageRating))}
              </p>
              <p>{dashboardData.averageRating.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="column right-column">
          <div className="card revenue-charts">
            <div className="revenue-chart monthly-revenue">
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
            <div className="revenue-chart">
              <h2 className="card-title">일일 체크인 수</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.dailyCheckIns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), "MM/dd")}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `${value}명`}
                    labelFormatter={(label) =>
                      format(new Date(label), "yyyy-MM-dd")
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="check_ins"
                    name="체크인 수"
                    stroke="#82ca9d"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      <div className="dashboard-bottom">
        <div className="card popular-accommodations">
          <h2 className="card-title">인기 숙소 순위</h2>
          {dashboardData.popularAccommodations &&
          dashboardData.popularAccommodations.length > 0 ? (
            <ul className="popular-list">
              {dashboardData.popularAccommodations.map(
                (accommodation, index) => (
                  <li key={accommodation.id} className="popular-item">
                    <span className="rank">{index + 1}</span>
                    <span className="name">{accommodation.name}</span>
                    <button
                      className="manage-button"
                      onClick={() =>
                        handleManageAccommodation(accommodation.id)
                      }
                    >
                      관리
                    </button>
                  </li>
                )
              )}
            </ul>
          ) : (
            <p>인기 숙소 데이터가 없습니다.</p>
          )}
        </div>
        <div className="card recent-reviews">
          <h2 className="card-title">최근 리뷰</h2>
          <ul className="review-list">
            {dashboardData.recentReviews.map((review) => (
              <li key={review.id} className="review-item">
                <div className="review-accommodation">
                  {review.accommodation_name}
                </div>
                <div className="review-rating">
                  {renderStars(review.rating)}
                </div>
                <div className="review-comment">{review.comment}</div>
                <div className="review-user">작성자: {review.nickname}</div>
                <div className="review-date">
                  {formatDate(review.created_at)}
                </div>
                <button
                  className="manage-button"
                  onClick={() => handleManageReview(review)}
                >
                  관리
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card recent-bookings">
          <h2 className="card-title">최근 예약</h2>
          <ul className="booking-list">
            {dashboardData.recentBookings.map((booking) => (
              <li key={booking.id} className="booking-item">
                <span className="booking-name">
                  {booking.accommodation_name}
                </span>
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
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>리뷰 삭제</h2>
            <p>다음 리뷰를 삭제하시겠습니까?</p>
            <p>{selectedReview.comment}</p>
            <button onClick={handleDeleteReview}>삭제</button>
            <button onClick={() => setShowDeleteModal(false)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
