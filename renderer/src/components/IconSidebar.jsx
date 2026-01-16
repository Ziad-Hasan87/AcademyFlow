import React, { useState } from "react";
import { FiUsers, FiShield, FiActivity, FiBook, FiBookOpen, FiSun } from "react-icons/fi";

export default function IconSidebar({ onIconClick, activePage }) {
  const topIcons = [
    { id: "users", icon: <FiUsers />, name: "Users" },
    { id: "moderators", icon: <FiShield />, name: "Moderators" },
    { id: "operations", icon: <FiActivity />, name: "Operations" },
    { id: "programs", icon: <FiBook />, name: "Programs" },
    { id: "courses", icon: <FiBookOpen />, name: "Courses" },
    { id: "vacations", icon: <FiSun />, name: "Vacations" },
  ];

  return (
    <div className="icon-sidebar">
      <div className="icon-sidebar-top">
        {topIcons.map((item) => (
          <div
            key={item.id}
            className={`icon-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => onIconClick(item.id)}
            data-tooltip={item.name}
          >
            <span className="icon">{item.icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
