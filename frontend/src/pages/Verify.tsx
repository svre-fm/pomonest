import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import "../index.css";

type Mode = "verify" | "result";

export default function Verify() {
  const [mode, setMode] = useState<Mode>("verify");

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = location.state?.email;
  const status = searchParams.get("status");

  useEffect(() => {
    if (status === "success") {
      setMode("result");
    }
  }, [status]);

    return (
    <div className="auth-page">
        <div className="auth-background-blur"></div>
        <div className="auth-container">
            <div className="verify-email-box">
                <div className="verify-icon">
                    <FontAwesomeIcon
                        icon={faEnvelope}
                        style={{
                            color: 'rgb(228, 152, 93)',
                            fontSize: '40px',
                        }}
                    />
                </div>

                {/* =========================
                    รอให้ User ยืนยัน Email
                ========================= */}
                {mode === "verify" && (
                <>
                    {status === "expired" ? (
                    <>
                        <p className="verify-text">
                        Verification link has expired.
                        </p>

                        <p className="verify-subtext">
                        Please register again to receive a new verification link.
                        </p>

                        <button
                        className="btn-submit"
                        onClick={() => navigate("/register")}
                        >
                            Back to Sign up
                        </button>
                    </>
                    ) : status === "invalid" ? (
                    <>
                        <p className="verify-text">
                        Invalid verification link.
                        </p>

                        <p className="verify-subtext">
                        This verification link is not valid.
                        </p>
                    </>
                    ) : status === "already" ? (
                    <>
                        <p className="verify-text">
                        Email already verified.
                        </p>

                        <p className="verify-subtext">
                        This email has already been verified.
                        </p>
                    </>
                    ) : (
                    <>
                        <p className="verify-text">
                        We've sent a verification link to{" "}
                        <strong>{email}</strong>
                        </p>

                        <p className="verify-subtext">
                        Please check your inbox and click the link
                        to activate your account.
                        </p>

                        <button
                        className="btn-gmail"
                        onClick={() => {
                            window.open(
                            "https://mail.google.com/",
                            "_blank"
                            );
                        }}
                        >
                        Open Gmail
                        </button>
                    </>
                    )}
                </>
                )}

                {/* =========================
                    ยืนยันสำเร็จ
                ========================= */}
                {mode === "result" && (
                <>
                    <p className="verify-text">
                    Email verified successfully!
                    </p>

                    <p className="verify-subtext">
                    Your Pomonest account is now ready to use.
                    </p>

                    <button
                    className="btn-back"
                    onClick={() => navigate("/login")}
                    >
                    Back to Sign in
                    </button>
                </>
                )}
            </div>
        </div>
    </div>
    );                                                                                                                                                                                                       
}