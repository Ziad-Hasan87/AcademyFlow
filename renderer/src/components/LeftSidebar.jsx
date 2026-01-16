export default function LeftSidebar({ width, onCreateClick }) {
  return (
    <div className="sidebar-left" style={{ width: `${width}px` }}>
      <button
        className="create-button"
        onClick={onCreateClick}
        aria-label="Create Routine"
      >
        +
      </button>
    </div>
  );
}
