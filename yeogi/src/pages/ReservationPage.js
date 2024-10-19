import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api/axiosConfig";
import "./ReservationPage.css";
import { format, parse, addDays } from "date-fns";

function ReservationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const [accommodation, setAccommodation] = useState(null);
  const [reservationInfo, setReservationInfo] = useState(() => {
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const guests = searchParams.get("guests");
    console.log("초기 reservationInfo 설정:");
    console.log("체크인:", checkIn);
    console.log("체크아웃:", checkOut);
    console.log("인원 수:", guests);

    return {
      checkIn: checkIn
        ? format(parse(checkIn, "yyyy-MM-dd", new Date()), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      checkOut: checkOut
        ? format(parse(checkOut, "yyyy-MM-dd", new Date()), "yyyy-MM-dd")
        : format(addDays(new Date(), 1), "yyyy-MM-dd"),
      guests: parseInt(guests) || 1,
    };
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const pgToken = searchParams.get("pg_token");

    if (pgToken) {
      // 결제가 완료되었으므로 완료 페이지로 리다이렉트
      navigate(`/reservation/complete?pg_token=${pgToken}`);
      return;
    }

    // 숙소 정보 가져오기
    api
      .get(`/accommodations/${id}`)
      .then((response) => setAccommodation(response.data))
      .catch((error) => console.error("숙소 정보 가져오기 실패:", error));
  }, [id, location.search, navigate]);

  const handleReservation = async () => {
    try {
      const paymentResponse = await api.post("/api/kakao-pay", {
        accommodationId: id,
        checkIn: reservationInfo.checkIn,
        checkOut: reservationInfo.checkOut,
        guests: reservationInfo.guests,
        totalPrice: accommodation.price,
      });

      if (paymentResponse.data.success) {
        // 카카오페이 결제 페이지로 리다이렉트
        window.location.href = paymentResponse.data.next_redirect_pc_url;
      } else {
        throw new Error("결제 요청 실패");
      }
    } catch (error) {
      console.error(
        "결제 요청 중 오류 발생:",
        error.response ? error.response.data : error.message
      );
      alert(
        "결제 요청 중 오류가 발생했습니다: " +
          (error.response ? error.response.data.error : error.message)
      );
    }
  };
  if (!accommodation) {
    return <div className="yeogi-container">로딩 중...</div>;
  }

  return (
    <div className="yeogi-container">
      <Header title="예약하기" showBackButton={true} />
      <main className="yeogi-main reservation-content">
        <div className="reservation-form">
          <h1>{accommodation.name} 예약</h1>
          <div className="accommodation-summary">
            <img src={accommodation.image_url} alt={accommodation.name} />
            <div>
              <p>
                <strong>위치:</strong> {accommodation.location}
              </p>
              <p>
                <strong>가격:</strong> {accommodation.price}원 / 박
              </p>
            </div>
          </div>
          <div className="reservation-details">
            <p>
              <strong>체크인 날짜:</strong>{" "}
              {reservationInfo.checkIn || "날짜를 선택해주세요"}
            </p>
            <p>
              <strong>체크아웃 날짜:</strong>{" "}
              {reservationInfo.checkOut || "날짜를 선택해주세요"}
            </p>
            <p>
              <strong>인원 수:</strong> {reservationInfo.guests}명
            </p>
          </div>
          <button
            type="button"
            onClick={handleReservation}
            className="reservation-button"
          >
            예약하기
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default ReservationPage;
