import React, { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import "./UserManagement.css";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [sortByDate, setSortByDate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("서버 응답:", response.data);
      if (Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      } else {
        console.error("서버에서 받은 users가 배열이 아닙니다:", response.data);
        setUsers([]);
      }
    } catch (error) {
      console.error("사용자 데이터 가져오기 실패:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "날짜 없음";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "유효하지 않은 날짜";
      }
      return format(date, "yyyy-MM-dd");
    } catch (error) {
      console.error("날짜 형식 변환 오류:", error);
      return "날짜 오류";
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("정말로 이 사용자를 삭제하시겠습니까?")) {
      try {
        const response = await axios.delete(`/api/admin/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.status === 200) {
          setUsers(users.filter((user) => user.id !== userId));
          alert("사용자가 삭제되었습니다.");
        } else {
          throw new Error("사용자 삭제에 실패했습니다.");
        }
      } catch (error) {
        console.error("사용자 삭제 실패:", error);
        alert(error.response?.data?.error || "사용자 삭제에 실패했습니다.");
      }
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone_number.includes(searchTerm)
  );

  const sortedUsers = sortByDate
    ? [...filteredUsers].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
    : filteredUsers;

  return (
    <div className="user-management">
      <div className="user-header">
        <h1>회원 관리</h1>
        <div className="user-actions">
          <input
            type="text"
            placeholder="닉네임, 이메일, 전화번호로 검색"
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
      {sortedUsers.length > 0 ? (
        <div className="table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>이메일</th>
                <th>닉네임</th>
                <th>전화번호</th>
                <th>가입일</th>
                <th>마지막 로그인</th>
                <th>회원 관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.nickname}</td>
                  <td>{user.phone_number}</td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>{formatDate(user.last_login)}</td>
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteUser(user.id)}
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
        <p>사용자 정보가 없습니다.</p>
      )}
    </div>
  );
}

export default UserManagement;
