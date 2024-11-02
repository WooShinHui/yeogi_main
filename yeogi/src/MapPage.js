import React, { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HotelInfo from "./components/HotelInfo";
import axios from "axios";
import "./MapPage.css";

function MapPage() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const API_BASE_URL = "http://52.78.227.255:3002";

  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=2d218dc43789eda5952b97c178f26fe9&autoload=false&libraries=services`;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = mapRef.current;
        const options = {
          center: new window.kakao.maps.LatLng(37.566826, 126.9786567),
          level: 5,
        };
        const newMap = new window.kakao.maps.Map(container, options);
        setMap(newMap);
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleSearch = async () => {
    if (!map) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/accommodations/search`,
        {
          params: { location: searchKeyword },
        }
      );
      const accommodations = response.data;

      if (accommodations.length === 0) {
        alert("검색 결과가 없습니다.");
        return;
      }

      const bounds = new window.kakao.maps.LatLngBounds();
      let customOverlays = [];

      // 기존 오버레이 제거
      customOverlays.forEach((item) => item.overlay.setMap(null));
      customOverlays = [];

      accommodations.forEach((accommodation) => {
        const position = new window.kakao.maps.LatLng(
          accommodation.latitude,
          accommodation.longitude
        );

        const content = document.createElement("div");
        content.className = "price-bubble";
        content.innerHTML = `<span>${accommodation.price}원</span>`;

        const customOverlay = new window.kakao.maps.CustomOverlay({
          position: position,
          content: content,
          yAnchor: 1,
        });

        customOverlay.setMap(map);

        customOverlays.push({
          overlay: customOverlay,
          accommodation: accommodation,
        });

        bounds.extend(position);

        content.addEventListener("click", () => {
          setSelectedHotel(accommodation);
        });
      });

      // 첫 번째 숙소 위치로 지도 중심 이동
      const firstAccommodation = accommodations[0];
      const centerPosition = new window.kakao.maps.LatLng(
        firstAccommodation.latitude,
        firstAccommodation.longitude
      );
      map.setCenter(centerPosition);

      // 모든 숙소를 포함하도록 지도 범위 조정
      map.setBounds(bounds);
    } catch (error) {
      console.error("숙소 검색 중 오류 발생:", error);
      alert("숙소 검색에 실패했습니다.");
    }
  };

  return (
    <div className="yeogi-container">
      <Header title="지도" showBackButton={true} centerTitle={true} />
      <div className="yeogi-content">
        <main className="yeogi-main map-page-content">
          <div className="search-container">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="위치 검색"
            />
            <button onClick={handleSearch}>검색</button>
          </div>
          <div ref={mapRef} className="map-container">
            {selectedHotel && <HotelInfo hotel={selectedHotel} />}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default MapPage;
