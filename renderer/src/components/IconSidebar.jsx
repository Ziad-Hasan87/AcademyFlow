import React from "react";
import { FiUsers, FiShield, FiActivity, FiBook, FiBookOpen, FiSun, FiLogOut  } from "react-icons/fi";
import { GoOrganization } from "react-icons/go";
import { FaRegCalendarTimes, FaCog, FaLayerGroup,FaRegUser   } from "react-icons/fa";
import { FaPeopleRoof } from "react-icons/fa6";
import { MdOutlineGroupWork } from "react-icons/md";
import { GrGroup } from "react-icons/gr";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import supabase from "../utils/supabase";
import { hasPermission } from "../utils/types";

export default function IconSidebar({ onIconClick, activePage }) {
  const navigate = useNavigate();
  const { userData, logout } = useAuth();

  const topIcons = [
    { id: "users", icon: FaRegUser, name: "Users", minRole: "Admin" },
    { id: "moderators", icon: FiShield, name: "Moderators", minRole: "Moderator" },
    { id: "operations", icon: FaCog, name: "Operations" , minRole: "Moderator" },
    { id: "programs", icon: FiBook, name: "Programs", minRole: "Admin" },
    { id: "courses", icon: FiBookOpen, name: "Courses" , minRole: "Moderator"},
    { id: "groups", icon: GrGroup, name: "Groups", minRole: "Moderator" },
    { id: "subgroups", icon: FaPeopleRoof , name: "Subgroups", minRole: "Moderator" },
    { id: "vacations", icon: FaRegCalendarTimes, name: "Vacations", minRole: "Moderator" },
    { id: "departments", icon: GoOrganization, name: "Departments", minRole: "Admin" },
  ];
  
  const userRole = userData?.role;
  
  const visibleIcons = topIcons.filter(item =>{
    const access = hasPermission(userRole, item.minRole);
    return access;
  }
    
  );
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
    <div
      className="icon-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
      }}
    >
      {/* Top icons */}
      <div className="icon-sidebar-top">
        {visibleIcons.map((item) => {
          const IconComponent = item.icon;
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              className={`icon-item ${isActive ? "active" : ""}`}
              onClick={() => onIconClick(item.id)}
              data-tooltip={item.name}
            >
              <IconComponent color={isActive ? "blue" : "white"} size={20} />
            </div>
          );
        })}
      </div>

      {/* Logout button at bottom */}
      <div
        className="icon-sidebar-bottom"
        style={{ padding: "10px", cursor: "pointer" }}
        onClick={handleLogout}
        title="Logout"
      >
        <FiLogOut color="white" size={20} />
      </div>
    </div>
  );
}
