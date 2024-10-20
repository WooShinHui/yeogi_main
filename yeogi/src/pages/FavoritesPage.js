import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/common.css";
import "./MyPage.css";

function FavoritesPage() {
  const [likedAccommodations, setLikedAccommodations] = useState([]);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchLikedAccommodations();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const response = await api.get("/api/user");
      setUserId(response.data.id);
    } catch (error) {
      console.error("사용자 정보 가져오기 실패:", error);
      navigate("/login");
    }
  };

  const fetchLikedAccommodations = () => {
    api
      .get(`/api/likes/${userId}`)
      .then((response) => {
        console.log("찜한 숙소 데이터:", response.data);
        setLikedAccommodations(response.data);
      })
      .catch((error) => {
        console.error("찜한 숙소 조회 오류:", error);
        setLikedAccommodations([]);
      });
  };

  const handleAccommodationClick = (id) => {
    navigate(`/accommodation/${id}`);
  };

  const handleLike = (accommodationId) => {
    if (!userId) {
      console.error("로그인이 필요합니다.");
      return;
    }

    api
      .delete("/api/likes", { data: { userId, accommodationId } })
      .then(() => {
        fetchLikedAccommodations(); // 찜 목록 새로고침
      })
      .catch((error) => {
        console.error("찜하기 취소 실패:", error);
      });
  };

  return (
    <div className="yeogi-container">
      <Header title="찜한 숙소" showBackButton={true} />
      <main className="yeogi-main my-page-content">
        <div className="my-page-accommodations">
          <h2>찜한 숙소</h2>
          {likedAccommodations.length > 0 ? (
            likedAccommodations.map((accommodation) => (
              <div
                key={accommodation.id}
                className="my-page-accommodation-card"
              >
                <img
                  src={accommodation.image_url}
                  alt={accommodation.name}
                  className="my-page-accommodation-image"
                  onClick={() => handleAccommodationClick(accommodation.id)}
                />
                <div className="my-page-accommodation-details">
                  <h3>{accommodation.name}</h3>
                  <p>{accommodation.location}</p>
                  <p className="my-page-accommodation-price">
                    가격: {accommodation.price}원 / 박
                  </p>
                  <p>최대 인원: {accommodation.max_guests}명</p>
                  <button
                    className="like-button liked"
                    onClick={() => handleLike(accommodation.id)}
                  >
                    찜 취소
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="my-page-no-accommodations">찜한 숙소가 없습니다.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default FavoritesPage;
