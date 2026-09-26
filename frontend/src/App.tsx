import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// import Focus from './pages/Focus';
import Login from './pages/login';
import Register from './pages/register';
import Verify from './pages/verify';
import Reset from './pages/reset';
import Home from './pages/home';

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.data) {
            localStorage.setItem(
              'authUser',
              JSON.stringify(data.data)
            );
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
              <Login
                onLoginSuccess={() =>
                  setIsLoggedIn(true)
                }
              />
            )
          }
        />

        {/* Register */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* Verify */}
        <Route
          path="/verify"
          element={<Verify />}
        />

        {/* resetpassword */}
        <Route
          path='/reset'
          element={<Reset />}
        />
      

        {/* Focus */}
        <Route
          path="/home"
          element={
            isLoggedIn ? (
              <Home />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />
        
        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;