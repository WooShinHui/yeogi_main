import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import "./InquiryManagement.css";

function InquiryManagement() {
  const [inquiries, setInquiries] = useState([]);
  const [sortByDate, setSortByDate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [reply, setReply] = useState("");

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const response = await axios.get("/api/admin/inquiries", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (Array.isArray(response.data.inquiries)) {
        setInquiries(response.data.inquiries);
      } else {
        console.error(
          "서버에서 받은 inquiries가 배열이 아닙니다:",
          response.data
        );
        setInquiries([]);
      }
    } catch (error) {
      console.error("문의 데이터 가져오기 실패:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "날짜 없음";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "유효하지 않은 날짜";
      }
      return format(date, "yyyy-MM-dd HH:mm");
    } catch (error) {
      console.error("날짜 형식 변환 오류:", error);
      return "날짜 오류";
    }
  };
  const handleReply = async () => {
    try {
      const response = await axios.post(
        `/api/admin/inquiries/${selectedInquiry.id}/answer`, // URL 수정
        {
          response: reply, // 서버 API에 맞게 필드명 수정
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.status === 200) {
        setInquiries(
          inquiries.map((inquiry) =>
            inquiry.id === selectedInquiry.id
              ? { ...inquiry, status: "answered", response: reply }
              : inquiry
          )
        );
        setShowModal(false);
        setReply("");
        setSelectedInquiry(null);
        alert("답변이 등록되었습니다.");
      }
    } catch (error) {
      console.error("답변 등록 실패:", error);
      alert("답변 등록에 실패했습니다.");
    }
  };
  const handleUpdateStatus = async (inquiryId, newStatus) => {
    try {
      const response = await axios.patch(
        `/api/admin/inquiries/${inquiryId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.status === 200) {
        setInquiries(
          inquiries.map((inquiry) =>
            inquiry.id === inquiryId
              ? { ...inquiry, status: newStatus }
              : inquiry
          )
        );
        alert("문의 상태가 업데이트되었습니다.");
      }
    } catch (error) {
      console.error("문의 상태 업데이트 실패:", error);
      alert("문의 상태 업데이트에 실패했습니다.");
    }
  };

  const filteredInquiries = inquiries.filter(
    (inquiry) =>
      inquiry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedInquiries = sortByDate
    ? [...filteredInquiries].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
    : filteredInquiries;

  return (
    <div className="inquiry-management">
      <div className="inquiry-header">
        <h1>문의 관리</h1>
        <div className="inquiry-actions">
          <input
            type="text"
            placeholder="제목, 내용, 이메일로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button
            onClick={() => setSortByDate(!sortByDate)}
            className="sort-button"
          >
            날짜순
          </button>
        </div>
      </div>
      {sortedInquiries.length > 0 ? (
        <div className="table-container">
          <table className="inquiry-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>내용</th>
                <th>작성자</th>
                <th>작성일</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedInquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>{inquiry.title}</td>
                  <td className="content-cell">{inquiry.content}</td>
                  <td>{inquiry.user_email}</td>
                  <td>{formatDate(inquiry.created_at)}</td>
                  <td>
                    <span className={`status ${inquiry.status}`}>
                      {inquiry.status === "pending"
                        ? "대기중"
                        : inquiry.status === "in_progress"
                        ? "처리중"
                        : inquiry.status === "answered"
                        ? "답변완료"
                        : "대기중"}
                    </span>
                  </td>
                  <td>
                    {inquiry.status !== "answered" ? (
                      <button
                        className="reply-button"
                        onClick={() => {
                          setSelectedInquiry(inquiry);
                          setShowModal(true);
                        }}
                      >
                        답변하기
                      </button>
                    ) : (
                      <button
                        className="reply-button completed"
                        disabled
                        title="이미 답변이 완료된 문의입니다"
                      >
                        답변완료
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>문의 내역이 없습니다.</p>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>문의 답변</h2>
              <span
                className="close-icon"
                onClick={() => {
                  setShowModal(false);
                  setSelectedInquiry(null);
                  setReply("");
                }}
              >
                ×
              </span>
            </div>
            <div className="inquiry-details">
              <p>
                <strong>제목:</strong> {selectedInquiry.title}
              </p>
              <p>
                <strong>내용:</strong> {selectedInquiry.content}
              </p>
              <p>
                <strong>작성자:</strong> {selectedInquiry.user_email}
              </p>
            </div>
            <textarea
              value={reply}
              className="answer-textarea"
              onChange={(e) => setReply(e.target.value)}
              placeholder="답변을 입력하세요"
              rows={4}
            />
            <div className="answer-button-container">
              <button className="submit-button" onClick={handleReply}>
                답변 등록
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setShowModal(false);
                  setSelectedInquiry(null);
                  setReply("");
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InquiryManagement;
