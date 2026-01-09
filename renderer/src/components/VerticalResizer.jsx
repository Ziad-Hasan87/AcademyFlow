export default function VerticalResizer({onDrag}){
    let startX = 0;

    const onMouseDown = e => {
        e.preventDefault();
        startX = e.clientX;

        const onMouseMove = e => {
        const deltaX = e.clientX - startX;
        startX = e.clientX;
        onDrag(deltaX);
        };

        const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    };
    return <div className="resizer vertical" onMouseDown={onMouseDown}/>;
}