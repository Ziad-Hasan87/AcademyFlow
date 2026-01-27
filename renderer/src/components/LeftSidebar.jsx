import UsersPage from "../pages/UsersPage";
import ModeratorsPage from "../pages/ModeratorsPage";
import OperationsPage from "../pages/OperationsPage";
import ProgramsPage from "../pages/ProgramsPage";
import CoursesPage from "../pages/CoursesPage";
import GroupsPage from "../pages/GroupsPage";
import SubgroupsPage from "../pages/SubgroupsPage";
import VacationsPage from "../pages/VacationsPage";
import DepartmentsPage from "../pages/DepartmentsPage";
import ProfilePage from "../pages/ProfilePage";

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
      case "groups":
        return <GroupsPage />;
      case "subgroups":
        return <SubgroupsPage />;
      case "vacations":
        return <VacationsPage />;
      case "departments":
        return <DepartmentsPage />;
      case "profile":
        return <ProfilePage />;
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
