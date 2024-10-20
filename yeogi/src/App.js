import React from "react";
import {
  Route,
  Routes,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Register from "./Login";
import Login from "./NextPage";
import Yeogi from "./Yeogi";
import SearchResultsPage from "./pages/SearchResultsPage";
import MapPage from "./MapPage";
import AccommodationDetailPage from "./pages/AccommodationDetailPage";
import MyPage from "./pages/MyPage";
import api from "./api/axiosConfig";
import SearchPage from "./pages/SearchPage";
import ReservationPage from "./pages/ReservationPage";
import ReservationCompletePage from "./ReservationCompletePage";
import ReservationFailPage from "./pages/ReservationFailPage";

function PrivateRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = React.useState(null);

  React.useEffect(() => {
    const checkLoginStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        await api.get("/api/user", { withCredentials: true });
        setIsAuthenticated(true);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          setIsAuthenticated(false);
        }
      }
    };

    checkLoginStatus();
  }, [navigate]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/next-page" state={{ from: location }} replace />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Register />} />
      <Route path="/next-page" element={<Login />} />
      <Route
        path="/yeogi"
        element={
          <PrivateRoute>
            <Yeogi />
          </PrivateRoute>
        }
      />
      <Route
        path="/accommodations/search"
        element={
          <PrivateRoute>
            <SearchResultsPage />
          </PrivateRoute>
        }
      />
      <Route path="/search" element={<SearchPage />} />
      <Route
        path="/mapPage"
        element={
          <PrivateRoute>
            <MapPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/accommodation/:id"
        element={
          <PrivateRoute>
            <AccommodationDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/myPage"
        element={
          <PrivateRoute>
            <MyPage />
          </PrivateRoute>
        }
      />
      <Route path="/reservation/:id" element={<ReservationPage />} />
      <Route
        path="/reservation/complete"
        element={<ReservationCompletePage />}
      />
      <Route path="/reservation/fail" element={<ReservationFailPage />} />
    </Routes>
  );
}

export default App;
