import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import '../index.css';

export default function Verify() {
  const location = useLocation();

  const email = location.state?.email;

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
                <p className="verify-text">
                    We've sent a verification link to
                    <strong>{email}</strong>
                </p>
                <p className="verify-subtext">
                    Please check your inbox and click the link to activate your account.
                </p>
                <button 
                className="btn-gmail" 
                >
                    <a
                        href="https://mail.google.com/"
                        target="_self"
                        rel="noopener noreferrer"
                        >
                        <span> Open Gmail</span>
                    </a>
                </button>
            </div>
        </div>
    </div>
  );
}