import React, { useState } from 'react';
import '../index.css';
import { Link,useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

//avatar
const avatars = [
    '/images/profile1.png',
    '/images/profile2.png',
    '/images/profile3.png',
]

export default function Register() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedAvatar, setSelectedAvatar] = useState('/images/profile1.png');
    const navigate = useNavigate();

    // Form States
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ----------------------------------------
    // Register
    // ----------------------------------------
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
        setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
        }

        setLoading(true);
        setError(null);

        try {
        const response = await fetch(
            'http://localhost:3001/api/auth/register',
            {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password,
                avatar: selectedAvatar,
            }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
            data.error || 'สมัครสมาชิกล้มเหลว'
            );
        }

        // send email to verify
        navigate('/verify', {
            state: { email },
        });

        console.log('Register Success:', data);

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
                <div className="regis-frame">

                    {/* Logo */}
                    <div className="logo-wrapper">
                        <img
                            className="auth-img"
                            src="/images/logo.png"
                            alt="Logo"
                        />
                    </div>
                    <div className="regis-container">
                        <div className="avatar">
                            <h2 className="auth-title">
                            SELECT YOUR PROFILE
                            </h2>
                            <div className="avatar-preview">
                                <img src={selectedAvatar} alt="Avatar" />
                            </div>

                            <div className="avatar-select">
                                {avatars.map((avatar) => (
                                    <img
                                    key={avatar}
                                    src={avatar}
                                    alt="Avatar"
                                    className={`avatar-option ${
                                        selectedAvatar === avatar ? 'selected' : ''
                                    }`}
                                    onClick={() => setSelectedAvatar(avatar)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="register">
                            {/* Title */}
                            <h2 className="auth-title">
                            SIGN UP
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

                            {/* Register Form */}
                            <form
                            onSubmit={handleRegister}
                            className="auth-form register-form"
                            >
                            <div className="input-group">
                                <label>USERNAME</label>

                                <input
                                type="text"
                                className="auth-input"
                                required
                                value={username}
                                onChange={(e) =>
                                    setUsername(e.target.value)
                                }
                                />
                            </div>

                            <div className="input-group">
                                <label>EMAIL</label>

                                <input
                                type="email"
                                className="auth-input"
                                required
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
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
                                        style={{ color: 'rgb(228, 152, 93)', fontSize:'15px' }}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="input-group">
                            <label>CONFIRM PASSWORD</label>

                            <div className="password-wrapper">
                                <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="auth-input"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <FontAwesomeIcon
                                    icon={showConfirmPassword ? faEyeSlash : faEye}
                                    style={{ color: 'rgb(228, 152, 93)', fontSize:'15px' }}
                                    />
                                </button>
                            </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={loading}
                            >
                                {loading
                                ? 'PROCESSING...'
                                : 'SIGN UP'}
                            </button>
                            </form>

                            {/* Login Link */}
                            <div className="auth-footer">
                                <p>
                                    Already have an account?{' '}
                                    <Link to="/login">
                                    Sign In
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}