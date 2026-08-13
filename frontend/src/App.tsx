import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Focus from './pages/Focus';
import Login from './pages/login';
import Register from './pages/register';
import Verify from './pages/verify';
import Reset from './pages/reset';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/focus" replace />
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
          path="/focus"
          element={
            isLoggedIn ? (
              <Focus />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* Default */}
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

