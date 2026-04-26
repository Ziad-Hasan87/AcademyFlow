import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiCamera, FiLogOut, FiTrash2 } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";
import supabase from "../utils/supabase";
import ProfileRoutine from "../components/ProfileRoutine";
import Modal from "../components/Modal";
import MesageConversation from "../components/MesageConversation";

const withCloudinaryMaxWidth = (imageUrl, width) => {
  if (!imageUrl) return imageUrl;

  const marker = "/image/upload/";
  const [baseUrl, query = ""] = String(imageUrl).split("?");

  if (!baseUrl.includes(marker)) return imageUrl;

  const transformedUrl = baseUrl.replace(marker, `${marker}c_limit,w_${width}/`);
  return query ? `${transformedUrl}?${query}` : transformedUrl;
};

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
  const { logout, userData } = useAuth();
  const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const [profileData, setProfileData] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");
  const [dateRange, setDateRange] = useState(getWeekRange());
  const [courses, setCourses] = useState([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const fileInputRef = useRef(null);

  const canUploadProfileImage =
    userData?.id !== undefined &&
    userId !== undefined &&
    String(userData.id) === String(userId);
  const isOwnProfile = canUploadProfileImage;
  const hasProfileImage = Boolean(profileData?.image_path);
  const isImageActionBusy = isUploadingImage || isDeletingImage;
  const fullSizeProfileImageUrl = profileData?.image_path || "";
  const profileImageUrl600 = withCloudinaryMaxWidth(fullSizeProfileImageUrl, 600);

  const toSingleProfile = (payload) => (Array.isArray(payload) ? payload[0] : payload) || null;

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
        setProfileData(toSingleProfile(data));
      }

      setIsLoading(false);
    };

    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (!userData?.id) {
        setCurrentUserProfile(null);
        return;
      }

      const { data, error } = await supabase.rpc("get_user_profile", {
        p_user_id: userData.id,
      });

      if (error) {
        console.error("Error fetching current user profile:", error);
        setCurrentUserProfile(null);
        return;
      }

      setCurrentUserProfile(toSingleProfile(data));
    };

    fetchCurrentUserProfile();
  }, [userData?.id]);

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

  const handleOpenMessage = () => {
    setActiveConversationId(null);
    setIsConversationModalOpen(true);
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
  const currentUserRole = currentUserProfile?.role || userData?.role || "";
  const viewedUserRole = profileData?.role || "";
  const shouldHideActionButton = !isOwnProfile && currentUserRole === "Student" && viewedUserRole === "Student";
  const shouldShowMessageButton = !isOwnProfile && !shouldHideActionButton;

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

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || "");
        const base64Data = raw.includes(",") ? raw.split(",")[1] : raw;
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error("Failed to read selected file."));
      reader.readAsDataURL(file);
    });

  const uploadImageFromWeb = async (file) => {
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      throw new Error(
        "Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET in renderer/.env"
      );
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", cloudinaryUploadPreset);
    formData.append("folder", "academyflow/profiles");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result?.secure_url) {
      throw new Error(result?.error?.message || `Cloudinary upload failed (${response.status}).`);
    }

    return {
      ok: true,
      secureUrl: result.secure_url,
    };
  };

  const handleUploadClick = () => {
    if (!canUploadProfileImage || isImageActionBusy) return;
    fileInputRef.current?.click();
  };

  const handleDeleteImage = async () => {
    if (!canUploadProfileImage || !hasProfileImage || isImageActionBusy) return;

    const isConfirmed = window.confirm("Delete profile picture?");
    if (!isConfirmed) return;

    try {
      setIsDeletingImage(true);

      const { error } = await supabase
        .from("users")
        .update({ image_path: null })
        .eq("id", userId);

      if (error) {
        throw new Error(error.message || "Failed to delete profile image.");
      }

      setProfileData((prev) => ({
        ...(prev || {}),
        image_path: null,
      }));
      setIsImageModalOpen(false);
    } catch (error) {
      console.error("Error deleting profile image:", error);
      alert(error?.message || "Image delete failed.");
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleImageFileChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    if (!selectedFile.type?.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    try {
      setIsUploadingImage(true);

      let uploadResult;
      if (window?.electronAPI?.uploadProfileImage) {
        const base64Data = await fileToBase64(selectedFile);
        uploadResult = await window.electronAPI.uploadProfileImage({
          base64Data,
          mimeType: selectedFile.type,
          fileName: selectedFile.name,
          currentImageUrl: profileData?.image_path || null,
        });
      } else {
        uploadResult = await uploadImageFromWeb(selectedFile);
      }

      if (!uploadResult?.ok || !uploadResult?.secureUrl) {
        throw new Error(uploadResult?.error || "Cloudinary upload failed.");
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ image_path: uploadResult.secureUrl })
        .eq("id", userId);

      if (updateError) {
        throw new Error(updateError.message || "Failed to save profile image.");
      }

      setProfileData((prev) => ({
        ...(prev || {}),
        image_path: uploadResult.secureUrl,
      }));
    } catch (error) {
      console.error("Error uploading profile image:", error);
      alert(error?.message || "Image upload failed.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <>
      <div className="profile-page-layout">
        <section className="profile-left-panel">
          <div className="profile-image-block profile-image-frame">
            {profileData?.image_path ? (
              <button
                type="button"
                className="profile-image-clickable"
                onClick={() => setIsImageModalOpen(true)}
                aria-label="View profile image"
              >
                <img
                  src={profileImageUrl600}
                  alt={profileData?.name || "Profile"}
                  className="profile-image-full"
                />
              </button>
            ) : (
              <div className="profile-image-fallback">{avatarLabel}</div>
            )}

            {canUploadProfileImage && (
              <>
                <div className="profile-image-actions">
                  {hasProfileImage && (
                    <button
                      type="button"
                      className="profile-image-delete-button"
                      onClick={handleDeleteImage}
                      disabled={isImageActionBusy}
                      aria-label="Delete profile picture"
                      title="Delete profile picture"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="profile-image-upload-button"
                    onClick={handleUploadClick}
                    disabled={isImageActionBusy}
                    aria-label={hasProfileImage ? "Update profile picture" : "Upload profile picture"}
                    title={hasProfileImage ? "Update profile picture" : "Upload profile picture"}
                  >
                    <FiCamera size={14} />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageFileChange}
                />
              </>
            )}

            {canUploadProfileImage && isImageActionBusy && (
              <div className="profile-image-uploading">
                {isUploadingImage ? "Uploading..." : "Deleting..."}
              </div>
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

            {isOwnProfile && (
              <button onClick={handleLogout} className="logout-button">
                <FiLogOut size={20} />
                Logout
              </button>
            )}

            {shouldShowMessageButton && (
              <button
                type="button"
                className="logout-button"
                onClick={handleOpenMessage}
                style={{
                  background: "linear-gradient(120deg, #1d4ed8 0%, #2563eb 45%, #0284c7 100%)",
                  color: "#eff6ff",
                  border: "1px solid rgba(147, 197, 253, 0.45)",
                }}
              >
                Message
              </button>
            )}
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

      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title="Profile Picture"
        contentClassName="profile-image-preview-modal"
        bodyClassName="profile-image-preview-body"
      >
        {profileData?.image_path && (
          <img
            src={fullSizeProfileImageUrl}
            alt={profileData?.name || "Profile"}
            className="profile-image-preview-full"
          />
        )}
      </Modal>

      <Modal
        isOpen={isConversationModalOpen && shouldShowMessageButton}
        onClose={() => setIsConversationModalOpen(false)}
        title="Conversation"
        contentClassName="profile-modal-content"
        bodyClassName="profile-modal-body"
      >
        <MesageConversation
          conversationId={activeConversationId}
          targetUserId={userId}
          onConversationReady={setActiveConversationId}
        />
      </Modal>
    </>
  );
}
