export default function HorizontalResizer({ onDrag }) {
  let startY = 0;

  const onMouseDown = (e) => {
    e.preventDefault();
    startY = e.clientY;

    const onMouseMove = (e) => {
      const dy = e.clientY - startY;
      startY = e.clientY; // update startY
      onDrag(dy);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return <div className="resizer horizontal" onMouseDown={onMouseDown} />;
}
