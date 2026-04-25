const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", variant = "danger" }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-icon-ring ${variant}`}>
          {variant === "danger" ? "⚠️" : variant === "success" ? "✅" : "❓"}
        </div>
        <h3 className="confirm-title">{title}</h3>
        {message && <p className="confirm-message">{message}</p>}
        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onCancel}>{cancelText}</button>
          <button className={`confirm-ok-btn ${variant}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;