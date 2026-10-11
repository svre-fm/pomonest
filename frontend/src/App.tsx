import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Login from './pages/login';
import Register from './pages/register';
import Verify from './pages/verify';
import Reset from './pages/reset';
import Home from './pages/home';
import SelectFocus from './pages/selectFocus'
import CreateTodo from './pages/createtodo';
import AppLayout from './component/AppLayout';
import Collection from './pages/collection';
import Focus from './pages/Focus';

//admin
import AdminLayout from './component/AdminLayout';
import Overview from './pages/admin/Overview';
import Usersmanage from './pages/admin/Usersmanage';
import Datamanage from './pages/admin/Datamanage';

function readStoredRole(): string | undefined {
  try {
    return JSON.parse(localStorage.getItem('authUser') || '{}').role;
  } catch {
    return undefined;
  }
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);


  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            localStorage.setItem('authUser', JSON.stringify(data.data));
          }
          setIsAdmin(data.data?.role === 'admin');
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          setIsAdmin(false);         
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAdmin(false); 
        setIsLoggedIn(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

   const handleLoginSuccess = () => {
    setIsAdmin(readStoredRole() === 'admin');
    setIsLoggedIn(true);
  };

  if (checkingAuth) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to={isAdmin ? '/admin' : '/home'} replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Register */}
        <Route path="/register" element={<Register />} />

        {/* Verify */}
        <Route path="/verify" element={<Verify />} />

        {/* Reset password */}
        <Route path="/reset" element={<Reset />} />

        {/* ทุก route ข้างในนี้ มี sidebar ครอบด้วย AppLayout */}
        <Route
          element={isLoggedIn ? <AppLayout /> : <Navigate to="/login" replace />}
        >
          <Route path="/home" element={<Home />} />
          <Route path="/focus-session" element={<Focus />} />
          <Route path="/create-todo" element={<CreateTodo />} />
          <Route path="/create-todo/:taskId" element={<CreateTodo />} />
          <Route path="/selectFocus" element={<SelectFocus />} />
          <Route path="/collection" element={<Collection />} />
        </Route>

        <Route
          element={isLoggedIn && isAdmin ? <AdminLayout /> : <Navigate to={isLoggedIn ? '/home' : '/login'} replace />}
        >
          <Route path="/admin" element={<Overview />} />
          <Route path="/admin/users" element={<Usersmanage />} />
          <Route path="/admin/data" element={<Datamanage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;