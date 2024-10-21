import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api/axiosConfig";
import "./EditProfilePage.css";

function EditProfilePage() {
  const [user, setUser] = useState({
    nickname: "",
    email: "",
    profile_image: "",
  });
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get("/api/user");
      setUser(response.data);
      setNewNickname(response.data.nickname);
    } catch (error) {
      console.error("사용자 정보 가져오기 실패:", error);
      navigate("/");
    }
  };

  const handleNicknameChange = (e) => {
    setNewNickname(e.target.value);
  };

  const handleNicknameEdit = () => {
    setIsEditingNickname(true);
  };

  const handleNicknameSave = async () => {
    try {
      const response = await api.put("/api/user", { nickname: newNickname });
      setUser({ ...user, nickname: response.data.nickname });
      setIsEditingNickname(false);
      alert("닉네임이 성공적으로 업데이트되었습니다.");
    } catch (error) {
      console.error("닉네임 업데이트 실패:", error);
      if (error.response) {
        // 서버가 응답을 반환한 경우
        alert(`닉네임 업데이트 실패: ${error.response.data.error}`);
      } else if (error.request) {
        // 요청이 전송되었지만 응답을 받지 못한 경우
        alert("서버에서 응답이 없습니다. 네트워크 연결을 확인해 주세요.");
      } else {
        // 요청 설정 중에 오류가 발생한 경우
        alert("요청 설정 중 오류가 발생했습니다.");
      }
    }
  };

  const handleImageChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("profile_image", file);

      try {
        const response = await api.put("/api/user/profile-image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setUser({ ...user, profile_image: response.data.profile_image });
        alert("프로필 이미지가 성공적으로 업데이트되었습니다.");
      } catch (error) {
        console.error("프로필 이미지 업데이트 실패:", error);
        alert("프로필 이미지 업데이트에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  return (
    <div className="yeogi-container">
      <Header title="회원정보 수정" showBackButton={true} />
      <main className="yeogi-main edit-profile-content">
        <div className="edit-profile-form">
          <div className="profile-image-container">
            <img
              src={user.profile_image || "/images/default-profile.png"}
              alt="프로필 이미지"
              className="profile-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/default-profile.png";
              }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              id="profile-image-input"
              className="profile-image-input"
            />
            <label
              htmlFor="profile-image-input"
              className="profile-image-label"
            >
              이미지 변경
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="email-input">이메일</label>
            <input type="email" id="email-input" value={user.email} disabled />
          </div>
          <div className="form-group nickname-group">
            <label htmlFor="nickname-input">닉네임</label>
            <div className="nickname-input-container">
              {isEditingNickname ? (
                <>
                  <input
                    type="text"
                    id="nickname-input"
                    value={newNickname}
                    onChange={handleNicknameChange}
                  />
                  <button onClick={handleNicknameSave} className="save-button">
                    저장
                  </button>
                </>
              ) : (
                <>
                  <span id="nickname-display">{user.nickname}</span>
                  <button onClick={handleNicknameEdit} className="edit-button">
                    수정
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default EditProfilePage;
