import { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faAngleDown,
  faAngleRight,
} from '@fortawesome/free-solid-svg-icons';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-regular-svg-icons';

import EggDetail from '../../component/EggDetail';
import AnimalDetail from '../../component/AnimalDetail';
import type { EggRow } from '../../component/EggDetail';
import type { AnimalRow } from '../../component/AnimalDetail';
import { authFetch } from '../../utils/authFetch';

import '../../css/data.css';
import '../../css/admin.css';
import '../../css/usersmanage.css';

type Page = 'egg' | 'animal';
type RarityFilter = string;

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;

  return `${h} hr ${m} min`;
}

export default function Datamanage() {
  const [page, setPage] = useState<Page>('egg');
  const [isopenroleDropdown, setIsopenroleDropdown] = useState(false);

  const [eggs, setEggs] = useState<EggRow[]>([]);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);

  const rarities = useMemo(
    () =>
      [
        ...new Set(
          eggs
            .map((egg) => egg.rarity)
            .filter((rarity): rarity is string => Boolean(rarity))
            .map((rarity) => rarity.toLowerCase()),
        ),
      ].sort(),
    [eggs],
  );

  const rarityOptions = useMemo(
    () => [
      { value: '', label: 'All' },
      ...rarities.map((rarity) => ({
        value: rarity,
        label: rarity.charAt(0).toUpperCase() + rarity.slice(1),
      })),
    ],
    [rarities],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('');

  // modal state: null = closed, 'new' = add, otherwise the row being edited
  const [editingEgg, setEditingEgg] = useState<EggRow | 'new' | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<AnimalRow | 'new' | null>(null);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  // debounce search
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = setTimeout(() => setSearch(next), 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // The egg list is always needed (egg table + the egg dropdown in the animal form)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/admin/eggs');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load eggs');
        if (!cancelled) setEggs(body.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load eggs');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Animals: search + rarity are handled by the backend
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (rarityFilter) params.set('rarity', rarityFilter);
        const res = await authFetch(`/api/admin/animals?${params.toString()}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load animals');
        if (!cancelled) {
          setAnimals(body.data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load animals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, rarityFilter, refreshKey]);

  // Eggs have no search endpoint, so filter by name here
  const visibleEggs = useMemo(() => {
    const q = search.toLowerCase();
    return q ? eggs.filter((e) => e.name.toLowerCase().includes(q)) : eggs;
  }, [eggs, search]);

  const switchPage = (next: Page) => {
    setPage(next);
    setIsopenroleDropdown(false);
    setError('');
    setNotice('');
  };

  const handleDelete = async (kind: Page, id: number, name: string) => {
    const label = kind === 'egg' ? 'egg' : 'animal';
    const extra =
      kind === 'animal' ? '\nThis will also remove it from users\' collections.' : '';
    if (!window.confirm(`Delete ${label} "${name}"?${extra}`)) return;

    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const res = await authFetch(`/api/admin/${kind === 'egg' ? 'eggs' : 'animals'}/${id}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Delete failed');
      setNotice(`Deleted ${label} "${name}".`);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (message: string) => {
    setEditingEgg(null);
    setEditingAnimal(null);
    setError('');
    setNotice(message);
    reload();
  };

  return (
    <div className="overview-page-container">
      {/* Switch between Eggs and Animals */}
      <div className="filter-page">
        <button
          className={`select-filter ${page === 'egg' ? 'active' : ''}`}
          onClick={() => switchPage('egg')}
        >
          Eggs
        </button>

        <button
          className={`select-filter ${page === 'animal' ? 'active' : ''}`}
          onClick={() => switchPage('animal')}
        >
          Animals
        </button>
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

      {/* Search and filters */}
      <div className="filter-container-data">
        <form className="search-form-data" onSubmit={(e) => e.preventDefault()}>
          <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon-data" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${page === 'egg' ? 'eggs' : 'animals'}`}
          />
        </form>

        {page === 'animal' && (
          <div className="group-filter-data">
            <div className="dropdown-wrapper">
              <button
                className={`dropdown-filter ${isopenroleDropdown ? 'active' : ''} ${
                  rarityFilter ? 'filtered' : ''
                }`}
                onClick={() => setIsopenroleDropdown(!isopenroleDropdown)}
              >
                {rarityFilter
                  ? rarityOptions.find((o) => o.value === rarityFilter)?.label
                  : 'Rarity'}
                <FontAwesomeIcon
                  icon={isopenroleDropdown ? faAngleRight : faAngleDown}
                  style={{ fontSize: '12px', marginLeft: '10px', marginTop: '6px' }}
                />
              </button>

              {isopenroleDropdown && (
                <div className="dropdown">
                  {rarityOptions.map((option) => (
                    <button
                      key={option.value || 'all'}
                      className={`dropdown-item ${
                        option.value === rarityFilter ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setRarityFilter(option.value);
                        setIsopenroleDropdown(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className="add"
          onClick={() => (page === 'egg' ? setEditingEgg('new') : setEditingAnimal('new'))}
        >
          add
        </button>
      </div>

      {/* Table */}
      <div className="recent-registered-users">
        <table>
          {page === 'egg' ? (
            <>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Egg Name</th>
                  <th>Hatch Time</th>
                  <th>Rewards</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleEggs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>
                      {loading ? 'Loading...' : 'No eggs found'}
                    </td>
                  </tr>
                )}
                {visibleEggs.map((egg) => (
                  <tr className="row" key={egg.id}>
                    <td>{egg.id}</td>
                    <td>{egg.name}</td>
                    <td>{formatMinutes(egg.required)}</td>
                    <td style={{display: "flex"}}>
                      {animals
                        .filter((animal) =>
                          animal.droppedFromEggs.some((reward) => reward.eggId === egg.id),
                        )
                        .map((animal) => (
                          <img
                            key={animal.id}
                            src={`/images/animal/${animal.image}`}
                            alt={animal.name}
                            title={animal.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'contain',
                              marginRight: '8px',
                            }}
                          />
                        ))}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                          className="icon faPenToSquare"
                          aria-label={`Edit ${egg.name}`}
                          onClick={() => setEditingEgg(egg)}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          className="icon faBan"
                          aria-label={`Delete ${egg.name}`}
                          disabled={busyId === egg.id}
                          onClick={() => handleDelete('egg', egg.id, egg.name)}
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Animal Name</th>
                  <th>Rarity</th>
                  <th>Egg</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {animals.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>
                      {loading ? 'Loading...' : 'No animals found'}
                    </td>
                  </tr>
                )}
                {animals.map((animal) => (
                  <tr className="row" key={animal.id}>
                    <td>{animal.id}</td>
                    <td style={{display:'flex', alignItems: 'center'}}>
                       <img
                            key={animal.id}
                            src={`/images/animal/${animal.image}`}
                            alt={animal.name}
                            title={animal.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'contain',
                              marginRight: '8px',
                            }}
                          />
                      {animal.name}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {animal.droppedFromEggs.length
                        ? [...new Set(animal.droppedFromEggs.map((e) => e.rarity))].join(', ')
                        : '-'}
                    </td>
                    <td>
                      {animal.droppedFromEggs.length
                        ? animal.droppedFromEggs.map((e) => e.eggName).join(', ')
                        : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                          className="icon faPenToSquare"
                          aria-label={`Edit ${animal.name}`}
                          onClick={() => setEditingAnimal(animal)}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          className="icon faBan"
                          aria-label={`Delete ${animal.name}`}
                          disabled={busyId === animal.id}
                          onClick={() => handleDelete('animal', animal.id, animal.name)}
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>

      {editingEgg && (
        <EggDetail
          egg={editingEgg === 'new' ? null : editingEgg}
          rarities={rarities}
          onClose={() => setEditingEgg(null)}
          onSaved={handleSaved}
        />
      )}

      {editingAnimal && (
        <AnimalDetail
          animal={editingAnimal === 'new' ? null : editingAnimal}
          eggs={eggs}
          rarities={rarities}
          onClose={() => setEditingAnimal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
