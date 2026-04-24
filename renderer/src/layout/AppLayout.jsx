import { useState } from "react";
import "../App.css";

import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import BottomSidebar from "../components/BottomSidebar";
import HorizontalResizer from "../components/HorizontalResizer";
import VerticalResizer from "../components/VerticalResizer";
import MainContent from "../components/MainContent";
import CreateRoutineModal from "../components/CreateRoutine"; // ✅ import modal
import IconSidebar from "../components/IconSidebar"; // ✅ import icon sidebar
import Modal from "../components/Modal";
import ProfilePage from "../pages/ProfilePage";
import MaterialsPage from "../pages/MaterialsPage";
import ViewInstitute from "../pages/ViewInstitute";
import UserSearch from "../components/UserSearch";
import Toast from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";

import Chatbot from "../components/Chatbot";

function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
}

export default function AppLayout() {
  const { userData } = useAuth();
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(300);
  const [bottomHeight, setBottomHeight] = useState(200);

  const [showCreateRoutine, setShowCreateRoutine] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false); // ✅ modal state
  const [activePage, setActivePage] = useState(null); // active page state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const [isInstituteOpen, setIsInstituteOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getTodayDateString());

  const [startOfWeek, setStartOfWeek] = useState(null);
  const [endOfWeek, setEndOfWeek] = useState(null);

  const [events, setEvents] = useState([]);
  const [slectedOperation, setSelectedOperation] = useState(null);
  const [eventsRefreshTick, setEventsRefreshTick] = useState(0);

  const setWeekRange = (start, end) => {
    setStartOfWeek(start);
    setEndOfWeek(end);
  };

  const handleIconClick = (pageId) => {
    if (pageId === "profile") {
      setSelectedProfileUserId(userData?.id || null);
      setIsProfileOpen(true);
      return;
    }

    if (pageId === "search") {
      setIsSearchOpen(true);
      return;
    }

    if (pageId === "materials") {
      setIsMaterialsOpen(true);
      return;
    }

    if (pageId === "viewinstitute") {
      setIsInstituteOpen(true);
      return;
    }

    setActivePage(pageId);
  };

  const handleUserSelectFromSearch = (userId) => {
    if (!userId) return;

    setSelectedProfileUserId(userId);
    setIsSearchOpen(false);
    setIsProfileOpen(true);
  };

  return (
    <>
      {/* MAIN APP */}
      <div className="main-app">
        <IconSidebar
          onIconClick={handleIconClick}
          activePage={
            isProfileOpen
              ? "profile"
              : isSearchOpen
                ? "search"
                : isMaterialsOpen
                  ? "materials"
                  : isInstituteOpen
                    ? "viewinstitute"
                  : activePage
          }
        />

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
          <MainContent
            events={events}
            startOfWeek={startOfWeek}
            endOfWeek={endOfWeek}
            onRefreshEvents={() => setEventsRefreshTick((tick) => tick + 1)}
          />

          <HorizontalResizer
            onDrag={(dy) =>
              setBottomHeight((h) =>
                Math.min(500, Math.max(200, h - dy))
              )
            }
          />

          <BottomSidebar
            height={bottomHeight}
            startDate={startOfWeek}
            endDate={endOfWeek}
            onEventsFetched={setEvents}
            onSelectedOperation={setSelectedOperation}
            refreshTrigger={eventsRefreshTick}
          />
        </div>

        <VerticalResizer
          onDrag={(dx) =>
            setRightWidth((w) =>
              Math.min(550, Math.max(240, w - dx))
            )
          }
        />

        <RightSidebar
          width={rightWidth}
          setWeekRange={setWeekRange}
          selectedDate={selectedCalendarDate}
          onSelectedDateChange={setSelectedCalendarDate}
        />
      </div>

      {/* MODAL OVERLAY */}
      <Modal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title="Profile"
        contentClassName="profile-modal-content"
        bodyClassName="profile-modal-body"
      >
        <ProfilePage userId={selectedProfileUserId || userData?.id} />
      </Modal>

      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="User Search"
        contentClassName="profile-modal-content"
        bodyClassName="profile-modal-body"
      >
        <UserSearch onUserSelect={handleUserSelectFromSearch} />
      </Modal>

      <Modal
        isOpen={isMaterialsOpen}
        onClose={() => setIsMaterialsOpen(false)}
        title="Materials"
        contentClassName="materials-modal-content"
        bodyClassName="materials-modal-body"
      >
        <MaterialsPage />
      </Modal>

      <Modal
        isOpen={isInstituteOpen}
        onClose={() => setIsInstituteOpen(false)}
        title="Institute"
        contentClassName="profile-modal-content"
        bodyClassName="profile-modal-body"
      >
        <ViewInstitute />
      </Modal>

      {/* Toast Notifications */}
      <Toast />

      {/* AI Chatbot */}
      <Chatbot />
    </>
  );
}
