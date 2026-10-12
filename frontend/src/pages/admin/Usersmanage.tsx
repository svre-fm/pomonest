import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleInfo,
  faMagnifyingGlass,
  faBan,
  faAngleDown,
  faAngleRight,
  faUserTag,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import DetailUser from '../../component/Showdetailuser';
import { authFetch } from '../../utils/authFetch';
import { formatDuration } from '../../utils/format';
import '../../css/usersmanage.css';
import '../../css/admin.css';

type Range = 'all' | 'week' | 'month' | 'year';
type RoleFilter = '' | 'user' | 'admin';
type StatusFilter = '' | 'active' | 'disabled';
type SortKey = 'recent' | 'oldest' | 'focus' | 'eggs' | 'animals';

type Counts = { total: number; active: number; inactive: number };
type UserStats = {
  range: Range;
  current: Counts & { disabled: number };
  previous: Counts | null;
};

type UserRow = {
  id: string;
  avatar: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
  focusSeconds: number;
  eggsHatched: number;
  animalCount: number;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };
type Option = { value: string; label: string };

const PAGE_SIZE = 10;

const RANGES: { value: Range; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const PREVIOUS_LABEL: Record<Exclude<Range, 'all'>, string> = {
  week: 'previous 7 days',
  month: 'previous 30 days',
  year: 'previous 12 months',
};

const ROLE_OPTIONS: Option[] = [
  { value: 'role', label: 'All' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
];

// 'Enabled/Disabled' = บัญชีถูกระงับหรือไม่ (คนละเรื่องกับ Active Users ที่นับจากการใช้งาน)
const STATUS_OPTIONS: Option[] = [
  { value: 'status', label: 'All' },
  { value: 'active', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
];

const SORT_OPTIONS: Option[] = [
  { value: 'recent', label: 'Newest registered' },
  { value: 'oldest', label: 'Oldest registered' },
  { value: 'focus', label: 'Most focus time' },
  { value: 'eggs', label: 'Most eggs hatched' },
  { value: 'animals', label: 'Most animals' },
];

function getStoredUserId(): string | undefined {
  try {
    return JSON.parse(localStorage.getItem('authUser') || '{}').id;
  } catch {
    return undefined;
  }
}

// ข้อความตัวเลขเล็กๆ ใต้ชื่อ แสดงเมื่อเรียงตามสถิติ เพื่อให้เห็นว่าอันดับมาจากค่าอะไร
function metricText(user: UserRow, sort: SortKey): string {
  if (sort === 'focus') return `${formatDuration(user.focusSeconds)} focus`;
  if (sort === 'eggs') return `${user.eggsHatched} eggs hatched`;
  if (sort === 'animals') return `${user.animalCount} animals`;
  return '';
}

function Delta({ now, before, label, goodWhenUp }: { now: number; before: number; label: string; goodWhenUp: boolean }) {
  const diff = now - before;
  if (diff === 0) return <p className="delta delta-flat">{`– no change vs ${label}`}</p>;
  const up = diff > 0;
  return (
    <p className={`delta ${up === goodWhenUp ? 'delta-good' : 'delta-bad'}`}>
      {`${up ? '▲' : '▼'} ${Math.abs(diff)} vs ${label}`}
    </p>
  );
}

type DropdownProps = {
  label: string;
  options: Option[];
  value: string;
  filtered: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  wrapperStyle?: CSSProperties;
  buttonStyle?: CSSProperties;
};

function FilterDropdown({ label, options, value, filtered, open, onToggle, onSelect, wrapperStyle, buttonStyle }: DropdownProps) {
  return (
    <div className="dropdown-wrapper" style={wrapperStyle}>
      <button
        type="button"
        style={buttonStyle}
        className={`dropdown-filter ${open ? 'active' : ''} ${filtered ? 'filtered' : ''}`}
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
        <FontAwesomeIcon
          icon={open ? faAngleRight : faAngleDown}
          style={{ fontSize: '12px', margin: '7px 0px 0px 10px' }}
        />
      </button>

      {open && (
        <div className="dropdown">
          {options.map((option) => (
            <button
              type="button"
              key={option.value || 'all'}
              className={`dropdown-item ${option.value === value ? 'selected' : ''}`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Usersmanage() {
  const [openMenu, setOpenMenu] = useState<'role' | 'status' | 'sort' | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [changeRole, setchangeRole] = useState(false);
  const [changeStatus, setchangeStatus] = useState(false);
  const [changeSort, setchangeSort] = useState(false);

  const [range, setRange] = useState<Range>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserId] = useState(getStoredUserId);

  // ดีเลย์การค้นหา 300ms เพื่อไม่ให้ยิง API ทุกตัวอักษรที่พิมพ์
  // (ถ้าคำค้นยังเท่าเดิมให้ข้าม ไม่งั้นตอนเปิดหน้าจะเด้งกลับหน้า 1 โดยไม่ได้ตั้งใจ)
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;

    const timer = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // การ์ดด้านบน (เปลี่ยนตามปุ่ม All/Week/Month/Year)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await authFetch(`/api/admin/user-stats?range=${range}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load user stats');
        if (!cancelled) setStats(body.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load user stats');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range, refreshKey]);

  // ตารางผู้ใช้ (ค้นหา / กรอง / เรียง / แบ่งหน้า) ใช้ cancelled กันผลลัพธ์เก่ามาทับผลใหม่
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setUsersLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort: sortKey });
        if (search) params.set('search', search);
        if (roleFilter) params.set('role', roleFilter);
        if (statusFilter) params.set('status', statusFilter);

        const res = await authFetch(`/api/admin/users?${params}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load users');
        if (!cancelled) {
          setUsers(body.data);
          setPagination(body.pagination);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, search, roleFilter, statusFilter, sortKey, refreshKey]);

  const runAction = async (
    user: UserRow,
    path: 'role' | 'active',
    body: { role: 'user' | 'admin' } | { isActive: boolean },
    confirmText: string,
    successText: string,
  ) => {
    if (!window.confirm(confirmText)) return;

    setBusyId(user.id);
    setError('');
    setNotice('');
    try {
      const res = await authFetch(`/api/admin/users/${user.id}/${path}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setNotice(successText);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleMenu = (menu: 'role' | 'status' | 'sort') => setOpenMenu(openMenu === menu ? null : menu);
  const compareLabel = stats && stats.range !== 'all' ? PREVIOUS_LABEL[stats.range] : '';
  const rankOffset = (pagination.page - 1) * pagination.limit;

  return (
    <div className='overview-page-container'>

      <div className="filter-time">
        {RANGES.map((r) => (
          <button
            type="button"
            key={r.value}
            className={`select-filter ${r.value === range ? 'active' : ''}`}
            onClick={() => setRange(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="users-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="users-notice" role="status">
          {notice}
        </div>
      )}

      <div className="layout-card">
        <div className="card-item">
          <h3><b>Total Users</b></h3>
          <p className="card-number">{stats ? stats.current.total : '-'}</p>
          <p className="card-note">{stats ? `registered users · ${stats.current.disabled} disabled` : ''}</p>
          {stats?.previous && (
            <Delta now={stats.current.total} before={stats.previous.total} label={compareLabel} goodWhenUp={true} />
          )}
        </div>
        <div className="card-item">
          <h3><b>Active Users</b></h3>
          <p className="card-number">{stats ? stats.current.active : '-'}</p>
          <p className="card-note">{stats ? 'had at least one focus session' : ''}</p>
          {stats?.previous && (
            <Delta now={stats.current.active} before={stats.previous.active} label={compareLabel} goodWhenUp={true} />
          )}
        </div>
        <div className="card-item">
          <h3><b>Inactive Users</b></h3>
          <p className="card-number">{stats ? stats.current.inactive : '-'}</p>
          <p className="card-note">{stats ? 'no focus session' : ''}</p>
          {stats?.previous && (
            <Delta now={stats.current.inactive} before={stats.previous.inactive} label={compareLabel} goodWhenUp={false} />
          )}
        </div>
      </div>

      <div className="recent-registered-users">
        <div className='filter-container'>
          <form className="search-form" onSubmit={(e) => e.preventDefault()}>
            <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
            <input
              type="search"
              placeholder="Search by username or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search users"
            />
          </form>

          <div className='group-filter'>
            <FilterDropdown
                label={changeRole ? roleFilter : 'role'}
                options={ROLE_OPTIONS}
                value={roleFilter}
                filtered={roleFilter !== ''}
                open={openMenu === 'role'}
                onToggle={() => toggleMenu('role')}
                onSelect={(value) => {
                    setRoleFilter(value as RoleFilter);
                    setPage(1);
                    setOpenMenu(null);
                    setchangeRole(true);
                }}
            />
            <FilterDropdown
              label={changeStatus ? statusFilter : 'status'}
              options={STATUS_OPTIONS}
              value={statusFilter}
              filtered={statusFilter !== ''}
              open={openMenu === 'status'}
              onToggle={() => toggleMenu('status')}
              onSelect={(value) => {
                setStatusFilter(value as StatusFilter);
                setPage(1);
                setOpenMenu(null);
                setchangeStatus(true);
              }}
            />
            <FilterDropdown
              label={changeSort ? sortKey : 'sort'}
              options={SORT_OPTIONS}
              value={sortKey}
              filtered={sortKey !== 'recent'}
              open={openMenu === 'sort'}
              onToggle={() => toggleMenu('sort')}
              onSelect={(value) => {
                setSortKey(value as SortKey);
                setPage(1);
                setOpenMenu(null);
                setchangeSort(true);
              }}
              wrapperStyle={{ width: '30%' }}
              buttonStyle={{ width: '100%', textAlign: 'left' }}
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Registration Date</th>
              <th style={{ textAlign: 'center' }}>action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const isSelf = user.id === currentUserId;
              const busy = busyId === user.id;
              const metric = metricText(user, sortKey);
              return (
                <tr className='row' key={user.id}>
                  <td>{rankOffset + index + 1}</td>
                  <td className='profile-name'>
                    <img className='userProfile' src={user.avatar} />
                    {user.username}
                    {metric && <div className="user-metric">{metric}</div>}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                  </td>
                  <td>
                    <div className="status-cell">
                        <div className="ov-status">
                            <span className={`ov-badge-disabled ${user.isActive ? '' : 'not'}`}>{user.isActive ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    </div>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className='icon faCircleInfo'
                        title='detail'
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <FontAwesomeIcon icon={faCircleInfo} />
                      </button>
                      <button
                        type="button"
                        className='icon faPenToSquare'
                        title={user.role === 'admin' ? 'make user' : 'make admin'}
                        disabled={isSelf || busy}
                        onClick={() =>
                          runAction(
                            user,
                            'role',
                            { role: user.role === 'admin' ? 'user' : 'admin' },
                            user.role === 'admin'
                              ? `Remove admin rights from ${user.username}?`
                              : `Give admin rights to ${user.username}?`,
                            `Updated role of ${user.username}`,
                          )
                        }
                      >
                        <FontAwesomeIcon icon={faUserTag} />
                      </button>
                      <button
                        type="button"
                        className={`icon ${user.isActive ? 'faBan' : 'faCircleCheck'}`}
                        title={user.isActive ? 'disable account' : 'enable account'}
                        disabled={isSelf || busy}
                        onClick={() =>
                          runAction(
                            user,
                            'active',
                            { isActive: !user.isActive },
                            user.isActive
                              ? `Disable ${user.username}? They will be signed out and cannot log in.`
                              : `Enable ${user.username}?`,
                            user.isActive ? `Disabled ${user.username}` : `Enabled ${user.username}`,
                          )
                        }
                      >
                        <FontAwesomeIcon icon={user.isActive ? faBan : faCircleCheck} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!usersLoading && users.length === 0 && (
              <tr className='row'>
                <td colSpan={7}>No users found</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pager">
          <span>{usersLoading ? 'Loading...' : `${pagination.total} users`}</span>
          <div className="pager-buttons">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span>{`${pagination.page} / ${Math.max(1, pagination.totalPages)}`}</span>
            <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedUserId && (
        <DetailUser userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}

    </div>
  );
}