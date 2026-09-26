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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

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
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoggedIn(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

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
              <Navigate to="/home" replace />
            ) : (
              <Login onLoginSuccess={() => setIsLoggedIn(true)} />
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
          {/* <Route path="/focus" element={<Focus />} /> */}
          <Route path="/create-todo" element={<CreateTodo />} />
          <Route path="/create-todo/:taskId" element={<CreateTodo />} />
          <Route path="/selectFocus" element={<SelectFocus />} />
          {/* <Route path="/collection" element={<Collection />} /> ถ้ามีหน้านี้แล้ว */}
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;