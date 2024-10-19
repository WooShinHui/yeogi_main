import React from "react";
import "./SearchResults.css";
function SearchResults({ results }) {
  return (
    <div className="search-results">
      {results.map((accommodation) => (
        <div key={accommodation.id} className="accommodation-card">
          <div className="accommodation-image">
            <img src={accommodation.image_url} alt={accommodation.name} />
          </div>
          <div className="accommodation-details">
            <h3>{accommodation.name}</h3>
            <p>{accommodation.location}</p>
            <p>가격: {accommodation.price}원 / 박</p>
            <p>최대 인원: {accommodation.max_guests}명</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SearchResults;
