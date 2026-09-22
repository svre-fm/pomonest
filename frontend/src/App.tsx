import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Login from './pages/login';
import Register from './pages/register';
import Verify from './pages/Verify';
import Home from './pages/home'; 

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
              // เปลี่ยนให้ Redirect ไปที่ /home เมื่อล็อกอินสำเร็จ
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

        {/* Home */}
        <Route
          path="/home"
          element={<Home />}
        />
        
        {/* Fallback สำหรับ Route ที่ไม่มีอยู่จริง */}
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