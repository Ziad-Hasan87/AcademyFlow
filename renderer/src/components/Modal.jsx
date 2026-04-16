import React from 'react';
import ReactDOM from 'react-dom';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  contentClassName = "",
  bodyClassName = "",
}) => {
  if (!isOpen) return null;

  const modalContentClassName = ["modal-content", contentClassName].filter(Boolean).join(" ");
  const modalBodyClassName = ["modal-body", bodyClassName].filter(Boolean).join(" ");
  const isExplorerTheme = modalContentClassName.includes("explorer-theme-modal-content");

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation prevents the modal from closing when clicking inside the content */}
      <div className={modalContentClassName} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {!isExplorerTheme && <h2>{title}</h2>}
          <button className="close-btn" onClick={onClose} aria-label="Close modal">&times;</button>
        </div>
        <div className={modalBodyClassName}>
          {isExplorerTheme ? (
            <div className="explorer-theme-modal-shell">
              <div className="explorer-theme-inline-banner">
                <h3>{title || "Editor"}</h3>
                <p>Review the form below and save your changes.</p>
              </div>
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;