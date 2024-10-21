import React, { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO, differenceInDays } from "date-fns";
import "./BookingManagement.css";

function BookingManagement() {
  const [bookings, setBookings] = useState([]);
  const [sortByCheckIn, setSortByCheckIn] = useState(false);
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get("/api/admin/bookings", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        console.log("서버 응답:", response.data); // 디버깅을 위해 로그 추가
        if (Array.isArray(response.data.bookings)) {
          setBookings(response.data.bookings);
        } else {
          console.error(
            "서버에서 받은 bookings가 배열이 아닙니다:",
            response.data
          );
          setBookings([]);
        }
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
  const sortBookings = () => {
    const sortedBookings = [...bookings].sort((a, b) => {
      const dateA = new Date(a.check_in_date);
      const dateB = new Date(b.check_in_date);
      return dateA - dateB;
    });
    setBookings(sortedBookings);
    setSortByCheckIn(true);
  };
  return (
    <div className="booking-management">
      <div className="booking-header">
        <h1>예약 관리</h1>
        <button onClick={sortBookings} className="sort-button">
          날짜순
        </button>
      </div>
      {bookings.length > 0 ? (
        <div className="table-container">
          <table className="booking-table">
            <thead>
              <tr>
                <th>예약자</th>
                <th>이메일</th>
                <th>전화번호</th>
                <th>숙소</th>
                <th>체크인</th>
                <th>체크아웃</th>
                <th>인원</th>
                <th>예약 관리</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: "white", opacity: 1 }}>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.nickname}</td>
                  <td>{booking.email}</td>
                  <td>{booking.phone_number}</td>
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
        </div>
      ) : (
        <p>예약 정보가 없습니다.</p>
      )}
    </div>
  );
}

export default BookingManagement;
