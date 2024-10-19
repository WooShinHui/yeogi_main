import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";

function SearchResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const location = searchParams.get("location");
        const checkIn = searchParams.get("checkIn");
        const checkOut = searchParams.get("checkOut");
        const guests = searchParams.get("guests");

        console.log("Sending request with params:", {
          location,
          checkIn,
          checkOut,
          guests,
        });

        const data = await searchAccommodations(
          location,
          checkIn,
          checkOut,
          guests
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
    return <div>검색 중...</div>;
  }

  return (
    <div className="search-results">
      <h1>검색 결과</h1>
      <Link to="/Yeogi">홈으로 돌아가기</Link>
      {results.length === 0 ? (
        <p>검색 결과가 없습니다.</p>
      ) : (
        <ul>
          {results.map((item) => (
            <li key={item.id}>
              <h2>{item.name}</h2>
              <p>위치: {item.location}</p>
              <p>가격: {item.price}원 / 박</p>
              {/* 필요한 다른 정보들 추가 */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchResults;
