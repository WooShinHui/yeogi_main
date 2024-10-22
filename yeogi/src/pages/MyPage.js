import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./MyPage.css";
import api from "../api/axiosConfig";
import { FaStar } from "react-icons/fa";
function MyPage() {
  const [likedAccommodations, setLikedAccommodations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("reservations");
  const navigate = useNavigate();
  const [reviewableAccommodations, setReviewableAccommodations] = useState([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const fetchUserData = useCallback(async () => {
    try {
      const response = await api.get("/api/user");
      setUserId(response.data.id);
    } catch (error) {
      console.error("사용자 정보 가져오기 실패:", error);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      const response = await api.get(`/api/bookings/${userId}`);
      console.log("예약한 숙소 데이터:", response.data);
      setReservations(response.data);
    } catch (error) {
      console.error("예약한 숙소 조회 오류:", error);
      setReservations([]);
    }
  }, [userId]);

  const fetchLikedAccommodations = useCallback(async () => {
    try {
      const response = await api.get(`/api/likes/${userId}`);
      console.log("찜한 숙소 데이터:", response.data);
      setLikedAccommodations(response.data);
    } catch (error) {
      console.error("찜한 숙소 조회 오류:", error);
      setLikedAccommodations([]);
    }
  }, [userId]);

  const fetchReviewableAccommodations = useCallback(async () => {
    try {
      const response = await api.get("/api/user/reviewable-accommodations");
      setReviewableAccommodations(response.data);
    } catch (error) {
      console.error("리뷰 가능한 숙소 조회 실패:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    if (userId) {
      fetchReservations();
      fetchLikedAccommodations();
      fetchReviewableAccommodations();
    }
  }, [
    userId,
    fetchReservations,
    fetchLikedAccommodations,
    fetchReviewableAccommodations,
  ]);

  const handleAccommodationClick = useCallback(
    (accommodationId) => {
      navigate(`/accommodation/${accommodationId}`);
    },
    [navigate]
  );

  const handleLike = useCallback(
    async (accommodationId) => {
      try {
        await api.delete("/api/likes", { data: { userId, accommodationId } });
        fetchLikedAccommodations();
      } catch (error) {
        console.error("찜하기 취소 실패:", error);
      }
    },
    [userId, fetchLikedAccommodations]
  );

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/reviews", {
        accommodation_id: selectedAccommodation.id,
        booking_id: selectedAccommodation.booking_id,
        rating,
        comment,
      });
      alert("리뷰가 성공적으로 작성되었습니다.");
      setSelectedAccommodation(null);
      setRating(0);
      setComment("");
      fetchReviewableAccommodations();
    } catch (error) {
      console.error("리뷰 작성 실패:", error.response?.data || error.message);
      alert("리뷰 작성에 실패했습니다.");
    }
  };

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "정보 없음";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);

  return (
    <div className="yeogi-container">
      <Header title="마이페이지" showBackButton={true} />
      <div className="yeogi-content">
        <main className="yeogi-main my-page-content">
          <div className="tab-buttons">
            {["reservations", "likes", "reviews"].map((tab) => (
              <button
                key={tab}
                className={`tab-button ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "reservations"
                  ? "예약한 숙소"
                  : tab === "likes"
                  ? "찜한 숙소"
                  : "리뷰 작성"}
              </button>
            ))}
          </div>

          {activeTab === "reservations" && (
            <div className="my-page-accommodations">
              <h2>예약한 숙소</h2>
              {reservations.length > 0 ? (
                reservations.map((reservation) => (
                  <div
                    key={`reservation-${reservation.id}`}
                    className="my-page-accommodation-card"
                    onClick={() =>
                      handleAccommodationClick(reservation.accommodation_id)
                    }
                  >
                    <img
                      src={reservation.image_url}
                      alt={reservation.accommodation_name}
                      className="my-page-accommodation-image"
                    />
                    <div className="my-page-accommodation-details">
                      <h3>{reservation.accommodation_name}</h3>
                      <p>체크인: {formatDate(reservation.check_in_date)}</p>
                      <p>체크아웃: {formatDate(reservation.check_out_date)}</p>
                      <p>인원: {reservation.guests}명</p>
                      <p className="my-page-accommodation-price">
                        총 가격: {reservation.total_price}원
                      </p>
                      <p>
                        예약 상태:{" "}
                        {reservation.payment_status === "completed"
                          ? "예약 완료"
                          : "대기 중"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="my-page-no-accommodations">
                  예약한 숙소가 없습니다.
                </p>
              )}
            </div>
          )}

          {activeTab === "likes" && (
            <div className="my-page-accommodations">
              <h2>찜한 숙소</h2>
              {likedAccommodations.length > 0 ? (
                likedAccommodations.map((accommodation) => (
                  <div
                    key={`liked-${accommodation.id}`}
                    className="my-page-accommodation-card"
                  >
                    <img
                      src={accommodation.image_url}
                      alt={accommodation.name}
                      className="my-page-accommodation-image"
                      onClick={() => handleAccommodationClick(accommodation.id)}
                    />
                    <div className="my-page-accommodation-details">
                      <h3>{accommodation.name}</h3>
                      <p>{accommodation.location}</p>
                      <p className="my-page-accommodation-price">
                        가격: {accommodation.price}원 / 박
                      </p>
                      <p>최대 인원: {accommodation.max_guests}명</p>
                      <button
                        className="like-button liked"
                        onClick={() => handleLike(accommodation.id)}
                      >
                        찜 취소
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="my-page-no-accommodations">
                  찜한 숙소가 없습니다.
                </p>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="mp-reviewable-section">
              <h2 className="mp-section-title">리뷰 작성</h2>
              {reviewableAccommodations.length > 0 ? (
                <div className="mp-reviewable-list">
                  {reviewableAccommodations.map((accommodation) => (
                    <div
                      key={`reviewable-${accommodation.id}-${accommodation.booking_id}`}
                      className="mp-reviewable-item"
                    >
                      <div className="mp-reviewable-image-container">
                        <img
                          src={accommodation.image_url}
                          alt={accommodation.name}
                          className="mp-reviewable-image"
                        />
                      </div>
                      <div className="mp-reviewable-details">
                        <h3 className="mp-reviewable-name">
                          {accommodation.name}
                        </h3>
                        <p className="mp-reviewable-date">
                          체크아웃: {formatDate(accommodation.check_out_date)}
                        </p>
                        <button
                          className="mp-write-review-btn"
                          onClick={() =>
                            setSelectedAccommodation(accommodation)
                          }
                        >
                          리뷰 작성
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mp-no-reviewable">
                  리뷰 작성 가능한 숙소가 없습니다.
                </p>
              )}
            </div>
          )}

          {selectedAccommodation && (
            <div className="mp-review-modal">
              <div className="mp-review-form">
                <h3 className="mp-review-form-title">
                  {selectedAccommodation.name} 리뷰 작성
                </h3>
                <form onSubmit={handleSubmitReview}>
                  <div className="mp-rating-input">
                    <label>평점:</label>
                    <div className="mp-star-rating">
                      {[...Array(5)].map((star, index) => {
                        const ratingValue = index + 1;
                        return (
                          <label key={index}>
                            <input
                              type="radio"
                              name="rating"
                              value={ratingValue}
                              onClick={() => setRating(ratingValue)}
                              style={{ display: "none" }}
                            />
                            <FaStar
                              className="mp-star"
                              color={
                                ratingValue <= rating ? "#ffc107" : "#e4e5e9"
                              }
                              size={30}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mp-comment-input">
                    <label>코멘트:</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                      placeholder="숙소에 대한 경험을 공유해주세요."
                    ></textarea>
                  </div>
                  <div className="mp-form-actions">
                    <button type="submit" className="mp-submit-review">
                      리뷰 제출
                    </button>
                    <button
                      type="button"
                      className="mp-cancel-review"
                      onClick={() => setSelectedAccommodation(null)}
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default MyPage;
