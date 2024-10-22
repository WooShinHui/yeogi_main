import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import ko from "date-fns/locale/ko";
import { format, addDays, isWithinInterval, eachDayOfInterval } from "date-fns";
import { FaCalendarAlt, FaUser } from "react-icons/fa";
import "./AccommodationDetailPage.css";
import "../styles/common.css";
import api from "../api/axiosConfig";
import { FaStar } from "react-icons/fa";
registerLocale("ko", ko);

function AccommodationDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [accommodation, setAccommodation] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [userId, setUserId] = useState(null);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);

  const fetchAccommodationData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/accommodations/${id}`);
      setAccommodation(response.data);
      if (response.data && response.data.bookings) {
        const bookedDateRanges = response.data.bookings.map((booking) => ({
          start: new Date(booking.check_in_date),
          end: new Date(booking.check_out_date),
        }));
        setBookedDates(bookedDateRanges);
      }
    } catch (error) {
      console.error("숙소 정보 가져오기 실패:", error);
      setError("숙소 정보를 가져오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await api.get(`/api/accommodations/${id}/reviews`);
      setReviews(response.data);
      const avgRating =
        response.data.reduce((sum, review) => sum + review.rating, 0) /
        response.data.length;
      setAverageRating(avgRating || 0);
    } catch (error) {
      console.error("리뷰 조회 실패:", error);
    }
  }, [id]);

  const checkLikeStatus = useCallback(async () => {
    try {
      const response = await api.get(`/api/likes/check/${userId}/${id}`);
      setIsLiked(response.data.isLiked);
    } catch (error) {
      console.error("찜 상태 확인 실패:", error);
    }
  }, [userId, id]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get("/api/user");
        setUserId(response.data.id);
      } catch (error) {
        console.error("사용자 정보 가져오기 실패:", error);
        navigate("/");
      }
    };

    fetchUserData();
    fetchAccommodationData();
    fetchReviews();

    const searchParams = new URLSearchParams(location.search);
    const checkInParam = searchParams.get("checkIn");
    const checkOutParam = searchParams.get("checkOut");
    const guestsParam = searchParams.get("guests");

    if (checkInParam) setCheckIn(new Date(checkInParam));
    if (checkOutParam) setCheckOut(new Date(checkOutParam));
    if (guestsParam) setGuests(parseInt(guestsParam, 10));
  }, [id, location.search, navigate, fetchAccommodationData, fetchReviews]);

  useEffect(() => {
    if (userId) {
      checkLikeStatus();
    }
  }, [userId, checkLikeStatus]);

  useEffect(() => {
    if (location.state?.reviewAdded) {
      fetchReviews();
    }
  }, [location, fetchReviews]);

  const handleLike = async () => {
    if (!userId) {
      console.error("로그인이 필요합니다.");
      return;
    }

    try {
      if (isLiked) {
        await api.delete("/api/likes", {
          data: { userId, accommodationId: id },
        });
      } else {
        await api.post("/api/likes", { userId, accommodationId: id });
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error(isLiked ? "찜하기 취소 실패:" : "찜하기 추가 실패:", error);
    }
  };

  const isDateBooked = (date) => {
    return bookedDates.some((range) =>
      isWithinInterval(date, {
        start: range.start,
        end: addDays(range.end, -1),
      })
    );
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    if (start && end) {
      const range = eachDayOfInterval({ start, end: addDays(end, -1) });
      const isAnyDateBooked = range.some(isDateBooked);
      if (isAnyDateBooked) {
        alert("선택한 날짜 중 이미 예약된 날짜가 포함되어 있습니다.");
        return;
      }
    }
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

  const formatDateRange = () => {
    if (checkIn && checkOut) {
      return `${format(checkIn, "M월 d일")} - ${format(checkOut, "M월 d일")}`;
    }
    return "날짜 선택";
  };

  if (loading) {
    return <div className="yeogi-container">로딩 중...</div>;
  }

  if (error) {
    return <div className="yeogi-container">에러: {error}</div>;
  }

  if (!accommodation) {
    return <div className="yeogi-container">숙소 정보를 찾을 수 없습니다.</div>;
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
                      end: addDays(interval.end, -1),
                    })
                  )}
                  dayClassName={(date) =>
                    isDateBooked(date) ? "booked-date" : undefined
                  }
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
        <div className="reviews-section">
          <h2 className="reviews-title">리뷰 ({reviews.length})</h2>
          <div className="reviews-summary">
            <div className="average-rating">
              <span className="average-rating-value">
                {averageRating.toFixed(1)}
              </span>
              <div className="average-rating-stars">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    color={
                      i < Math.round(averageRating) ? "#ffc107" : "#e4e5e9"
                    }
                    size={20}
                  />
                ))}
              </div>
            </div>
            <span className="total-reviews">{reviews.length} 리뷰</span>
          </div>
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <img
                    src={review.profile_image}
                    alt={review.nickname}
                    className="review-profile-image"
                  />
                  <div className="review-author-info">
                    <span className="review-author">{review.nickname}</span>
                    <span className="review-date">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="review-body">
                  <div className="review-rating">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        color={i < review.rating ? "#ffc107" : "#e4e5e9"}
                        size={16}
                      />
                    ))}
                    <span className="review-rating-value">{review.rating}</span>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default AccommodationDetailPage;
