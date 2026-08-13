import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope ,faEye ,faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "../index.css";

type Mode = "email" | "reset" | "text";

export default function Reset() {
  const [mode, setMode] = useState<Mode>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      setMode("reset");
    }
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: identifier,
        }),
      });

      const data = await response.json();

      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Send email failed");
      }

      setMode("text");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }

    
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reset password failed");
      }

      navigate("/login", {
        state: {
          message: "Password reset successfully",
        },
      });
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
            <div className="verify-email-box">

                {/* =========================
                    รอให้ User ยืนยัน Email
                ========================= */}
                {mode === "email" && (
                <>

                  <div className="verify-icon">
                    <FontAwesomeIcon
                        icon={faEnvelope}
                        style={{
                            color: 'rgb(228, 152, 93)',
                            fontSize: '40px',
                        }}
                    />
                  </div>

                  <form className="auth-form" onSubmit={handleReset}>

                  <p className="verify-text">
                    Enter your email to reset password
                  </p>

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

                  <input
                    type="email"
                    className="email-input"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email"
                  />

                  <span>
                    <Link to="/login" className="cancel-link">
                      Cancel
                    </Link>
                  </span>

                  <button
                    type="submit"
                    className="btn-back"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Reset password"}
                  </button>
                </form>

                </>
                )}

                {mode === "text" && (
                <>
                  <div className="verify-icon">
                    <FontAwesomeIcon
                        icon={faEnvelope}
                        style={{
                            color: 'rgb(228, 152, 93)',
                            fontSize: '40px',
                        }}
                    />
                  </div>
                  <p className="verify-text">
                    We've sent a verification link to{" "}
                    <strong>{identifier}</strong>
                  </p>

                  <p className="verify-subtext">
                    Please check your inbox and click the link
                    to reset to password.<br/>If it doesn't arrive, be sure to check your spam folder.
                  </p>

                </>
                )}

                
                {mode === "reset" && (
                <>              
                    <form className="reset-form" onSubmit={handleNewPassword}>

                    <p className="reset-text">
                    Enter your new password
                    </p>

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

                    <div className="input-group">
                      <label>PASSWORD</label>
                    
                      <div className="password-input">
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
                    className="btn-back"
                    disabled={loading}
                    >
                    {loading ? "Reset..." : "Reset password"}
                    </button>

                </form>
                </>
                )}
            </div>
        </div>
    </div>
    );                                                                                                                                                                                                       
}