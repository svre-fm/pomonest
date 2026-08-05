import React, { useState } from 'react';
import '../index.css';

type AuthMode = 'login' | 'register' | 'verify';

interface AuthProps {
  onLoginSuccess: () => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ----------------------------------------
  // API Calls
  // ----------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const isEmail = identifier.includes('@');
    
    const payload = {
      password,
      email: isEmail ? identifier : undefined,
      username: !isEmail ? identifier : undefined,
    };

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ล็อกอินล้มเหลว');
      
      console.log('Login Success:', data);
      onLoginSuccess(); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'สมัครสมาชิกล้มเหลว');
      
      console.log('Register Success:', data);
      
      // go to verify after signup
      setMode('verify'); 
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background-blur"></div>
      
      <div className="auth-container">
        <div className="auth-frame">
          
          <h2 className="auth-title">
            {mode === 'login' ? 'SIGN IN' : mode === 'register' ? 'SIGN UP' : 'VERIFY EMAIL'}
          </h2>
          {error && <div style={{color: '#d93838', backgroundColor: 'rgba(255,255,255,0.9)', padding: '8px', borderRadius: '4px', width: '100%', textAlign: 'center', marginBottom: '15px', fontWeight: 'bold'}}>{error}</div>}

          {/* ---------------- LOGIN FORM ---------------- */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="input-group">
                <label>EMAIL OR USERNAME</label>
                <input 
                  type="text" 
                  className="auth-input"
                  required 
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)} 
                />
              </div>
              <div className="input-group">
                <label>PASSWORD</label>
                <input 
                  type="password" 
                  className="auth-input"
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </div>
              
              <div className="form-options">
                <label className="checkbox-container">
                  <input type="checkbox" /> Remember Me
                </label>
                <span className="forgot-link">Forgot Your Password?</span>
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>
          )}

          {/* ---------------- REGISTER FORM ---------------- */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="auth-form register-form">
              <div className="input-group">
                <label>USERNAME</label>
                <input type="text" className="auth-input" required value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="input-group">
                <label>EMAIL</label>
                <input type="email" className="auth-input" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="input-group">
                <label>PASSWORD</label>
                <input type="password" className="auth-input" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="input-group">
                <label>CONFIRM PASSWORD</label>
                <input type="password" className="auth-input" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'PROCESSING...' : 'SIGN UP'}
              </button>
            </form>
          )}

          {/* ---------------- VERIFY EMAIL UI ---------------- */}
          {mode === 'verify' && (
            <div className="verify-email-box">
              <div className="verify-icon">✉️</div>
              <p className="verify-text">
                We've sent a verification link to
                <strong>{email}</strong>
              </p>
              <p className="verify-subtext">
                Please check your inbox and click the link to activate your account.
              </p>
              <button 
                className="btn-submit" 
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                BACK TO SIGN IN
              </button>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="auth-footer">
              {mode === 'login' ? (
                <p>Don't have an account? <span onClick={() => { setMode('register'); setError(null); }}>Sign Up</span></p>
              ) : (
                <p>Already have an account? <span onClick={() => { setMode('login'); setError(null); }}>Sign In</span></p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}