import React, { useState, useEffect, useRef } from "react";
import api from "../axiosConfig";
import { useNavigate } from "react-router-dom";
import "./RegisterAccommodation.css";

function RegisterAccommodation() {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    price: "",
    max_guests: "",
    description: "",
    image_url: "",
    latitude: "",
    longitude: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=2d218dc43789eda5952b97c178f26fe9&libraries=services`;
    script.async = true;
    script.onload = () => {
      initializeMap();
    };
    document.head.appendChild(script);
  }, []);
  const initializeMap = () => {
    const container = document.getElementById("map");
    const options = {
      center: new window.kakao.maps.LatLng(37.566826, 126.9786567),
      level: 3,
    };

    const map = new window.kakao.maps.Map(container, options);
    mapRef.current = map;

    const marker = new window.kakao.maps.Marker({
      position: map.getCenter(),
    });
    marker.setMap(map);
    markerRef.current = marker;

    window.kakao.maps.event.addListener(map, "click", (mouseEvent) => {
      const latlng = mouseEvent.latLng;
      marker.setPosition(latlng);
      setFormData((prev) => ({
        ...prev,
        latitude: latlng.getLat(),
        longitude: latlng.getLng(),
      }));
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/register-accommodation", formData); // axios 대신 api 사용
      navigate("/admin/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.error || "숙소 등록 중 오류가 발생했습니다."
      );
    }
  };

  return (
    <div className="register-accommodation">
      <h2>숙소 등록</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">숙소 이름</label>
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="숙소 이름을 입력하세요"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="location">위치</label>
          <input
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="숙소 위치를 입력하세요"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="price">가격</label>
          <input
            id="price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            placeholder="1박 가격을 입력하세요 (ex 100000)"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="max_guests">최대 숙박인원</label>
          <input
            id="max_guests"
            name="max_guests"
            type="number"
            value={formData.max_guests}
            onChange={handleChange}
            placeholder="최대 숙박 가능 인원을 입력하세요"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">설명</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="숙소에 대한 상세 설명을 입력하세요"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="image_url">이미지 URL</label>
          <input
            id="image_url"
            name="image_url"
            value={formData.image_url}
            onChange={handleChange}
            placeholder="숙소 이미지 URL을 입력하세요"
          />
        </div>
        <div className="map-container">
          <div id="map" style={{ width: "100%", height: "400px" }}></div>
          <p className="map-instructions">
            지도를 클릭하여 숙소 위치를 선택하세요.
          </p>
        </div>
        <div className="form-group">
          <label htmlFor="latitude">위도</label>
          <input
            id="latitude"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            placeholder="위도"
            readOnly
          />
        </div>
        <div className="form-group">
          <label htmlFor="longitude">경도</label>
          <input
            id="longitude"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            placeholder="경도"
            readOnly
          />
        </div>
        <button type="submit" className="submit-button">
          숙소 등록
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
}

export default RegisterAccommodation;
