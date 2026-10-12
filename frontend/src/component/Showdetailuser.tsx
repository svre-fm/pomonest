import { useEffect, useState } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { authFetch } from '../utils/authFetch';
import { formatDuration } from '../utils/format';
import '../css/detailuser.css';
import '../css/admin.css';

interface DetailUserprop {
  userId: string;
  onClose: () => void;
}

type Detail = {
  id: string;
  username: string;
  email: string;
  stats: {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    focusSeconds: number;
    totalAnimals: number;
    hatchedEggs: number;
  };
};

export default function DetailUser({ userId, onClose }: DetailUserprop) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch(`/api/admin/users/${userId}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load user');
        if (!cancelled) setDetail(body.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load user');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // กด Esc เพื่อปิด
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const stats = detail?.stats;

  return (
    <div className="bg" onClick={onClose}>
      <div
        className='detail-contiener'
        role="dialog"
        aria-modal="true"
        aria-label="User detail"
        onClick={(e) => e.stopPropagation()}
      >
        <button className='close' onClick={onClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>
        {detail ? detail.username : 'Loading...'}
        {detail && <span className="detail-email">{detail.email}</span>}

        {error && (
          <div className="detail-error" role="alert">
            {error}
          </div>
        )}

        <div className="layout-card">
          <div className="card-item" style={{ boxShadow: 'none' }}>
            <h3><b>Focus Session</b></h3>
            <p className="card-number">{stats ? stats.totalSessions : '-'}</p>
            <p className="card-note">
              {stats ? `${stats.completedSessions} completed · ${stats.cancelledSessions} cancelled` : ''}
            </p>
          </div>
          <div className="card-item" style={{ boxShadow: 'none' }}>
            <h3><b>Total Focus Time</b></h3>
            <p className="card-number">{stats ? formatDuration(stats.focusSeconds) : '-'}</p>
            <p className="card-note">{stats ? 'completed sessions only' : ''}</p>
          </div>
        </div>
        <div className="layout-card">
          <div className="card-item" style={{ boxShadow: 'none' }}>
            <h3><b>Animals Collected</b></h3>
            <p className="card-number">{stats ? stats.totalAnimals : '-'}</p>
            <p className="card-note">{stats ? `${stats.hatchedEggs} eggs hatched` : ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
}