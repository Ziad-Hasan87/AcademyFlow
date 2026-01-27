import { useState } from "react";
import "../App.css";

import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import BottomSidebar from "../components/BottomSideBar";
import HorizontalResizer from "../components/HorizontalResizer";
import VerticalResizer from "../components/VerticalResizer";
import MainContent from "../components/MainContent";
import CreateRoutineModal from "../components/CreateRoutine"; // ✅ import modal
import IconSidebar from "../components/IconSidebar"; // ✅ import icon sidebar
import Toast from "../components/Toast";

export default function AppLayout() {
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(300);
  const [bottomHeight, setBottomHeight] = useState(200);

  const [showCreateRoutine, setShowCreateRoutine] = useState(false); 
  const [showCreateUser, setShowCreateUser] = useState(false); // ✅ modal state
  const [activePage, setActivePage] = useState(null); // active page state

  return (
    <>
      {/* MAIN APP */}
      <div className="main-app">
        <IconSidebar onIconClick={setActivePage} activePage={activePage} />
        
        <LeftSidebar
          width={leftWidth}
          onCreateClick={() => setShowCreateRoutine(true)}
          activePage={activePage}
        />

        <VerticalResizer
          onDrag={(dx) =>
            setLeftWidth((w) => Math.min(550, Math.max(240, w + dx)))
          }
        />

        <div className="middle-group">
          <MainContent />

          <HorizontalResizer
            onDrag={(dy) =>
              setBottomHeight((h) =>
                Math.min(500, Math.max(200, h - dy))
              )
            }
          />

          <BottomSidebar height={bottomHeight} />
        </div>

        <VerticalResizer
          onDrag={(dx) =>
            setRightWidth((w) =>
              Math.min(550, Math.max(240, w - dx))
            )
          }
        />

        <RightSidebar width={rightWidth} />
      </div>

      {/* MODAL OVERLAY */}
      
      {/* Toast Notifications */}
      <Toast />
    </>
  );
}
