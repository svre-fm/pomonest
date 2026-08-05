import { useState } from 'react';
import Focus from './pages/Focus';
import Auth from './pages/Auth';


function App() {
  // สร้าง State สำหรับเช็กสถานะการล็อกอิน ค่าเริ่มต้นคือ false (ยังไม่ล็อกอิน)
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <>
      {/* ถ้า isLoggedIn เป็น true จะแสดงหน้า Focus ถ้าเป็น false จะแสดงหน้า Auth */}
      {isLoggedIn ? (
        <Focus />
      ) : (
        <Auth onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </>
  );
}

export default App;