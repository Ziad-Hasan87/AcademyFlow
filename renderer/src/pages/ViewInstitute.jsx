import { useEffect, useMemo, useRef, useState } from "react";
import { FiCamera, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import supabase from "../utils/supabase";
import { hasPermission } from "../utils/types";
import {
  fetchDepartments,
  fetchInstituteDetails,
  fetchOperationsByInstitute,
  fetchPrograms,
  fetchSlots,
} from "../utils/fetch";
import Modal from "../components/Modal";

const withCloudinaryMaxWidth = (imageUrl, width) => {
  if (!imageUrl) return imageUrl;

  const marker = "/image/upload/";
  const [baseUrl, query = ""] = String(imageUrl).split("?");

  if (!baseUrl.includes(marker)) return imageUrl;

  const transformedUrl = baseUrl.replace(marker, `${marker}c_limit,w_${width}/`);
  return query ? `${transformedUrl}?${query}` : transformedUrl;
};

const WINDOW_TABS = [
  { id: "programs", label: "Programs" },
  { id: "operations", label: "Operations" },
  { id: "departments", label: "Departments" },
  { id: "slotinfo", label: "SlotInfo" },
];

function formatRoleLabel(value) {
  if (!value) return "N/A";
  return String(value);
}

export default function ViewInstitute() {
  const { userData } = useAuth();
  const instituteId = userData?.institute_id;
  const canEditInstituteImage = hasPermission(userData?.role, "Admin");
  const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const [activeTab, setActiveTab] = useState("programs");
  const [instituteInfo, setInstituteInfo] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const [programs, setPrograms] = useState([]);
  const [operations, setOperations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [slots, setSlots] = useState([]);

  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const hasInstituteImage = Boolean(instituteInfo?.image_path);
  const isImageActionBusy = isUploadingImage || isDeletingImage;
  const fullSizeInstituteImageUrl = instituteInfo?.image_path || "";
  const instituteImageUrl600 = withCloudinaryMaxWidth(fullSizeInstituteImageUrl, 600);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadInstituteInfo = async () => {
      if (!instituteId) {
        setInstituteInfo(null);
        return;
      }

      const info = await fetchInstituteDetails(instituteId);
      setInstituteInfo(info || null);
    };

    loadInstituteInfo();
  }, [instituteId, refreshKey]);

  useEffect(() => {
    if (!instituteId) {
      setPrograms([]);
      return;
    }

    fetchPrograms(instituteId, "", setPrograms, setLoadingPrograms);
  }, [instituteId]);

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
    formData.append("folder", "academyflow/institutes");

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
    if (!canEditInstituteImage) return;
    if (!instituteId || isImageActionBusy) return;
    fileInputRef.current?.click();
  };

  const handleDeleteImage = async () => {
    if (!canEditInstituteImage) return;
    if (!instituteId || !hasInstituteImage || isImageActionBusy) return;

    const isConfirmed = window.confirm("Delete institute image?");
    if (!isConfirmed) return;

    try {
      setIsDeletingImage(true);

      const { error } = await supabase
        .from("institutes")
        .update({ image_path: null })
        .eq("id", instituteId);

      if (error) {
        throw new Error(error.message || "Failed to delete institute image.");
      }

      setInstituteInfo((prev) => ({
        ...(prev || {}),
        image_path: null,
      }));
      setIsImageModalOpen(false);
    } catch (error) {
      console.error("Error deleting institute image:", error);
      alert(error?.message || "Image delete failed.");
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleImageFileChange = async (event) => {
    if (!canEditInstituteImage) {
      event.target.value = "";
      return;
    }

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
          currentImageUrl: instituteInfo?.image_path || null,
        });
      } else {
        uploadResult = await uploadImageFromWeb(selectedFile);
      }

      if (!uploadResult?.ok || !uploadResult?.secureUrl) {
        throw new Error(uploadResult?.error || "Cloudinary upload failed.");
      }

      const { error: updateError } = await supabase
        .from("institutes")
        .update({ image_path: uploadResult.secureUrl })
        .eq("id", instituteId);

      if (updateError) {
        throw new Error(updateError.message || "Failed to save institute image.");
      }

      setInstituteInfo((prev) => ({
        ...(prev || {}),
        image_path: uploadResult.secureUrl,
      }));
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error uploading institute image:", error);
      alert(error?.message || "Image upload failed.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    if (!instituteId) {
      setOperations([]);
      return;
    }

    fetchOperationsByInstitute(instituteId, setOperations, setLoadingOperations);
  }, [instituteId]);

  useEffect(() => {
    if (!instituteId) {
      setDepartments([]);
      return;
    }

    fetchDepartments(instituteId, "", setDepartments, setLoadingDepartments);
  }, [instituteId]);

  useEffect(() => {
    if (!instituteId) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    fetchSlots(instituteId, (next) => {
      setSlots(next || []);
      setLoadingSlots(false);
    });
  }, [instituteId]);

  const activeWindowConfig = useMemo(() => {
    if (activeTab === "programs") {
      return {
        title: "Programs",
        loading: loadingPrograms,
        empty: "No programs found.",
        data: programs,
        renderItem: (item) => (
          <>
            <strong>{item?.name || "Unnamed Program"}</strong>
            <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
              Department: {item?.departments?.name || "N/A"}
            </span>
            <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
              Active: {item?.is_active ? "Yes" : "No"}
            </span>
          </>
        ),
      };
    }

    if (activeTab === "operations") {
      return {
        title: "Operations",
        loading: loadingOperations,
        empty: "No operations found.",
        data: operations,
        renderItem: (item) => (
          <>
            <strong>{item?.name || "Unnamed Operation"}</strong>
            <span style={{ color: "#475569", fontSize: "0.82rem" }}>
              Program: {item?.program?.name || "N/A"}
            </span>
            <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
              Status: {formatRoleLabel(item?.status)}
            </span>
          </>
        ),
      };
    }

    if (activeTab === "departments") {
      return {
        title: "Departments",
        loading: loadingDepartments,
        empty: "No departments found.",
        data: departments,
        renderItem: (item) => (
          <>
            <strong>{item?.name || "Unnamed Department"}</strong>
            <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
              Code: {item?.code || "N/A"}
            </span>
          </>
        ),
      };
    }

    return {
      title: "SlotInfo",
      loading: loadingSlots,
      empty: "No slots found.",
      data: slots,
      renderItem: (item) => (
        <>
          <strong>{item?.name || "Unnamed Slot"}</strong>
          <span style={{ color: "#475569", fontSize: "0.82rem" }}>
            {item?.start || "?"} - {item?.end || "?"}
          </span>
          <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
            Serial: {item?.serial_no ?? "N/A"}
          </span>
        </>
      ),
    };
  }, [
    activeTab,
    loadingDepartments,
    loadingOperations,
    loadingPrograms,
    loadingSlots,
    departments,
    operations,
    programs,
    slots,
  ]);

  return (
    <div className="profile-page-layout">
      <section className="profile-left-panel">
        <div className="profile-image-block profile-image-frame">
          {instituteInfo?.image_path ? (
            <button
              type="button"
              className="profile-image-clickable"
              onClick={() => setIsImageModalOpen(true)}
              aria-label="View institute image"
            >
              <img
                src={instituteImageUrl600}
                alt={instituteInfo?.name || "Institute"}
                className="profile-image-full"
              />
            </button>
          ) : (
            <div className="profile-image-fallback">
              {String(instituteInfo?.name || "?").trim().charAt(0).toUpperCase() || "?"}
            </div>
          )}

          {canEditInstituteImage && (
            <div className="profile-image-actions">
              {hasInstituteImage && (
                <button
                  type="button"
                  className="profile-image-delete-button"
                  onClick={handleDeleteImage}
                  disabled={isImageActionBusy}
                  aria-label="Delete institute image"
                  title="Delete institute image"
                >
                  <FiTrash2 size={14} />
                </button>
              )}

              <button
                type="button"
                className="profile-image-upload-button"
                onClick={handleUploadClick}
                disabled={isImageActionBusy}
                aria-label={hasInstituteImage ? "Update institute image" : "Upload institute image"}
                title={hasInstituteImage ? "Update institute image" : "Upload institute image"}
              >
                <FiCamera size={14} />
              </button>
            </div>
          )}

          <input
            ref={(node) => {
              fileInputRef.current = node;
            }}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageFileChange}
          />

          {isImageActionBusy && (
            <div className="profile-image-uploading">
              {isUploadingImage ? "Uploading..." : "Deleting..."}
            </div>
          )}
        </div>

        <div className="profile-container">
          <h3 style={{ margin: "0 0 10px", color: "#0f172a" }}>Institute Info</h3>

          {!instituteInfo && (
            <p className="profile-status">No institute information found.</p>
          )}

          {instituteInfo && (
            <>
              <div className="profile-field">
                <div className="profile-field-content">
                  <label className="profile-field-label">Institute Name</label>
                  <span className="profile-field-value">{instituteInfo?.name || "N/A"}</span>
                </div>
              </div>
              <div className="profile-field">
                <div className="profile-field-content">
                  <label className="profile-field-label">Code</label>
                  <span className="profile-field-value">{instituteInfo?.code || "N/A"}</span>
                </div>
              </div>
              <div className="profile-field">
                <div className="profile-field-content">
                  <label className="profile-field-label">Timezone</label>
                  <span className="profile-field-value">{instituteInfo?.timezone || "UTC"}</span>
                </div>
              </div>
              <div className="profile-field">
                <div className="profile-field-content">
                  <label className="profile-field-label">Active</label>
                  <span className="profile-field-value">{instituteInfo?.is_active ? "Yes" : "No"}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="profile-right-panel">
        <div className="profile-tabs-bar" role="tablist" aria-label="Institute tabs">
          {WINDOW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`profile-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="profile-tab-panel">
          <div style={{ marginBottom: "10px", fontWeight: 700, color: "#0f172a" }}>
            {activeWindowConfig.title}
          </div>

          {activeWindowConfig.loading && (
            <div className="profile-courses-placeholder">Loading {activeWindowConfig.title.toLowerCase()}...</div>
          )}

          {!activeWindowConfig.loading && activeWindowConfig.data.length === 0 && (
            <div className="profile-courses-placeholder">{activeWindowConfig.empty}</div>
          )}

          {!activeWindowConfig.loading && activeWindowConfig.data.length > 0 && (
            <div style={{ display: "grid", gap: "8px" }}>
              {activeWindowConfig.data.map((item) => (
                <article
                  key={item.id}
                  style={{
                    border: "1px solid #d9e2ec",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    background: "#f8fbff",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {activeWindowConfig.renderItem(item)}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title="Institute Image"
        contentClassName="profile-image-preview-modal"
        bodyClassName="profile-image-preview-body"
      >
        {instituteInfo?.image_path && (
          <img
            src={fullSizeInstituteImageUrl}
            alt={instituteInfo?.name || "Institute"}
            className="profile-image-preview-full"
          />
        )}
      </Modal>
    </div>
  );
}
