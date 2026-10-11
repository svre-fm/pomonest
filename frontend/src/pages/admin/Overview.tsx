import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDown, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { authFetch } from '../../utils/authFetch';
import '../../css/overview.css';
import '../../css/admin.css';

type Range = 'week' | 'month' | 'year';

type Stats = {
  range: string;
  users: { total: number; verified: number; notVerified: number; disabled: number; admins: number; newInRange: number };
  sessions: { total: number; completed: number; cancelled: number; focusSeconds: number };
  animalsCollected: number;
  activity: {
    granularity: 'day' | 'month';
    points: { label: string; sessions: number; seconds: number }[];
  };
};

type RecentUser = {
  id: string;
  profile:string;
  username: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
};

const RANGES: { value: Range; label: string; caption: string }[] = [
  { value: 'week', label: 'Week', caption: 'Last 7 days' },
  { value: 'month', label: 'Month', caption: 'Last 30 days' },
  { value: 'year', label: 'Year', caption: 'Last 12 months' },
];

async function getJson<T>(url: string, fallback: string): Promise<T> {
  const response = await authFetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || fallback);
  return body as T;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} m`;
  if (seconds > 0 && m === 0) return '< 1 m';
  return `${m} m`;
}

// label ของแท่งกราฟ: week = วันในสัปดาห์, month = วันที่ (แสดงทุก 5 วัน), year = ชื่อเดือน
function barLabel(label: string, granularity: 'day' | 'month', range: Range, index: number): string {
  if (granularity === 'month') {
    return new Date(`${label}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });
  }
  const date = new Date(`${label}T00:00:00`);
  if (range === 'week') return date.toLocaleDateString(undefined, { weekday: 'short' });
  return index % 5 === 0 ? String(date.getDate()) : '';
}

function UserDonut({ verified, notVerified }: { verified: number; notVerified: number }) {
  const total = verified + notVerified;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const verifiedLength = total > 0 ? (verified / total) * circumference : 0;

  return (
    <svg
      className="ov-donut"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${verified} users verified, ${notVerified} users not verified`}
    >
      <circle cx="50" cy="50" r={radius} className={total > 0 ? 'ov-donut-not' : 'ov-donut-empty'} />
      <circle
        cx="50"
        cy="50"
        r={radius}
        className="ov-donut-verified"
        strokeDasharray={`${verifiedLength} ${circumference}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="50" className="ov-donut-total" textAnchor="middle" dominantBaseline="central">
        {total}
      </text>
    </svg>
  );
}

export default function Overview() {
  const [isopenDropdown, setIsopenDropdown] = useState(false);
  const [range, setRange] = useState<Range>('week');

  const [totals, setTotals] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Stats['activity'] | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[] | null>(null);
  const [error, setError] = useState('');

  // การ์ดด้านบน + Total Users + ตารางผู้ใช้ล่าสุด (ยอดรวมทั้งหมด ไม่ขึ้นกับตัวกรองของกราฟ)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [stats, users] = await Promise.all([
          getJson<{ data: Stats }>('/api/admin/stats?range=all', 'Failed to load stats'),
          getJson<{ data: RecentUser[] }>('/api/admin/users?limit=5', 'Failed to load users'),
        ]);
        if (!cancelled) {
          setTotals(stats.data);
          setRecentUsers(users.data);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load overview');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // กราฟ: โหลดใหม่เมื่อเปลี่ยนตัวกรอง (cancelled กันผลลัพธ์เก่ามาทับผลใหม่เมื่อกดสลับเร็วๆ)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stats = await getJson<{ data: Stats }>(`/api/admin/stats?range=${range}`, 'Failed to load chart');
        if (!cancelled) setActivity(stats.data.activity);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load chart');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const selected = RANGES.find((r) => r.value === range) ?? RANGES[0];
  const maxSessions = Math.max(1, ...(activity?.points.map((p) => p.sessions) ?? [1]));

  return (
    <div className='overview-page-container'>

      {error && (
        <div className="ov-error" role="alert">
          {error}
        </div>
      )}

      <div className="layout-card">
        <div className="card-item">
          <h3><b>Focus session</b></h3>
          <p className="ov-value">{totals ? totals.sessions.total : '-'}</p>
          <p className="ov-sub">
            {totals ? `${totals.sessions.completed} completed · ${totals.sessions.cancelled} cancelled` : ''}
          </p>
        </div>
        <div className="card-item">
          <h3><b>Total Focus Time</b></h3>
          <p className="ov-value">{totals ? formatDuration(totals.sessions.focusSeconds) : '-'}</p>
          <p className="ov-sub">{totals ? 'completed sessions only' : ''}</p>
        </div>
        <div className="card-item">
          <h3><b>Animals Collected</b></h3>
          <p className="ov-value">{totals ? totals.animalsCollected : '-'}</p>
          <p className="ov-sub">{totals ? 'across all users' : ''}</p>
        </div>
      </div>

      <div className="layout-card">
        <div className="card-user">
          <div className='flowchart-user'>
            <h3><b>Total Users</b></h3>
            {totals ? (
              <UserDonut verified={totals.users.verified} notVerified={totals.users.notVerified} />
            ) : (
              <p className="ov-value">-</p>
            )}
          </div>

          <div className='type-user'>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className='dot-color-verified'></div>
              <span>Users Verified{totals ? ` (${totals.users.verified})` : ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className='dot-color-not-verified'></div>
              <span>Users Not Verified{totals ? ` (${totals.users.notVerified})` : ''}</span>
            </div>
          </div>
        </div>

        <div className="card-focus-chart">
          <h3><b>Focus Activity Chart</b></h3>
          <div className="wrapper">
            <button
              className={`dropdown-filter ${isopenDropdown ? 'active' : ''}`}
              onClick={() => setIsopenDropdown(!isopenDropdown)}
              aria-haspopup="true"
              aria-expanded={isopenDropdown}
            >
              Filter
              <FontAwesomeIcon
                icon={isopenDropdown ? faAngleRight : faAngleDown}
                style={{ fontSize: '12px', margin: '7px 0px 0px 10px' }}
              />
            </button>

            {isopenDropdown && (
              <div className="dropdown">
                {RANGES.map((r) => (
                  <button
                    key={r.value}
                    className={`dropdown-item ${r.value === range ? 'selected' : ''}`}
                    onClick={() => {
                      setRange(r.value);
                      setIsopenDropdown(false);
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="ov-sub">{selected.caption} · completed sessions</p>

          {activity ? (
            <div className="ov-chart" role="img" aria-label={`Completed focus sessions, ${selected.caption.toLowerCase()}`}>
              {activity.points.map((point, index) => (
                <div
                  className="ov-bar-col"
                  key={point.label}
                  title={`${point.label}: ${point.sessions} sessions, ${formatDuration(point.seconds)}`}
                >
                  <span className="ov-bar-count">{point.sessions > 0 ? point.sessions : ''}</span>
                  <div className="ov-bar-track">
                    <div
                      className="ov-bar"
                      style={{ height: `${point.sessions > 0 ? Math.max((point.sessions / maxSessions) * 100, 4) : 0}%` }}
                    />
                  </div>
                  <span className="ov-bar-label">{barLabel(point.label, activity.granularity, range, index)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="ov-sub">Loading...</p>
          )}
        </div>
      </div>

      <div className="recent-registered-users">
        <h3><b>Recently Registered Users</b></h3>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th style={{textAlign: 'center'}}>Status</th>
              <th style={{textAlign: 'center'}}>Registration Date</th>
              <th style={{textAlign: 'center'}}>Registration Time</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers?.map((user) => {
              const created = new Date(user.createdAt);
              return (
                <tr className='row' key={user.id}>
                    <td className='group-user'>
                        <img className='userProfile' src={user.profile} />
                        {user.username}
                    </td>
                    <td>{user.email}</td>
                    <td>
                        <div className="ov-status">
                        <span className={`ov-badge-disabled ${user.emailVerified ? '' : 'not'}`}>{user.emailVerified ? 'Verified' : 'Not verified'}</span>
                        </div>
                    </td>
                    <td style={{textAlign: 'center'}}>{created.toLocaleDateString()}</td>
                    <td style={{textAlign: 'center'}}>{created.toLocaleTimeString()}</td>
                </tr>
              );
            })}
            {recentUsers && recentUsers.length === 0 && (
              <tr className='row'>
                <td colSpan={5}>No users yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}