import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import api from "./api/axiosConfig";
import "./ReservationCompletePage.css";

function ReservationCompletePage() {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const location = useLocation();

  function formatDate(dateString) {
    if (!dateString) return "정보 없음";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  useEffect(() => {
    const fetchReservationData = async () => {
      const urlParams = new URLSearchParams(location.search);
      const pg_token = urlParams.get("pg_token");
      const booking_id = urlParams.get("booking_id");

      if (!pg_token || !booking_id) {
        console.error("필요한 파라미터가 없습니다:", { pg_token, booking_id });
        setError("결제 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.");
        return;
      }

      try {
        const response = await api.get(
          `/api/kakao-pay/success?pg_token=${pg_token}&booking_id=${booking_id}`
        );
        console.log("서버 응답:", response.data);
        setBooking(response.data.booking);
      } catch (error) {
        console.error("예약 정보 가져오기 실패:", error);
        setError(
          "예약 정보를 가져오는 데 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      }
    };

    fetchReservationData();
  }, [location.search]);

  if (error) {
    return (
      <div className="yeogi-container">
        <Header title="예약 오류" showBackButton={true} />
        <main className="yeogi-main reservation-complete-content">
          <h1>오류 발생</h1>
          <p>{error}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="yeogi-container">
        <Header title="예약 완료" showBackButton={true} />
        <main className="yeogi-main reservation-complete-content">
          <div>예약 정보를 불러오는 중...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="yeogi-container">
      <Header title="예약 완료" showBackButton={true} />
      <main className="yeogi-main reservation-complete-content">
        <div className="reservation-complete-form">
          <h1>예약이 완료되었습니다!</h1>
          <div className="accommodation-summary">
            <img
              src={booking.accommodation_image}
              alt={booking.accommodation_name}
            />
            <h2>{booking.accommodation_name}</h2>
          </div>
          <div className="reservation-details">
            <p>
              <strong>예약 번호:</strong> {booking.id || "정보 없음"}
            </p>
            <p>
              <strong>체크인:</strong> {formatDate(booking.check_in)}
            </p>
            <p>
              <strong>체크아웃:</strong> {formatDate(booking.check_out)}
            </p>
            <p>
              <strong>인원:</strong>{" "}
              {booking.guests ? `${booking.guests}명` : "정보 없음"}
            </p>
            <p>
              <strong>총 가격:</strong>{" "}
              {booking.total_price ? `${booking.total_price}원` : "정보 없음"}
            </p>
            <p>
              <strong>예약 상태:</strong> {"예약 완료" || "정보 없음"}
            </p>
            <p>
              <strong>결제 상태:</strong> {"결제 완료" || "정보 없음"}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ReservationCompletePage;
