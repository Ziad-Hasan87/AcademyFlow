import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiLogOut } from "react-icons/fi";
import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import ProfileRoutine from "../components/ProfileRoutine";

function getWeekRange(baseDate = new Date()) {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);

  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

export default function ProfilePage({ userId }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");
  const [dateRange, setDateRange] = useState(getWeekRange());
  const [courses, setCourses] = useState([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setProfileData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase.rpc("get_user_profile", {
        p_user_id: userId,
      });

      if (error) {
        console.error("Error fetching user profile:", error);
        setProfileData(null);
      } else {
        const profile = Array.isArray(data) ? data[0] : data;
        setProfileData(profile || null);
      }

      setIsLoading(false);
    };

    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    const fetchUserCourses = async () => {
      if (activeTab !== "courses") return;
      if (!userId) {
        setCourses([]);
        return;
      }

      setIsCoursesLoading(true);
      const { data, error } = await supabase.rpc("get_user_courses", {
        p_user_id: userId,
      });

      if (error) {
        console.error("Error fetching user courses:", error);
        setCourses([]);
        setIsCoursesLoading(false);
        return;
      }

      const sortedCourses = (Array.isArray(data) ? data : [])
        .slice()
        .sort((a, b) =>
          (a?.course_name || "").localeCompare(b?.course_name || "", undefined, {
            sensitivity: "base",
          })
        );

      setCourses(sortedCourses);
      setIsCoursesLoading(false);
    };

    fetchUserCourses();
  }, [activeTab, userId]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Please try again.");
    }
  };

  const hasValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  };

  const userNameWithCodename = hasValue(profileData?.name)
    ? `${profileData.name}${hasValue(profileData?.codename) ? ` (${profileData.codename})` : ""}`
    : null;

  const profileFields = [
    { label: "User name", value: userNameWithCodename },
    { label: "Role", value: profileData?.role },
    { label: "Department", value: profileData?.department_name },
    { label: "Program", value: profileData?.program_name },
    { label: "Group", value: profileData?.group_name },
    { label: "Subgroup", value: profileData?.subgroup_name },
  ].filter((field) => hasValue(field.value));

  const avatarLabel = profileData?.name?.trim()?.charAt(0)?.toUpperCase() || "?";

  const shiftWeek = (direction) => {
    setDateRange((prev) => {
      const start = new Date(prev.start);
      const end = new Date(prev.end);
      start.setDate(start.getDate() + direction * 7);
      end.setDate(end.getDate() + direction * 7);
      return { start, end };
    });
  };

  const formatDateLabel = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="profile-page-layout">
      <section className="profile-left-panel">
        <div className="profile-image-block">
          {profileData?.image_path ? (
            <img
              src={profileData.image_path}
              alt={profileData?.name || "Profile"}
              className="profile-image-full"
            />
          ) : (
            <div className="profile-image-fallback">{avatarLabel}</div>
          )}
        </div>

        <div className="profile-container">
          {isLoading && <p className="profile-status">Loading profile...</p>}

          {!isLoading && profileFields.length === 0 && (
            <p className="profile-status">No profile information found.</p>
          )}

          {!isLoading &&
            profileFields.map((field) => (
              <div className="profile-field" key={field.label}>
                <div className="profile-field-content">
                  <label className="profile-field-label">{field.label}</label>
                  <span className="profile-field-value">{field.value}</span>
                </div>
              </div>
            ))}

          <button onClick={handleLogout} className="logout-button">
            <FiLogOut size={20} />
            Logout
          </button>
        </div>
      </section>

      <section className="profile-right-panel">
        <div className="profile-tabs-bar" role="tablist" aria-label="Profile tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "schedule"}
            className={`profile-tab ${activeTab === "schedule" ? "active" : ""}`}
            onClick={() => setActiveTab("schedule")}
          >
            Schedule
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "courses"}
            className={`profile-tab ${activeTab === "courses" ? "active" : ""}`}
            onClick={() => setActiveTab("courses")}
          >
            Courses
          </button>
        </div>

        {activeTab === "schedule" && (
          <div className="profile-tab-panel">
            <div className="profile-week-nav">
              <button
                type="button"
                className="profile-week-arrow"
                onClick={() => shiftWeek(-1)}
                aria-label="Previous week"
              >
                {"<"}
              </button>
              <div className="profile-week-label">
                {formatDateLabel(dateRange.start)} - {formatDateLabel(dateRange.end)}
              </div>
              <button
                type="button"
                className="profile-week-arrow"
                onClick={() => shiftWeek(1)}
                aria-label="Next week"
              >
                {">"}
              </button>
            </div>

            <div className="profile-routine-wrap">
              <ProfileRoutine
                userId={userId}
                startDate={dateRange.start}
                endDate={dateRange.end}
              />
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <div className="profile-tab-panel">
            {isCoursesLoading && (
              <div className="profile-courses-placeholder">Loading courses...</div>
            )}

            {!isCoursesLoading && courses.length === 0 && (
              <div className="profile-courses-placeholder">No courses found.</div>
            )}

            {!isCoursesLoading && courses.length > 0 && (
              <ol className="profile-courses-list">
                {courses.map((course) => (
                  <li key={course.course_id} className="profile-courses-item">
                    <span className="profile-course-name">{course.course_name}</span>
                    {hasValue(course.course_description) && (
                      <span className="profile-course-description"> - {course.course_description}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
