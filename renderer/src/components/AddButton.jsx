export default function AddButton({ onClick, ariaLabel = "Create Item" }) {
  return (
    <button
      className="create-button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      +
    </button>
  );
}
