import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./inquiryPage.css";
import api from "../api/axiosConfig"; // 상단에 추가
function InquiryPage() {
  const [showNewInquiryForm, setShowNewInquiryForm] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [inquiry, setInquiry] = useState({
    title: "",
    content: "",
  });

  // 문의 목록 조회
  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const response = await api.get("/api/inquiries");
      setInquiries(response.data);
    } catch (error) {
      console.error("문의 목록 조회 중 오류 발생:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/inquiries", inquiry);

      if (response.status === 200 || response.status === 201) {
        alert("문의가 성공적으로 등록되었습니다.");
        setInquiry({ title: "", content: "" });
        setShowNewInquiryForm(false);
        fetchInquiries(); // 목록 새로고침
      } else {
        alert("문의 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("문의 등록 중 오류 발생:", error);
      alert("문의 등록 중 오류가 발생했습니다.");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 문의 목록 화면
  const renderInquiryList = () => (
    <div className="inquiry-list">
      <div className="inquiry-header">
        <h2>나의 문의 내역</h2>
        <button
          className="new-inquiry-button"
          onClick={() => setShowNewInquiryForm(true)}
        >
          새 문의하기
        </button>
      </div>
      {inquiries.length === 0 ? (
        <p className="no-inquiries">문의 내역이 없습니다.</p>
      ) : (
        inquiries.map((item) => (
          <div
            key={item.id}
            className="inquiry-item"
            onClick={() => setSelectedInquiry(item)}
          >
            <div className="inquiry-item-header">
              <h3>{item.title}</h3>
              <span className={`status ${item.status}`}>
                {item.status === "pending" ? "답변 대기" : "답변 완료"}
              </span>
            </div>
            <p className="inquiry-date">{formatDate(item.created_at)}</p>
          </div>
        ))
      )}
    </div>
  );

  // 문의 상세 화면
  const renderInquiryDetail = () => (
    <div className="inquiry-detail">
      <button className="back-to-list" onClick={() => setSelectedInquiry(null)}>
        목록으로
      </button>
      <h2>{selectedInquiry.title}</h2>
      <div className="inquiry-content">
        <p className="date">{formatDate(selectedInquiry.created_at)}</p>
        <p className="content">{selectedInquiry.content}</p>
      </div>
      {selectedInquiry.status === "answered" && (
        <div className="inquiry-response">
          <h3>답변</h3>
          <p className="date">{formatDate(selectedInquiry.response_date)}</p>
          <p className="content">{selectedInquiry.response}</p>
        </div>
      )}
    </div>
  );

  // 새 문의 작성 폼
  const renderNewInquiryForm = () => (
    <div className="inquiry-form-container">
      <div className="form-header">
        <h2>새 문의 작성</h2>
        <button
          className="close-form"
          onClick={() => setShowNewInquiryForm(false)}
        >
          목록으로
        </button>
      </div>
      <form onSubmit={handleSubmit} className="inquiry-form">
        <div className="form-group">
          <label>문의 제목</label>
          <input
            type="text"
            placeholder="문의 제목을 입력해주세요"
            value={inquiry.title}
            onChange={(e) => setInquiry({ ...inquiry, title: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>문의 내용</label>
          <textarea
            className="inquiry-textarea"
            placeholder="문의 내용을 입력해주세요"
            value={inquiry.content}
            onChange={(e) =>
              setInquiry({ ...inquiry, content: e.target.value })
            }
            required
          />
        </div>
        <button type="submit" className="submit-button">
          문의하기
        </button>
      </form>
    </div>
  );

  return (
    <div className="yeogi-container">
      <Header title="1:1 문의" showBackButton centerTitle />
      <main className="yeogi-main inquiry-content">
        {showNewInquiryForm
          ? renderNewInquiryForm()
          : selectedInquiry
          ? renderInquiryDetail()
          : renderInquiryList()}
      </main>
      <Footer />
    </div>
  );
}

export default InquiryPage;
