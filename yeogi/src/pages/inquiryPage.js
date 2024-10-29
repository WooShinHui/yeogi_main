import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./inquiryPage.css";

function InquiryPage() {
  const [inquiry, setInquiry] = useState({
    title: "",
    content: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(inquiry),
      });

      if (response.ok) {
        alert("문의가 성공적으로 등록되었습니다.");
        setInquiry({ title: "", content: "" });
      } else {
        alert("문의 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("문의 등록 중 오류 발생:", error);
      alert("문의 등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="yeogi-container">
      <Header title="1:1 문의" showBackButton centerTitle />
      <main className="yeogi-main inquiry-content">
        <div className="inquiry-form-container">
          <form onSubmit={handleSubmit} className="inquiry-form">
            <div className="form-group">
              <label>문의 제목</label>
              <input
                type="text"
                placeholder="문의 제목을 입력해주세요"
                value={inquiry.title}
                onChange={(e) =>
                  setInquiry({ ...inquiry, title: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>문의 내용</label>
              <textarea
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
      </main>
      <Footer />
    </div>
  );
}

export default InquiryPage;
