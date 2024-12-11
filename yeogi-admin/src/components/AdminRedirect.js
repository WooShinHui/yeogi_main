import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosConfig";

function AdminRedirect() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccommodation = async () => {
      try {
        const response = await api.get("/api/admin/check-accommodation"); // headers 제거 (axiosConfig에서 자동으로 처리)
        if (response.data.hasAccommodation) {
          navigate("/dashboard"); // "/admin/dashboard" -> "/dashboard"
        } else {
          navigate("/register-accommodation"); // "/admin/register-accommodation" -> "/register-accommodation"
        }
      } catch (error) {
        console.error("Error checking accommodation:", error);
        navigate("/"); // "/admin/login" -> "/"
      } finally {
        setLoading(false);
      }
    };

    checkAccommodation();
  }, [navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return null;
}

export default AdminRedirect;
