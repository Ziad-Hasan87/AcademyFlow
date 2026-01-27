import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiLogOut, FiMail, FiUser, FiShield, FiHome } from "react-icons/fi";
import { useEffect, useState } from "react";
import supabase from "../utils/supabase";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { userData, logout } = useAuth();
  const [userName, setUserName] = useState("Loading...");

  useEffect(() => {
    const fetchUserName = async () => {
      if (!userData?.id) {
        setUserName("N/A");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("name")
        .eq("id", userData.id)
        .single();

      if (error) {
        console.error("Error fetching user name:", error);
        setUserName(userData?.name || "N/A");
      } else {
        setUserName(data?.name || userData?.name || "N/A");
      }
    };

    fetchUserName();
  }, [userData?.id, userData?.name]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <div className="page-content">
      <h2>Profile</h2>
      
      <div className="profile-container">
        <div className="profile-field">
          <FiUser size={18} className="profile-field-icon" />
          <div className="profile-field-content">
            <label className="profile-field-label">Name</label>
            <span className="profile-field-value">
              {userName}
            </span>
          </div>
        </div>

        <div className="profile-field">
          <FiMail size={18} className="profile-field-icon" />
          <div className="profile-field-content">
            <label className="profile-field-label">Email</label>
            <span className="profile-field-value email">
              {userData?.email || "N/A"}
            </span>
          </div>
        </div>

        <div className="profile-field">
          <FiShield size={18} className="profile-field-icon" />
          <div className="profile-field-content">
            <label className="profile-field-label">Role</label>
            <span className="profile-field-value">
              {userData?.role || "N/A"}
            </span>
          </div>
        </div>

        <div className="profile-field">
          <FiHome size={18} className="profile-field-icon" />
          <div className="profile-field-content">
            <label className="profile-field-label">Institute</label>
            <span className="profile-field-value">
              {userData?.institute_name || "N/A"}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="logout-button"
        >
          <FiLogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}
