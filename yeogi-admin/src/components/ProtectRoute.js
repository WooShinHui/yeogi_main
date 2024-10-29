import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ProtectRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("adminToken");
      console.log("Current token:", token);

      if (!token) {
        console.log("No token found, redirecting to login");
        navigate("/admin/login");
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, [navigate]);

  return isAuthenticated ? children : null;
};

export default ProtectRoute;
