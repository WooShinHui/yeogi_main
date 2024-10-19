import React from "react";
import { useNavigate } from "react-router-dom";
import "./HotelInfo.css";

function HotelInfo({ hotel }) {
  const navigate = useNavigate();

  if (!hotel) return null;

  const handleClick = () => {
    navigate(`/accommodation/${hotel.id}`);
  };

  return (
    <div className="hotel-info" onClick={handleClick}>
      <img src={hotel.image_url} alt={hotel.name} className="hotel-image" />
      <div className="hotel-details">
        <h3 className="hotel-name">{hotel.name}</h3>
        <p className="hotel-price">{hotel.price}원 / 박</p>
        <p className="hotel-location">{hotel.location}</p>
        <p className="hotel-description">{hotel.description}</p>
      </div>
    </div>
  );
}

export default HotelInfo;
