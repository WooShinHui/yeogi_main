import React, { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import "./ReviewManagement.css";

function ReviewManagement() {
  const [reviews, setReviews] = useState([]);
  const [sortByDate, setSortByDate] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get("/api/admin/reviews", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        console.log("서버 응답:", response.data);
        if (Array.isArray(response.data.reviews)) {
          setReviews(response.data.reviews);
        } else {
          console.error(
            "서버에서 받은 reviews가 배열이 아닙니다:",
            response.data
          );
          setReviews([]);
        }
      } catch (error) {
        console.error("리뷰 데이터 가져오기 실패:", error);
      }
    };

    fetchReviews();
  }, []);

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), "yyyy-MM-dd");
    } catch (error) {
      console.error("날짜 형식 변환 오류:", error);
      return dateString;
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm("정말로 이 리뷰를 삭제하시겠습니까?")) {
      try {
        const response = await axios.delete(`/api/admin/reviews/${reviewId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.status === 200) {
          setReviews(reviews.filter((review) => review.id !== reviewId));
          alert("리뷰가 삭제되었습니다.");
        } else {
          throw new Error("리뷰 삭제에 실패했습니다.");
        }
      } catch (error) {
        console.error("리뷰 삭제 실패:", error);
        alert(error.response?.data?.error || "리뷰 삭제에 실패했습니다.");
      }
    }
  };

  const sortReviews = () => {
    const sortedReviews = [...reviews].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateA - dateB;
    });
    setReviews(sortedReviews);
    setSortByDate(true);
  };

  return (
    <div className="review-management">
      <div className="review-header">
        <h1>리뷰 관리</h1>
        <button onClick={sortReviews} className="sort-button">
          날짜순
        </button>
      </div>
      {reviews.length > 0 ? (
        <div className="table-container">
          <table className="review-table">
            <thead>
              <tr>
                <th>작성자</th>
                <th>숙소</th>
                <th>평점</th>
                <th>내용</th>
                <th>작성일</th>
                <th>리뷰 관리</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>{review.nickname}</td>
                  <td>{review.accommodation_name}</td>
                  <td>{review.rating}</td>
                  <td title={review.content}>{review.content}</td>
                  <td>{formatDate(review.created_at)}</td>
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>리뷰 정보가 없습니다.</p>
      )}
    </div>
  );
}

export default ReviewManagement;
