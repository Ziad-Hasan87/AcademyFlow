import React from "react";
import { useState } from "react";
import "./App.css";

import LeftSidebar from "./components/leftsidebar";
import RightSidebar from "./components/rightsidebar";
import BottomSidebar from "./components/BottomSideBar";
import HorizontalResizer from "./components/HorizontalResizer";
import VerticalResizer from "./components/VerticalResizer";
import MainContent from "./components/MainContent";

export default function App() {
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(300);
  const [bottomHeight, setBottomHeight] = useState(200);

  return (
    <div className="app">
      <div className="left-group">
        <div className="top">
          <LeftSidebar width={leftWidth} />
          <VerticalResizer onDrag={dx => setLeftWidth(w => Math.min(550, Math.max(240, w + dx)))} />

          <MainContent />
        </div>
          <HorizontalResizer onDrag={dy => setBottomHeight(h => Math.min(500,Math.max(200, h - dy)))} />
          <BottomSidebar height={bottomHeight} />
        </div>
        <div className="right-wrapper">
            <VerticalResizer onDrag={dx => setRightWidth(w => Math.min(550, Math.max(240, w - dx)))} />
            <RightSidebar width={rightWidth} />
          </div>
      </div>
  );
}