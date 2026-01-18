import UsersPage from "../pages/UsersPage";
import ModeratorsPage from "../pages/ModeratorsPage";
import OperationsPage from "../pages/OperationsPage";
import ProgramsPage from "../pages/ProgramsPage";
import CoursesPage from "../pages/CoursesPage";
import VacationsPage from "../pages/VacationsPage";

export default function LeftSidebar({ width, onCreateClick, activePage }) {
  const renderPage = () => {
    switch (activePage) {
      case "users":
        return <UsersPage />;
      case "moderators":
        return <ModeratorsPage />;
      case "operations":
        return <OperationsPage />;
      case "programs":
        return <ProgramsPage />;
      case "courses":
        return <CoursesPage />;
      case "vacations":
        return <VacationsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="sidebar-left" style={{ width: `${width}px` }}>
      {renderPage()}
    </div>
  );
}
