import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AdminRedirect() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccommodation = async () => {
      try {
        const response = await axios.get("/api/admin/check-accommodation", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (response.data.hasAccommodation) {
          navigate("/admin/dashboard");
        } else {
          navigate("/admin/register-accommodation");
        }
      } catch (error) {
        console.error("Error checking accommodation:", error);
        navigate("/admin/login");
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
