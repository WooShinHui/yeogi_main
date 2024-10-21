import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { searchAccommodations } from "../api/accommodationApi";
import Header from "../components/Header";
import Footer from "../components/Footer";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import ko from "date-fns/locale/ko";
import { format, differenceInDays } from "date-fns";
import { FaCalendarAlt, FaUser } from "react-icons/fa";
import "./SearchResultsPages.css";
import "../styles/common.css";

registerLocale("ko", ko);

function SearchResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [guests, setGuests] = useState(1);
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  useEffect(() => {
    const checkInDate = searchParams.get("checkIn");
    const checkOutDate = searchParams.get("checkOut");
    const guestsParam = searchParams.get("guests");

    if (checkInDate) setCheckIn(new Date(checkInDate));
    if (checkOutDate) setCheckOut(new Date(checkOutDate));
    if (guestsParam) setGuests(parseInt(guestsParam, 10));

    fetchResults();
  }, [location.search]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const data = await searchAccommodations(Object.fromEntries(searchParams));
      console.log("서버에서 받은 데이터:", data);
      setResults(data);
    } catch (error) {
      console.error("결과 가져오기 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setCheckIn(start);
    setCheckOut(end);

    if (start && end) {
      searchParams.set("checkIn", format(start, "yyyy-MM-dd"));
      searchParams.set("checkOut", format(end, "yyyy-MM-dd"));
      navigate(`${location.pathname}?${searchParams.toString()}`);
      setShowDatePicker(false);
    }
  };

  const handleGuestChange = (newGuests) => {
    setGuests(newGuests);
    searchParams.set("guests", newGuests.toString());
    navigate(`${location.pathname}?${searchParams.toString()}`);
    setShowGuestSelector(false);
  };

  const formatDateRange = () => {
    if (checkIn && checkOut) {
      const nights = differenceInDays(checkOut, checkIn);
      return `${format(checkIn, "M월 d일")} - ${format(
        checkOut,
        "M월 d일"
      )}, ${nights}박`;
    }
    return "날짜 선택";
  };

  return (
    <div className="yeogi-container">
      <Header />
      <div className="yeogi-content">
        <main className="yeogi-main search-results-content">
          <div className="search-filters">
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
                    monthsShown={1}
                    minDate={new Date()}
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
                  <button onClick={() => handleGuestChange(guests + 1)}>
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="loading-message">검색 중...</div>
          ) : results.length > 0 ? (
            <div className="search-results">
              {results.map((accommodation) => (
                <Link
                  to={`/accommodation/${
                    accommodation.id
                  }?${searchParams.toString()}`}
                  key={accommodation.id}
                  className="accommodation-card"
                >
                  <div className="accommodation-image">
                    <img
                      src={accommodation.image_url}
                      alt={accommodation.name}
                    />
                  </div>
                  <div className="accommodation-details">
                    <h3>{accommodation.name}</h3>
                    <p className="location">{accommodation.location}</p>
                    <p className="type">{accommodation.type}</p>
                    <p className="price">
                      {accommodation.price.toLocaleString()}원 / 박
                    </p>
                    <p className="max-guests">
                      최대 {accommodation.max_guests}명
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="no-results-message">
              <p>입력하신 조건에 맞는 숙소가 없습니다.</p>
              <p>다른 조건으로 검색해 보세요.</p>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default SearchResultsPage;
