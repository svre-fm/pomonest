import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import "../index.css";

type Mode = "email" | "reset" | "text";

export default function Reset() {
  const [mode, setMode] = useState<Mode>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();


  const [identifier, setIdentifier] = useState('');
  const status = searchParams.get("status");

//   useEffect(() => {
//     if (status === "success") {
//       setMode("result");
//     }
//   }, [status]);

const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    const payload = {
      email: identifier
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
        throw new Error(data.error || 'send email fail');
      }

      console.log('Reset email sent:', data);

      setMode("text");

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

                  <input
                    type="email"
                    className="email-input"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email"
                  />

                  {error && (
                    <div className="error-message">
                        {error}
                    </div>
                  )}

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
                
                    <form className="auth-form" onSubmit={handleReset}>

                    <p className="verify-text">
                    Enter your new password
                    </p>

                    <input
                    type="email"
                    className="email-input"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email"
                    />

                    {error && (
                    <div className="error-message">
                        {error}
                    </div>
                    )}

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
            </div>
        </div>
    </div>
    );                                                                                                                                                                                                       
}