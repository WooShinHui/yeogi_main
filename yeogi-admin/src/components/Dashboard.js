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
    dailyCheckOuts: [],
    popularAccommodations: [],
    recentReviews: [],
    recentInquiries: [],
    averageRating: 0,
  });

  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeTab, setActiveTab] = useState("bookings");
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answerContent, setAnswerContent] = useState("");

  const handleManageReview = (review) => {
    setSelectedReview(review);
    setShowDeleteModal(true);
  };

  const handleAnswerInquiry = (inquiry) => {
    setSelectedInquiry(inquiry);
    setShowAnswerModal(true);
  };

  const handleSubmitAnswer = async () => {
    try {
      await axios.post(
        `/api/admin/inquiries/${selectedInquiry.id}/answer`,
        { response: answerContent },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      const dashboardResponse = await axios.get("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setDashboardData(dashboardResponse.data);
      setShowAnswerModal(false);
      setSelectedInquiry(null);
      setAnswerContent("");
    } catch (error) {
      console.error("문의 답변 중 오류 발생:", error);
      alert("문의 답변 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteReview = async () => {
    try {
      await axios.delete(`/api/admin/reviews/${selectedReview.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

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

  const processCheckInOutData = () => {
    const combinedData = {};

    dashboardData.dailyCheckIns.forEach((item) => {
      combinedData[item.date] = {
        date: item.date,
        check_ins: item.check_ins,
        check_outs: 0,
      };
    });

    dashboardData.dailyCheckOuts.forEach((item) => {
      if (combinedData[item.date]) {
        combinedData[item.date].check_outs = item.check_outs;
      } else {
        combinedData[item.date] = {
          date: item.date,
          check_ins: 0,
          check_outs: item.check_outs,
        };
      }
    });

    return Object.values(combinedData).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">관리자 대시보드</h1>

      {/* 1-2. 상단 그래프 섹션 */}
      <div className="dashboard-stats">
        <div className="left-column">
          <div className="card check-in-out-graph">
            <h2 className="card-title">체크인/체크아웃 현황</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={processCheckInOutData()}>
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
                  dataKey="check_outs"
                  name="체크아웃"
                  stroke="#ff7f7f"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  dot={{ strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                  zIndex={1}
                />
                <Line
                  type="monotone"
                  dataKey="check_ins"
                  name="체크인"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                  zIndex={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="right-column">
          <div className="card revenue-chart">
            <h2 className="card-title">일일 매출</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "MM/dd")}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${value.toLocaleString()}원`}
                  labelFormatter={(label) =>
                    format(new Date(label), "yyyy-MM-dd")
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="매출"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3-4. 인기 숙소와 문의 섹션 */}
      <div className="dashboard-bottom">
        <div className="left-column">
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
        </div>

        <div className="right-column">
          <div className="card recent-inquiries">
            <h2 className="card-title">최근 문의</h2>
            <ul className="inquiry-list">
              {dashboardData.recentInquiries?.map((inquiry) => (
                <li key={inquiry.id} className="inquiry-item">
                  <div className="inquiry-header">
                    <span className="inquiry-title">{inquiry.title}</span>
                    <span className={`inquiry-status ${inquiry.status}`}>
                      {inquiry.status === "pending" ? "답변대기" : "답변완료"}
                    </span>
                  </div>
                  <div className="inquiry-content">{inquiry.content}</div>
                  <div className="inquiry-info">
                    <span className="inquiry-user">
                      작성자: {inquiry.nickname}
                    </span>
                    <span className="inquiry-date">
                      {formatDate(inquiry.created_at)}
                    </span>
                  </div>
                  {inquiry.status === "pending" && (
                    <button
                      className="answer-button"
                      onClick={() => handleAnswerInquiry(inquiry)}
                    >
                      답변하기
                    </button>
                  )}
                  {inquiry.status === "answered" && (
                    <div className="inquiry-response">
                      <div className="response-content">{inquiry.response}</div>
                      <div className="response-date">
                        답변일: {formatDate(inquiry.response_date)}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 5-6. 최근 예약 섹션 (전체 너비) */}
      <div className="dashboard-full">
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

      {/* 7-8. 최근 리뷰 섹션 (전체 너비) */}
      <div className="dashboard-full">
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
      </div>

      {/* 모달들 */}
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>리뷰 삭제</h2>
            <p>다음 리뷰를 삭제하시겠습니까?</p>
            <p>{selectedReview.comment}</p>
            <button className="delete-button" onClick={handleDeleteReview}>
              삭제
            </button>
            <button
              className="cancel-button"
              onClick={() => setShowDeleteModal(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {showAnswerModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>문의 답변</h2>
            <p>문의 내용: {selectedInquiry.content}</p>
            <textarea
              value={answerContent}
              onChange={(e) => setAnswerContent(e.target.value)}
              placeholder="답변을 입력하세요"
              rows={4}
            />
            <button className="submit-button" onClick={handleSubmitAnswer}>
              답변 등록
            </button>
            <button
              className="cancel-button"
              onClick={() => {
                setShowAnswerModal(false);
                setSelectedInquiry(null);
                setAnswerContent("");
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
