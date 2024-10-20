import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import ko from "date-fns/locale/ko";
import { format } from "date-fns";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/common.css";

registerLocale("ko", ko);

function SearchPage() {
  const [searchParams, setSearchParams] = useState({
    destination: "",
    checkIn: null,
    checkOut: null,
    guests: 1,
  });
  const navigate = useNavigate();

  const formatMonthYear = (date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const handleSearch = () => {
    // 여기에 검색 로직을 구현합니다.
    // 예를 들어, 검색 결과 페이지로 이동할 수 있습니다.
    const queryParams = new URLSearchParams({
      location: searchParams.destination,
      checkIn: searchParams.checkIn
        ? format(searchParams.checkIn, "yyyy-MM-dd")
        : "",
      checkOut: searchParams.checkOut
        ? format(searchParams.checkOut, "yyyy-MM-dd")
        : "",
      guests: searchParams.guests,
    });
    navigate(`/accommodations/search?${queryParams.toString()}`);
  };

  return (
    <div className="yeogi-container">
      <Header title="검색" showBackButton={true} />
      <main className="yeogi-main search-page-content">
        <section className="search-box">
          <h2>지금 어디로 여행가세요?</h2>
          <div className="search-inputs">
            <input
              type="text"
              placeholder="목적지"
              value={searchParams.destination}
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  destination: e.target.value,
                })
              }
            />
            <DatePicker
              selected={searchParams.checkIn}
              onChange={(date) =>
                setSearchParams({ ...searchParams, checkIn: date })
              }
              selectsStart
              startDate={searchParams.checkIn}
              endDate={searchParams.checkOut}
              minDate={new Date()}
              placeholderText="체크인"
              className="date-picker"
              locale="ko"
              dateFormat="yyyy.MM.dd"
              renderCustomHeader={({
                date,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div
                  style={{
                    margin: 10,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                  >
                    {"<"}
                  </button>
                  <span style={{ margin: "0 10px" }}>
                    {formatMonthYear(date)}
                  </span>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                  >
                    {">"}
                  </button>
                </div>
              )}
            />
            <DatePicker
              selected={searchParams.checkOut}
              onChange={(date) =>
                setSearchParams({ ...searchParams, checkOut: date })
              }
              selectsEnd
              startDate={searchParams.checkIn}
              endDate={searchParams.checkOut}
              minDate={searchParams.checkIn || new Date()}
              placeholderText="체크아웃"
              className="date-picker"
              locale="ko"
              dateFormat="yyyy.MM.dd"
              renderCustomHeader={({
                date,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div
                  style={{
                    margin: 10,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                  >
                    {"<"}
                  </button>
                  <span style={{ margin: "0 10px" }}>
                    {formatMonthYear(date)}
                  </span>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                  >
                    {">"}
                  </button>
                </div>
              )}
            />
            <input
              type="number"
              placeholder="인원"
              value={searchParams.guests}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1 || e.target.value === "") {
                  setSearchParams({
                    ...searchParams,
                    guests: e.target.value === "" ? "" : value,
                  });
                }
              }}
              min="1"
              onBlur={(e) => {
                if (e.target.value === "" || parseInt(e.target.value) < 1) {
                  setSearchParams({
                    ...searchParams,
                    guests: 1,
                  });
                }
              }}
            />
            <button onClick={handleSearch}>검색</button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default SearchPage;
