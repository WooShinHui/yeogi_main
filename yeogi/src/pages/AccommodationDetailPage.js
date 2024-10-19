import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./AccommodationDetailPage.css";
import axios from "axios";
import api from "../api/axiosConfig";
import { format, addDays } from "date-fns";
axios.defaults.withCredentials = true; // 모든 요청에 credentials 포함

function AccommodationDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [accommodation, setAccommodation] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    api
      .get("/api/user")
      .then((response) => {
        setUserId(response.data.id);
      })
      .catch((error) => {
        console.error("사용자 정보 가져오기 실패:", error);
        navigate("/next-page");
      });
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      axios
        .get(`http://localhost:3001/accommodations/${id}`)
        .then((response) => setAccommodation(response.data))
        .catch((error) => {
          console.error("숙소 정보 가져오기 실패:", error);
        });

      api
        .get(`/api/likes/${userId}`)
        .then((response) => {
          setIsLiked(response.data.includes(parseInt(id)));
        })
        .catch((error) => console.error("찜 상태 확인 실패:", error));
    }
  }, [id, userId]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    console.log("AccommodationDetailPage 마운트 시 URL 파라미터:");
    console.log("체크인:", params.get("checkIn"));
    console.log("체크아웃:", params.get("checkOut"));
    console.log("인원 수:", params.get("guests"));
  }, [location.search]);
  const handleLike = () => {
    if (!userId) {
      console.error("로그인이 필요합니다.");
      return;
    }

    if (isLiked) {
      api
        .delete("/api/likes", {
          data: { userId, accommodationId: id },
        })
        .then(() => setIsLiked(false))
        .catch((error) => {
          console.error("찜하기 취소 실패:", error);
        });
    } else {
      api
        .post("/api/likes", {
          userId,
          accommodationId: id,
        })
        .then(() => setIsLiked(true))
        .catch((error) => {
          console.error("찜하기 추가 실패:", error);
        });
    }
  };
  const handleReservation = () => {
    const searchParams = new URLSearchParams(location.search);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const guests = searchParams.get("guests");

    console.log("AccommodationDetailPage에서 전달하는 파라미터:");
    console.log("체크인:", checkIn);
    console.log("체크아웃:", checkOut);
    console.log("인원 수:", guests);

    const reservationParams = new URLSearchParams();
    if (checkIn) reservationParams.append("checkIn", checkIn);
    if (checkOut) reservationParams.append("checkOut", checkOut);
    if (guests) reservationParams.append("guests", guests);

    navigate(`/reservation/${id}?${reservationParams.toString()}`);
  };
  if (!accommodation) {
    return <div className="yeogi-container">로딩 중...</div>;
  }
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
  };
  return (
    <div className="yeogi-container">
      <Header title={accommodation.name} showBackButton={true} />
      <main className="yeogi-main accommodation-detail-content">
        <img src={accommodation.image_url} />
        <div className="accommodation-info">
          <h1>{accommodation.name}</h1>
          <p className="price">{accommodation.price}원 / 박</p>
          <p className="description">{accommodation.description}</p>
          {/* 추가적인 숙소 정보를 여기에 넣으세요 */}
        </div>
        <div className="action-buttons">
          <button className="book-button" onClick={handleReservation}>
            예약하기
          </button>
          <button
            className={`like-button ${isLiked ? "liked" : ""}`}
            onClick={handleLike}
          >
            {isLiked ? "찜 취소" : "찜하기"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default AccommodationDetailPage;
