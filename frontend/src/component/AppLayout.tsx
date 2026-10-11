import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faClock } from '@fortawesome/free-regular-svg-icons';
import { faEgg, faDoorOpen, faChartPie } from '@fortawesome/free-solid-svg-icons';
import '../home.css';

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

    // ล้างข้อมูล Focus ที่ค้างอยู่ตอนกด Log out
    sessionStorage.removeItem('pomonest_focus_progress');
    sessionStorage.removeItem('pomonest_active_status');

    window.location.href = '/login';
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="home-page">
      <div className="sidebar">
        <div className="logo-section">
          <img src="/images/logo.png" alt="Pomonest Logo" className="sidebar-logo" />
        </div>

        <div className="nav-menu">
          
          {/* Home */}
          <div 
            className={`nav-item ${isActive('/home') ? 'active' : ''}`} 
            onClick={() => navigate('/home')}
          >
            <FontAwesomeIcon icon={faHouse} /> Home
          </div>
          
          {/* Focus */}
          <div 
            className={`nav-item ${isActive('/selectFocus') || isActive('/focus-session') ? 'active' : ''}`} 
            onClick={(e) => {
              if (isActive('/focus-session')) {
                e.preventDefault(); 
              } else {
                // เช็คเฉพาะ Active Session ล่าสุดที่เพิ่งเดินออกไปเท่านั้น
                const activeSessionStr = sessionStorage.getItem('pomonest_active_session');
                
                if (activeSessionStr) {
                  try {
                    const parsed = JSON.parse(activeSessionStr);
                    let returnUrl = `/focus-session?userEggId=${parsed.userEggId}`;
                    if (parsed.taskId) returnUrl += `&taskId=${parsed.taskId}`;
                    if (parsed.baseEggId) returnUrl += `&baseEggId=${parsed.baseEggId}`;
                    if (parsed.activityId) returnUrl += `&activityId=${parsed.activityId}`;
                    
                    returnUrl += `&pause=true`; 
                    navigate(returnUrl);
                    return;
                  } catch (err) {}
                }
                
                navigate('/selectFocus');
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faClock} /> Focus
          </div>
          
          {/* Collection */}
          <div 
            className={`nav-item ${isActive('/collection') ? 'active' : ''}`} 
            onClick={() => navigate('/collection')}
          >
            <FontAwesomeIcon icon={faEgg} /> Collection
          </div>
          
          {/* Statistics */}
          <div 
            className={`nav-item ${isActive('/statistics') ? 'active' : ''}`} 
            onClick={() => navigate('/statistics')}
          >
            <FontAwesomeIcon icon={faChartPie} /> Statistics
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
                <FontAwesomeIcon icon={faDoorOpen} style={{ color: '#806a5aff' }} /><span>sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        <Outlet /> {/* Render Home, Focus, CreateTodo, Collection here */}
      </div>
    </div>
  );
}