import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./MyPage.css";
import api from "../api/axiosConfig";

function MyPage() {
  const [likedAccommodations, setLikedAccommodations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("reservations");
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/api/user")
      .then((response) => {
        setUserId(response.data.id);
      })
      .catch((error) => {
        console.error("사용자 정보 가져오기 실패:", error);
      });
  }, []);

  useEffect(() => {
    if (userId) {
      fetchReservations();
      fetchLikedAccommodations();
    }
  }, [userId]);

  const fetchReservations = () => {
    api
      .get(`/api/bookings/${userId}`)
      .then((response) => {
        console.log("예약한 숙소 데이터:", response.data);
        setReservations(response.data);
      })
      .catch((error) => {
        console.error("예약한 숙소 조회 오류:", error);
        setReservations([]);
      });
  };

  const fetchLikedAccommodations = () => {
    api
      .get(`/api/likes/${userId}`)
      .then((response) => {
        console.log("찜한 숙소 데이터:", response.data);
        setLikedAccommodations(response.data);
      })
      .catch((error) => {
        console.error("찜한 숙소 조회 오류:", error);
        setLikedAccommodations([]);
      });
  };

  const handleAccommodationClick = (accommodationId) => {
    navigate(`/accommodation/${accommodationId}`);
  };

  const handleLike = (accommodationId) => {
    api
      .delete("/api/likes", {
        data: { userId, accommodationId },
      })
      .then(() => {
        fetchLikedAccommodations(); // 찜 목록 새로고침
      })
      .catch((error) => {
        console.error("찜하기 취소 실패:", error);
      });
  };

  function formatDate(dateString) {
    if (!dateString) return "정보 없음";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  return (
    <div className="yeogi-container">
      <Header title="마이페이지" showBackButton={true} />
      <div className="yeogi-content">
        <main className="yeogi-main my-page-content">
          <div className="tab-buttons">
            <button
              className={`tab-button ${
                activeTab === "reservations" ? "active" : ""
              }`}
              onClick={() => setActiveTab("reservations")}
            >
              예약한 숙소
            </button>
            <button
              className={`tab-button ${activeTab === "likes" ? "active" : ""}`}
              onClick={() => setActiveTab("likes")}
            >
              찜한 숙소
            </button>
          </div>

          {activeTab === "reservations" && (
            <div className="my-page-accommodations">
              <h2>예약한 숙소</h2>
              {reservations.length > 0 ? (
                reservations.map((reservation) => (
                  <div
                    key={reservation.id}
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
                    key={accommodation.id}
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
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default MyPage;
