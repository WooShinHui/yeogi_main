import axios from "axios";

const API_BASE_URL = "http://localhost:3001";

export const searchAccommodations = async (
  location,
  available_from,
  available_to,
  max_guests
) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/accommodations/search`,
      {
        params: { location, available_from, available_to, max_guests },
      }
    );
    return response.data;
  } catch (error) {
    console.error("숙소 검색 중 오류 발생:", error);
    throw error;
  }
};
