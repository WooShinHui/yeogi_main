import React, { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import "./BookingManagement.css";

function BookingManagement() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get("/api/admin/bookings", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        console.log("서버 응답:", response.data); // 디버깅을 위해 로그 추가
        setBookings(response.data.bookings || []); // bookings가 없으면 빈 배열 사용
      } catch (error) {
        console.error("예약 정보 조회 실패:", error);
      }
    };

    fetchBookings();
  }, []);

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), "yyyy-MM-dd");
    } catch (error) {
      console.error("날짜 형식 변환 오류:", error);
      return dateString;
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm("정말로 이 예약을 삭제하시겠습니까?")) {
      try {
        const response = await axios.delete(
          `/api/admin/bookings/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.status === 200) {
          setBookings(bookings.filter((booking) => booking.id !== bookingId));
          alert("예약이 삭제되었습니다.");
        } else {
          throw new Error("예약 삭제에 실패했습니다.");
        }
      } catch (error) {
        console.error("예약 삭제 실패:", error);
        alert(error.response?.data?.error || "예약 삭제에 실패했습니다.");
      }
    }
  };

  return (
    <div className="booking-management">
      <h1>예약 관리</h1>
      {Array.isArray(bookings) && bookings.length > 0 ? (
        <table className="booking-table">
          <thead>
            <tr>
              <th>예약자</th>
              <th>이메일</th>
              <th>숙소</th>
              <th>체크인</th>
              <th>체크아웃</th>
              <th>인원</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.nickname}</td>
                <td>{booking.email}</td>
                <td>{booking.accommodation_name}</td>
                <td>{formatDate(booking.check_in_date)}</td>
                <td>{formatDate(booking.check_out_date)}</td>
                <td>{booking.guests}</td>
                <td>
                  <button onClick={() => handleDeleteBooking(booking.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>예약 정보가 없습니다.</p>
      )}
    </div>
  );
}

export default BookingManagement;
