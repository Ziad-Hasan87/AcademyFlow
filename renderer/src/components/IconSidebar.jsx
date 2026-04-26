import React from "react";
import { FiShield, FiActivity, FiBook, FiBookOpen, FiSun, FiMessageCircle, FiSearch } from "react-icons/fi";
import { GoOrganization } from "react-icons/go";
import { FaRegCalendarTimes, FaCog, FaLayerGroup, FaRegIdCard, FaRobot } from "react-icons/fa";
import { FaPeopleRoof } from "react-icons/fa6";
import { BsPersonCircle } from "react-icons/bs";
import { MdOutlineGroupWork } from "react-icons/md";
import { GrGroup } from "react-icons/gr";
import { useAuth } from "../contexts/AuthContext";
import { hasPermission } from "../utils/types";

export default function IconSidebar({ onIconClick, activePage }) {
  const { userData } = useAuth();

  const topIcons = [
    { id: "users", icon: FaRegIdCard, name: "Users", minRole: "Admin" },
    { id: "moderators", icon: FiShield, name: "Moderators", minRole: "Moderator" },
    { id: "operations", icon: FaCog, name: "Operations" , minRole: "Admin" },
    { id: "programs", icon: FiBook, name: "Programs", minRole: "Admin" },
    { id: "courses", icon: FiBookOpen, name: "Courses" , minRole: "Moderator"},
    { id: "materials", icon: FaLayerGroup, name: "Materials", minRole: "Student" },
    { id: "groups", icon: GrGroup, name: "Groups", minRole: "Admin" },
    { id: "subgroups", icon: FaPeopleRoof , name: "Subgroups", minRole: "Admin" },
    { id: "vacations", icon: FaRegCalendarTimes, name: "Vacations", minRole: "Moderator" },
    { id: "departments", icon: GoOrganization, name: "Departments", minRole: "Admin" },
    { id: "botinfo", icon: FaRobot, name: "Bot Info", minRole: "Admin" },
    { id: "slotinfo", icon: MdOutlineGroupWork, name: "SlotInfo", minRole: "Admin" },
    { id: "routines", icon: FiActivity, name: "Routines", minRole: "Moderator" },
    { id: "viewinstitute", icon: FiSun, name: "Institute", minRole: "Student" },
    { id: "search", icon: FiSearch, name: "Search", minRole: "Student" },
    { id: "messages", icon: FiMessageCircle, name: "Messages", minRole: "Student" },
  ];
  
  const userRole = userData?.role;
  
  const visibleIcons = topIcons.filter(item =>{
    const access = hasPermission(userRole, item.minRole);
    return access;
  }
    
  );

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
              title={item.name}
            >
              <IconComponent color={isActive ? "#f59e0b" : "#f8fafc"} size={15} />
              <span className="icon-item-label">{item.name}</span>
            </div>
          );
        })}
      </div>

      {/* Profile button at bottom */}
      <div
        className="icon-sidebar-bottom"
        style={{ padding: "10px", cursor: "pointer" }}
        onClick={() => onIconClick("profile")}
        title="Profile"
      >
        <div className={`icon-item ${activePage === "profile" ? "active" : ""}`} style={{ width: "100%" }}>
          <BsPersonCircle color={activePage === "profile" ? "#f59e0b" : "#f8fafc"} size={15} />
          <span className="icon-item-label">Profile</span>
        </div>
      </div>
    </div>
  );
}
