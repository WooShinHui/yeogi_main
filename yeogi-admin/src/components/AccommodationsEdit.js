import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AccommodationsEdit.css";

function AccommodationEdit() {
  const [accommodations, setAccommodations] = useState([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);

  useEffect(() => {
    const fetchAccommodations = async () => {
      try {
        const response = await axios.get("/api/admin/accommodations", {
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
      }
    };

    fetchAccommodations();
  }, []);

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
      const response = await axios.put(
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
      // ... (나머지 코드)
    } catch (error) {
      console.error("숙소 정보 업데이트 실패:", error);
      alert("숙소 정보 업데이트에 실패했습니다.");
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
          <input
            type="text"
            id="name"
            name="name"
            value={selectedAccommodation.name}
            onChange={handleInputChange}
            required
            placeholder="숙소 이름"
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            id="location"
            name="location"
            value={selectedAccommodation.location}
            onChange={handleInputChange}
            required
            placeholder="위치"
          />
        </div>
        <div className="form-group">
          <input
            type="number"
            id="price"
            name="price"
            value={selectedAccommodation.price}
            onChange={handleInputChange}
            required
            placeholder="가격"
          />
        </div>
        <div className="form-group">
          <input
            type="number"
            id="max_guests"
            name="max_guests"
            value={selectedAccommodation.max_guests}
            onChange={handleInputChange}
            required
            placeholder="최대 인원"
          />
        </div>
        <div className="form-group">
          <textarea
            id="description"
            name="description"
            value={selectedAccommodation.description}
            onChange={handleInputChange}
            required
            placeholder="설명"
          ></textarea>
        </div>
        <button type="submit">수정 완료</button>
      </form>
    </div>
  );
}

export default AccommodationEdit;
