import api from "./axiosConfig";

const API_BASE_URL = "http://localhost:3001";

export const searchAccommodations = async (
  location,
  checkIn,
  checkOut,
  guests,
  type
) => {
  try {
    const response = await api.get(
      `${API_BASE_URL}/api/accommodations/search`,
      {
        params: {
          location,
          checkIn,
          checkOut,
          guests,
          type,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      // 서버가 2xx 범위를 벗어나는 상태 코드로 응답한 경우
      console.error("서버 응답 오류:", error.response.data);
      console.error("상태 코드:", error.response.status);
    } else if (error.request) {
      // 요청이 이루어졌으나 응답을 받지 못한 경우
      console.error("응답 수신 실패:", error.request);
    } else {
      // 요청을 설정하는 중에 문제가 발생한 경우
      console.error("요청 설정 오류:", error.message);
    }
    throw error;
  }
};
