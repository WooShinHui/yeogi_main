import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { searchAccommodations } from "../api/accommodationApi";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./SearchResultsPages.css";
import api from "../api/axiosConfig"; // axiosConfig import
import { format } from "date-fns";
function SearchResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const location = searchParams.get("location");
        const available_from = format(
          new Date(searchParams.get("checkIn")),
          "yyyy-MM-dd"
        );
        const available_to = format(
          new Date(searchParams.get("checkOut")),
          "yyyy-MM-dd"
        );
        const max_guests = searchParams.get("guests");

        const data = await searchAccommodations(
          location,
          available_from,
          available_to,
          max_guests
        );
        setResults(data);
        setLoading(false);
      } catch (error) {
        console.error("결과 가져오기 실패:", error);
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchParams]);
  if (loading) {
    return <div className="yeogi-container">로딩 중...</div>;
  }

  return (
    <div className="yeogi-container">
      <Header />
      <main className="yeogi-main">
        <h2>검색 결과</h2>

        {results.length > 0 ? (
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
                  <img src={accommodation.image_url} alt={accommodation.name} />
                </div>
                <div className="accommodation-details">
                  <h3>{accommodation.name}</h3>
                  <p>{accommodation.location}</p>
                  <p>가격: {accommodation.price}원 / 박</p>
                  <p>최대 인원: {accommodation.max_guests}명</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="no-results-message">
            <p>입력하신 날짜에 예약 가능한 숙소가 없습니다.</p>
            <p>다른 날짜나 위치로 검색해 보세요.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default SearchResultsPage;
