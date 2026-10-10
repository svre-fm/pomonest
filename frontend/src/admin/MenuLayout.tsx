import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDoorOpen, faGear, faLayerGroup, faUsersGear, faDatabase } from '@fortawesome/free-solid-svg-icons';
import '../home.css';
import '../css/admin.css';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<{ email: string; username: string; avatar?: string } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      try {
        const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setUser(result.data);
      } catch (error) {
        console.error('Fetch user error:', error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="admin-page">
      <div className="sidebar" style={{ marginBottom: '20px' }}>
        <div className="logo-section">
          <img src="/images/logo.png" alt="Pomonest Logo" className="sidebar-logo" />
        </div>

        <div className="nav-menu">
          <div className={`nav-item ${isActive('/overview') ? 'active' : ''}`} onClick={() => navigate('/overview')}>
            <FontAwesomeIcon icon={faLayerGroup} /> Overview
          </div>
          <div className={`nav-item ${isActive('/usermanage') ? 'active' : ''}`} onClick={() => navigate('/usermanage')}>
            <FontAwesomeIcon icon={faUsersGear} /> User Management
          </div>
          <div className={`nav-item ${isActive('/data_management') ? 'active' : ''}`} onClick={() => navigate('/data_management')}>
            <FontAwesomeIcon icon={faDatabase} /> Data Management
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-trigger" onClick={() => setIsProfileOpen(!isProfileOpen)}>
            <img src={user?.avatar || '/images/profile1.png'} alt={user?.username || 'Profile'} className="profile-image" />
          </div>
          {isProfileOpen && (
            <div className="profile-dropdown">
              <div className="profile-name">
                <img src={user?.avatar || '/images/profile1.png'} alt="" className="profile-image" />
                <div className="groupname">
                  <span className="name">{user?.username || 'user1'}</span>
                  <span className="email">{user?.email || 'email not found'}</span>
                </div>
              </div>
              <button className="button-logout" onClick={handleLogout}>
                <FontAwesomeIcon icon={faGear} style={{ color: '#806a5aff' }} /><span>account</span>
              </button>
              <button className="button-logout" onClick={handleLogout}>
                <FontAwesomeIcon icon={faDoorOpen} style={{ color: '#806a5aff' }} /><span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="admin-layout-content">
        <Outlet />
      </div>
    </div>
  );
}