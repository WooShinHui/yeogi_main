import axios from "axios";

// axios 인스턴스 생성
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3002", // 기본 URL 설정
  timeout: 10000, // 요청 타임아웃 설정
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // 401: 인증되지 않음
      // 403: 권한 없음
      if (error.response.status === 401 || error.response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("adminId");
        window.location.href = "/admin/login";
      }

      // 500: 서버 에러
      if (error.response.status === 500) {
        console.error("서버 에러가 발생했습니다.");
      }
    } else if (error.request) {
      // 요청이 이루어졌으나 응답을 받지 못한 경우
      console.error("서버로부터 응답이 없습니다.");
    } else {
      // 요청 설정 중에 문제가 발생한 경우
      console.error("요청 설정 중 오류가 발생했습니다.");
    }

    return Promise.reject(error);
  }
);

// 인스턴스 내보내기
export default instance;
