import React, { useState } from "react";
import "./ImageSlider.css";

function ImageSlider({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // images가 없거나 빈 배열일 경우 처리
  if (!images || images.length === 0) {
    return <div className="slider-container">이미지가 없습니다.</div>;
  }

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  return (
    <div className="slider-container">
      <button className="slider-button left" onClick={goToPrevious}>
        &lt;
      </button>
      <img
        src={images[currentIndex]}
        alt={`Slide ${currentIndex}`}
        className="slider-image"
      />
      <button className="slider-button right" onClick={goToNext}>
        &gt;
      </button>
    </div>
  );
}

export default ImageSlider;
