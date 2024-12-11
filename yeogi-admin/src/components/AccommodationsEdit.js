import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosConfig";
import "./AccommodationsEdit.css";

function AccommodationEdit() {
  const [accommodations, setAccommodations] = useState([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccommodations = async () => {
      try {
        const response = await api.get("/api/admin/accommodations", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setAccommodations(response.data);
        if (response.data.length > 0) {
          setSelectedAccommodation(response.data[0]);
        }
      } catch (error) {
        console.error("숙소 목록 조회 실패:", error);
        if (error.response && error.response.status === 401) {
          navigate("/admin/login");
        }
      }
    };

    fetchAccommodations();
  }, [navigate]);

  const handleAccommodationSelect = (e) => {
    const selected = accommodations.find(
      (acc) => acc.id === Number(e.target.value)
    );
    setSelectedAccommodation(selected);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedAccommodation({ ...selectedAccommodation, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(
        `/api/admin/accommodation/${selectedAccommodation.id}`,
        selectedAccommodation,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      alert(response.data.message);
      if (response.data.futureBookingsExist) {
        alert(
          "주의: 이미 예약된 건에 대해서는 변경된 정보가 적용되지 않습니다."
        );
      }
    } catch (error) {
      console.error("숙소 정보 업데이트 실패:", error);
      alert("숙소 정보 업데이트에 실패했습니다.");
      if (error.response && error.response.status === 401) {
        navigate("/admin/login");
      }
    }
  };

  if (!selectedAccommodation) return <div className="loading">로딩 중...</div>;

  return (
    <div className="accommodation-edit">
      <h1>숙소 정보 수정</h1>
      <select
        onChange={handleAccommodationSelect}
        value={selectedAccommodation.id}
      >
        {accommodations.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name}
          </option>
        ))}
      </select>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">숙소 이름</label>
          <input
            type="text"
            id="name"
            name="name"
            value={selectedAccommodation.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="location">위치</label>
          <input
            type="text"
            id="location"
            name="location"
            value={selectedAccommodation.location}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="price">가격</label>
          <input
            type="number"
            id="price"
            name="price"
            value={selectedAccommodation.price}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="max_guests">최대 인원</label>
          <input
            type="number"
            id="max_guests"
            name="max_guests"
            value={selectedAccommodation.max_guests}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">설명</label>
          <textarea
            id="description"
            name="description"
            value={selectedAccommodation.description}
            onChange={handleInputChange}
            required
          ></textarea>
        </div>
        <button className="edit-button" type="submit">
          수정 완료
        </button>
      </form>
    </div>
  );
}

export default AccommodationEdit;
