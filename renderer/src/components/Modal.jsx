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

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation prevents the modal from closing when clicking inside the content */}
      <div className={modalContentClassName} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className={modalBodyClassName}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;