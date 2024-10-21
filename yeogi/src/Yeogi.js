import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { ko } from "date-fns/locale";
import { format, setDefaultOptions } from "date-fns";
import { registerLocale } from "react-datepicker";
import { useNavigate, Link } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import "./Component.css";
import "./Main.css";
import axios from "axios";
import Header from "./components/Header";
import Footer from "./components/Footer";

function Yeogi() {
  const [searchParams, setSearchParams] = useState({
    destination: "",
    checkIn: null,
    checkOut: null,
    guests: 1,
  });
  const [categories, setCategories] = useState([]);
  const [recommendedHotels, setRecommendedHotels] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
    fetchRecommendedHotels();
  }, []);
  useEffect(() => {
    console.log("Search Results:", searchResults);
  }, [searchResults]);
  const formatMonthYear = (date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  registerLocale("ko", ko);
  setDefaultOptions({ locale: ko });
  const fetchCategories = async () => {
    try {
      const response = await axios.get("http://localhost:3001/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("카테고리 불러오기 오류:", error);
    }
  };

  const fetchRecommendedHotels = async () => {
    try {
      const response = await axios.get("/recommended-hotels", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setRecommendedHotels(response.data);
    } catch (error) {
      console.error("추천 호텔 조회 오류:", error);
    }
  };
  const isDateRangeAvailable = (accommodation, start, end) => {
    if (!start || !end) return true;
    if (!accommodation.bookings || !Array.isArray(accommodation.bookings))
      return true;

    const checkIn = new Date(start);
    const checkOut = new Date(end);
    return !accommodation.bookings.some((booking) => {
      const bookingStart = new Date(booking.check_in_date);
      const bookingEnd = new Date(booking.check_out_date);
      return (
        (checkIn >= bookingStart && checkIn < bookingEnd) ||
        (checkOut > bookingStart && checkOut <= bookingEnd) ||
        (checkIn <= bookingStart && checkOut >= bookingEnd)
      );
    });
  };
  const handleSearch = async () => {
    if (!searchParams.destination) {
      alert("목적지를 입력해주세요.");
      return;
    }
    if (!searchParams.checkIn || !searchParams.checkOut) {
      alert("체크인과 체크아웃 날짜를 모두 선택해주세요.");
      return;
    }

    const guestsValue = parseInt(searchParams.guests, 10);

    try {
      const response = await axios.get(
        "http://localhost:3001/api/accommodations/search",
        {
          params: {
            location: searchParams.destination,
            checkIn: searchParams.checkIn
              ? format(searchParams.checkIn, "yyyy-MM-dd")
              : null,
            checkOut: searchParams.checkOut
              ? format(searchParams.checkOut, "yyyy-MM-dd")
              : null,
            guests: isNaN(guestsValue) ? null : guestsValue,
          },
        }
      );

      // 예약 가능한 숙소만 필터링
      const availableAccommodations = response.data.filter((accommodation) =>
        isDateRangeAvailable(
          accommodation,
          searchParams.checkIn,
          searchParams.checkOut
        )
      );

      setSearchResults(availableAccommodations);
      // 검색 기록 저장
      await axios.post(
        "/api/search-history",
        { keyword: searchParams.destination },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      // URL 파라미터 업데이트
      const queryParams = new URLSearchParams({
        location: searchParams.destination,
        checkIn: format(searchParams.checkIn, "yyyy-MM-dd"),
        checkOut: format(searchParams.checkOut, "yyyy-MM-dd"),
        guests: searchParams.guests,
      });

      navigate(`/accommodations/search?${queryParams.toString()}`);
    } catch (error) {
      console.error("숙소 검색 오류:", error);
      alert("숙소 검색 중 오류가 발생했습니다.");
    }
  };

  const handleCategoryClick = (categoryName) => {
    const queryParams = new URLSearchParams({
      type: categoryName,
    });
    navigate(`/accommodations/search?${queryParams.toString()}`);
  };
  const handleHotelClick = (hotelId) => {
    navigate(`/accommodation/${hotelId}`);
  };
  return (
    <div className="yeogi-container">
      <Header showMyPage={true} />
      <div className="yeogi-content">
        <main className="yeogi-main">
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
                minDate={new Date()} // 오늘 이전 날짜 선택 불가
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
                minDate={searchParams.checkIn || new Date()} // 체크인 날짜 이후 또는 오늘 이후
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

          <section className="categories-grid">
            {categories.map((category) => (
              <div
                key={category.id}
                className="category-item"
                onClick={() => handleCategoryClick(category.name)}
              >
                <div className="category-image">
                  <img src={category.image_url} alt={category.name} />
                </div>
                <p className="category-name">{category.name}</p>
              </div>
            ))}
          </section>

          <section className="ad-banner">
            <p>
              국내부터 해외까지
              <br />
              여행할때 여기어때
            </p>
            <img src="./images/ad_banner.png" alt="광고 배너" />
          </section>

          <section className="recommended-section">
            <h2>여기어때?</h2>
            <div className="recommended-hotels-container">
              <div className="recommended-hotels">
                {recommendedHotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    className="hotel-card"
                    onClick={() => handleHotelClick(hotel.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <img src={hotel.image_url} alt={hotel.name} />
                    <h3>{hotel.name}</h3>
                    <p>{hotel.price}원 / 박</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default Yeogi;
