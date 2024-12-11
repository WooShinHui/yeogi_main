import React, { useState, useEffect } from "react";
import api from "../axiosConfig";
import { format, parseISO } from "date-fns";
import { FaBell, FaEnvelope, FaTimes } from "react-icons/fa";
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
    today_bookings: 0,
    popularAccommodations: [],
    recentReviews: [],
    recentInquiries: [],
    averageRating: 0,
    adminNotes: [],
  });

  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [answerContent, setAnswerContent] = useState("");
  const [newNote, setNewNote] = useState("");

  const fetchDashboardData = async () => {
    try {
      const response = await api.get("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const notesResponse = await api.get("/api/admin/notes", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("메모 데이터:", notesResponse.data); // 여기에 콘솔 추가
      setDashboardData({
        ...response.data,
        adminNotes: notesResponse.data,
      });
    } catch (error) {
      console.error("대시보드 데이터 조회 실패:", error);
    }
  };

  const handleSaveNote = async () => {
    try {
      await api.post(
        "/api/admin/notes",
        { message: newNote },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setNewNote("");
      fetchDashboardData();
    } catch (error) {
      console.error("메모 저장 실패:", error);
      alert("메모 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

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
      await api.post(
        `/api/admin/inquiries/${selectedInquiry.id}/answer`,
        { response: answerContent },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      fetchDashboardData();
      setShowAnswerModal(false);
      setSelectedInquiry(null);
      setAnswerContent("");
    } catch (error) {
      console.error("문의 답변 중 오류 발생:", error);
      alert("문의 답변 등록에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleDeleteReview = async () => {
    try {
      await api.delete(`/api/admin/reviews/${selectedReview.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      fetchDashboardData();
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
    navigate(`/accommodation-edit/${accommodationId}`);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const formatDate = (dateString) => {
    return format(parseISO(dateString), "yyyy-MM-dd");
  };
  // dailyRevenue 데이터로부터 이번 달 총 매출 계산하는 함수 추가
  const calculateMonthlyTotal = (dailyRevenue) => {
    const currentMonth = new Date().getMonth();
    return dailyRevenue
      .filter((item) => new Date(item.date).getMonth() === currentMonth)
      .reduce((total, item) => total + item.revenue, 0);
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
      <div className="dashboard-header">
        <h1 className="dashboard-title">관리자 대시보드</h1>

        <div className="icon-container">
          <div
            className="icon"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <FaBell />
            <span className="badge">
              {dashboardData.recentInquiries?.filter(
                (inquiry) => inquiry.status === "pending"
              ).length || 0}
            </span>
          </div>

          <div className="icon" onClick={() => setShowNotes(!showNotes)}>
            <FaEnvelope />
            <span className="badge">
              {dashboardData.adminNotes?.length || 0}
            </span>
          </div>
        </div>

        {showNotifications && (
          <div className="notification-toast">
            <div className="toast-header">
              <h2>알림사항</h2>
              <FaTimes
                className="close-icon"
                onClick={() => setShowNotifications(false)}
              />
            </div>
            <ul className="toast-list">
              <li>
                <strong>답변 대기:</strong>{" "}
                {dashboardData.recentInquiries?.filter(
                  (inquiry) => inquiry.status === "pending"
                ).length || 0}
              </li>
              <li>
                <strong>최근 리뷰:</strong> {dashboardData.recentReviews.length}
              </li>
              <li>
                <strong>오늘의 체크인:</strong> {dashboardData.today_check_ins}
              </li>
              <li>
                <strong>오늘의 체크아웃:</strong>{" "}
                {dashboardData.today_check_outs}
              </li>
            </ul>
          </div>
        )}

        {showNotes && (
          <div className="memo-container">
            <div className="memo-header">
              <h2>관리자 메모</h2>
              <FaTimes
                className="close-icon"
                onClick={() => setShowNotes(false)}
              />
            </div>
            <div className="memo-board">
              {dashboardData.adminNotes.map((note, index) => (
                <div key={index} className="memo-note">
                  <div className="memo-content">{note.message}</div>
                  <div className="memo-footer">
                    <span className="memo-author">
                      {note.author_name} | {note.author_position}
                    </span>
                    {note.created_at && (
                      <span className="memo-time">
                        {format(new Date(note.created_at), "HH:mm")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="memo-input-container">
              <textarea
                className="memo-input"
                placeholder="새로운 메모를 입력하세요..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <button className="memo-submit" onClick={handleSaveNote}>
                메모 추가
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="today-summary">
        <div className="summary-item">
          <div className="summary-title">오늘의 체크인</div>
          <div className="summary-value">{dashboardData.today_check_ins}</div>
        </div>
        <div className="summary-item">
          <div className="summary-title">오늘의 체크아웃</div>
          <div className="summary-value">{dashboardData.today_check_outs}</div>
        </div>
        <div className="summary-item">
          <div className="summary-title">답변 대기</div>
          <div className="summary-value">
            {dashboardData.recentInquiries?.filter(
              (inquiry) => inquiry.status === "pending"
            ).length || 0}
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-title">오늘의 예약</div>
          <div className="summary-value">
            {dashboardData.todayBookings || 0}{" "}
          </div>
        </div>
      </div>
      <div className="dashboard-stats">
        <div className="left-column">
          <div className="card checkin-checkout-chart">
            <h2 className="card-title">체크인/체크아웃</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={processCheckInOutData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "MM/dd")}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) =>
                    format(new Date(label), "yyyy-MM-dd")
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="check_ins"
                  name="체크인"
                  zIndex={1}
                  stroke="#20C030"
                />
                <Line
                  type="monotone"
                  dataKey="check_outs"
                  name="체크아웃"
                  zIndex={0}
                  opacity={0.5}
                  stroke="#E8403A"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="right-column">
          <div className="card revenue-chart">
            <div className="revenue-header">
              <h2 className="card-title">일일 매출</h2>
              <div className="monthly-total">
                이번 달 매출:{" "}
                <span className="amount">
                  {calculateMonthlyTotal(
                    dashboardData.dailyRevenue
                  ).toLocaleString()}
                </span>
                원
              </div>
            </div>
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
                  <span className="inquiry-title">{inquiry.title}</span>
                  <span className="inquiry-content">{inquiry.content}</span>
                  <span className="inquiry-user">
                    작성자: {inquiry.nickname}
                  </span>
                  <span className="inquiry-date">
                    {formatDate(inquiry.created_at)}
                  </span>
                  <button
                    className={`answer-button ${
                      inquiry.status === "answered" ? "answered" : ""
                    }`}
                    onClick={() => handleAnswerInquiry(inquiry)}
                    disabled={inquiry.status === "answered"}
                  >
                    {inquiry.status === "answered" ? "답변완료" : "답변하기"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
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
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>리뷰 삭제</h2>
              <FaTimes
                className="close-icon"
                onClick={() => setShowDeleteModal(false)}
              />
            </div>
            <p>다음 리뷰를 삭제하시겠습니까?</p>
            <p>{selectedReview.comment}</p>
            <div className="answer-button-container">
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
        </div>
      )}

      {showAnswerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>문의 답변</h2>
              <FaTimes
                className="close-icon"
                onClick={() => {
                  setShowAnswerModal(false);
                  setSelectedInquiry(null);
                  setAnswerContent("");
                }}
              />
            </div>
            <p>
              <strong>제목:</strong> {selectedInquiry.title}
            </p>
            <p>
              <strong>내용:</strong> {selectedInquiry.content}
            </p>
            <p>
              <strong>작성자:</strong> {selectedInquiry.email}
            </p>
            <textarea
              value={answerContent}
              className="answer-textarea"
              onChange={(e) => setAnswerContent(e.target.value)}
              placeholder="답변을 입력하세요"
              rows={4}
            />
            <div className="answer-button-container">
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
        </div>
      )}
    </div>
  );
}

export default Dashboard;
