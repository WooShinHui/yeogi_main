import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";

import ko from "date-fns/locale/ko";
import {
  format,
  addDays,
  isBefore,
  isAfter,
  isWithinInterval,
  eachDayOfInterval,
} from "date-fns";
import { FaCalendarAlt, FaUser } from "react-icons/fa";
import "./AccommodationDetailPage.css";
import axios from "axios";
import "../styles/common.css";
import api from "../api/axiosConfig";

registerLocale("ko", ko);
axios.defaults.withCredentials = true;

function AccommodationDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [accommodation, setAccommodation] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [userId, setUserId] = useState(null);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/api/user")
      .then((response) => {
        setUserId(response.data.id);
      })
      .catch((error) => {
        console.error("사용자 정보 가져오기 실패:", error);
        navigate("/login");
      });

    const searchParams = new URLSearchParams(location.search);
    const checkInParam = searchParams.get("checkIn");
    const checkOutParam = searchParams.get("checkOut");
    const guestsParam = searchParams.get("guests");

    if (checkInParam) setCheckIn(new Date(checkInParam));
    if (checkOutParam) setCheckOut(new Date(checkOutParam));
    if (guestsParam) setGuests(parseInt(guestsParam, 10));

    fetchAccommodationData();
  }, [id, location.search, navigate]);

  useEffect(() => {
    if (userId) {
      checkLikeStatus();
    }
  }, [id, userId]);

  const fetchAccommodationData = () => {
    axios
      .get(`http://localhost:3001/accommodations/${id}`)
      .then((response) => {
        setAccommodation(response.data);
        setBookedDates(
          response.data.bookings.map((booking) => ({
            start: new Date(booking.check_in_date),
            end: new Date(booking.check_out_date),
          }))
        );
      })
      .catch((error) => {
        console.error("숙소 정보 가져오기 실패:", error);
      });
  };

  const checkLikeStatus = () => {
    api
      .get(`/api/likes/check/${userId}/${id}`)
      .then((response) => {
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
      .then(() => {
        setIsLiked(!isLiked);
      })
      .catch((error) => {
        console.error(
          isLiked ? "찜하기 취소 실패:" : "찜하기 추가 실패:",
          error
        );
      });
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setCheckIn(start);
    setCheckOut(end);
    if (start && end) {
      setShowDatePicker(false);
    }
  };

  const handleGuestChange = (newGuests) => {
    setGuests(newGuests);
    setShowGuestSelector(false);
  };

  const handleReservation = () => {
    if (!checkIn || !checkOut || !guests) {
      alert("날짜와 인원수를 모두 선택해주세요.");
      return;
    }

    const reservationParams = new URLSearchParams();
    reservationParams.append("checkIn", format(checkIn, "yyyy-MM-dd"));
    reservationParams.append("checkOut", format(checkOut, "yyyy-MM-dd"));
    reservationParams.append("guests", guests.toString());

    navigate(`/reservation/${id}?${reservationParams.toString()}`);
  };

  const isDateBooked = (date) => {
    return bookedDates.some((interval) =>
      isWithinInterval(date, { start: interval.start, end: interval.end })
    );
  };

  const formatDateRange = () => {
    if (checkIn && checkOut) {
      return `${format(checkIn, "M월 d일")} - ${format(checkOut, "M월 d일")}`;
    }
    return "날짜 선택";
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
        <div className="booking-info">
          <div className="filter-item">
            <button
              className="date-selection"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <FaCalendarAlt className="icon" />
              <span>{formatDateRange()}</span>
            </button>
            {showDatePicker && (
              <div className="date-picker-container">
                <DatePicker
                  selected={checkIn}
                  onChange={handleDateChange}
                  startDate={checkIn}
                  endDate={checkOut}
                  selectsRange
                  inline
                  locale="ko"
                  minDate={new Date()}
                  monthsShown={1}
                  excludeDates={bookedDates.flatMap((interval) =>
                    eachDayOfInterval({
                      start: interval.start,
                      end: interval.end,
                    })
                  )}
                />
              </div>
            )}
          </div>

          <div className="filter-item">
            <button
              className="guest-selection"
              onClick={() => setShowGuestSelector(!showGuestSelector)}
            >
              <FaUser className="icon" />
              <span>{guests}명</span>
            </button>
            {showGuestSelector && (
              <div className="guest-selector">
                <button
                  onClick={() => handleGuestChange(Math.max(1, guests - 1))}
                >
                  -
                </button>
                <span>{guests}명</span>
                <button onClick={() => handleGuestChange(guests + 1)}>+</button>
                <button
                  className="confirm-button"
                  onClick={() => setShowGuestSelector(false)}
                >
                  확인
                </button>
              </div>
            )}
          </div>
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
