import { LogOut } from "lucide-react";
import "./DashboardNavbar.css";

function DashboardNavbar({ 
  brandName, 
  username, 
  onLogout, 
  onBrandClick,
  userRole = "user" 
}) {
  const getInitials = (name) => {
    if (!name) return userRole === "teacher" ? "T" : "S";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="dashboard-navbar">
      <div 
        className="navbar-brand" 
        onClick={onBrandClick}
        style={{ cursor: onBrandClick ? 'pointer' : 'default' }}
      >
        <h2>{brandName}</h2>
      </div>

      <div className="navbar-actions">
        <div className="user-profile">
          <span>{username || (userRole === "teacher" ? "Teacher" : "Student")}</span>
          <div className="user-avatar">
            {getInitials(username)}
          </div>
        </div>
        <button onClick={onLogout} className="logout-btn">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}

export default DashboardNavbar;