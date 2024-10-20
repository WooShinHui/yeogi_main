import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./AccommodationDetailPage.css";
import axios from "axios";
import api from "../api/axiosConfig";
import { format, addDays } from "date-fns";
axios.defaults.withCredentials = true;

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
      fetchAccommodationData();
      checkLikeStatus();
    }
  }, [id, userId]);

  const fetchAccommodationData = () => {
    axios
      .get(`http://localhost:3001/accommodations/${id}`)
      .then((response) => setAccommodation(response.data))
      .catch((error) => {
        console.error("숙소 정보 가져오기 실패:", error);
      });
  };

  const checkLikeStatus = () => {
    api
      .get(`/api/likes/check/${userId}/${id}`)
      .then((response) => {
        console.log("찜 상태 확인 응답:", response.data);
        setIsLiked(response.data.isLiked);
      })
      .catch((error) => console.error("찜 상태 확인 실패:", error));
  };

  const handleLike = () => {
    if (!userId) {
      console.error("로그인이 필요합니다.");
      return;
    }

    const likeAction = isLiked
      ? api.delete("/api/likes", { data: { userId, accommodationId: id } })
      : api.post("/api/likes", { userId, accommodationId: id });

    likeAction
      .then((response) => {
        console.log("서버 응답:", response.data);
        if (response.data.message === "이미 찜한 숙소입니다.") {
          console.log("이미 찜한 숙소입니다.");
        } else {
          setIsLiked(!isLiked);
          console.log(isLiked ? "찜하기 취소 성공" : "찜하기 추가 성공");
        }
      })
      .catch((error) => {
        console.error(
          isLiked ? "찜하기 취소 실패:" : "찜하기 추가 실패:",
          error
        );
      });
  };

  const handleReservation = () => {
    const searchParams = new URLSearchParams(location.search);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const guests = searchParams.get("guests");

    const reservationParams = new URLSearchParams();
    if (checkIn) reservationParams.append("checkIn", checkIn);
    if (checkOut) reservationParams.append("checkOut", checkOut);
    if (guests) reservationParams.append("guests", guests);

    navigate(`/reservation/${id}?${reservationParams.toString()}`);
  };

  if (!accommodation) {
    return <div className="yeogi-container">로딩 중...</div>;
  }

  return (
    <div className="yeogi-container">
      <Header title={accommodation.name} showBackButton={true} />
      <main className="yeogi-main accommodation-detail-content">
        <img src={accommodation.image_url} alt={accommodation.name} />
        <div className="accommodation-info">
          <h1>{accommodation.name}</h1>
          <p className="price">{accommodation.price}원 / 박</p>
          <p className="description">{accommodation.description}</p>
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
