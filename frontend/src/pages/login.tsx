import React, { useState } from 'react';
import '../index.css';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ 
  onLoginSuccess, }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ----------------------------------------
  // Login
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
      const response = await fetch(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ล็อกอินล้มเหลว');
      }

      console.log('Login Success:', data);

      onLoginSuccess();

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

          {/* Logo */}
          <div className="logo-wrapper">
            <img
              className="auth-img"
              src="/images/logo.png"
              alt="Logo"
            />
          </div>

          {/* Title */}
          <h2 className="auth-title">
            SIGN IN
          </h2>

          {/* Error */}
          {error && (
            <div
              style={{
                color: '#d93838',
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: '8px',
                borderRadius: '4px',
                width: '100%',
                textAlign: 'center',
                marginBottom: '15px',
                fontWeight: 'bold',
              }}
            >
              {error}
            </div>
          )}

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="auth-form"
          >
            <div className="input-group">
              <label>EMAIL OR USERNAME</label>

              <input
                type="text"
                className="auth-input"
                required
                value={identifier}
                onChange={(e) =>
                  setIdentifier(e.target.value)
                }
              />
            </div>

            <div className="input-group">
              <label>PASSWORD</label>

              <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <FontAwesomeIcon
                  icon={showPassword ? faEyeSlash : faEye}
                  style={{ color: 'rgba(168, 161, 56, 1)', fontSize:'15px' }}
                />
              </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" />
                Remember Me
              </label>

              <span >
                <Link to="/reset" className="forgot-link">
                Forgot Your Password?
                </Link>
              </span>
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading
                ? 'SIGNING IN...'
                : 'SIGN IN'}
            </button>
          </form>

          {/* Register Link */}
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register">
                Sign Up
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}