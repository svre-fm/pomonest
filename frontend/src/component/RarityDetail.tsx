import { useState } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { authFetch } from '../utils/authFetch';

import '../css/eggdetail.css';
import '../css/admin.css';

export interface RarityRow {
  id: number;
  name: string;
  animalsCount: number;
}

interface Rarityprop {
  rarity: RarityRow | null; // null = create new rarity
  onClose: () => void;
  onSaved: (message: string) => void;
}

// Same rule as the backend: one word, letters/numbers/-/_ only
const NAME_PATTERN = /^[\p{L}\p{N}_-]{1,50}$/u;

export default function RarityDetail({ rarity, onClose, onSaved }: Rarityprop) {
  const isEdit = rarity !== null;

  const [name, setName] = useState(rarity?.name ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const value = name.trim().toLowerCase();
    if (!value) return setError('Please enter a rarity name.');
    if (!NAME_PATTERN.test(value)) {
      return setError('The name must be a single word (letters, numbers, - or _), up to 50 characters.');
    }

    setSaving(true);
    try {
      const res = await authFetch(isEdit ? `/api/admin/rarities/${rarity.id}` : '/api/admin/rarities', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({ name: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save rarity');
      onSaved(
        isEdit
          ? `Renamed rarity to "${value}". Eggs are not renamed automatically: make sure their names start with "${value}".`
          : `Created rarity "${value}". Name an egg "${value} Egg" so animals can use it.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rarity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg">
      <div className="detailegg-contiener">
        <button type="button" className="close" onClick={onClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="egg-form-group egg-name-row">
            <label htmlFor="rarity-name">Rarity name</label>
            <input
              id="rarity-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. legendary"
              maxLength={50}
              required
            />
            <p className="egg-image-hint" style={{ textAlign: 'left' }}>
              One word, saved in lowercase. An egg's rarity comes from the first word of its name, so
              "{name.trim().toLowerCase() || 'legendary'} Egg" will give animals this rarity.
            </p>
          </div>

          {error && (
            <div className="users-error" role="alert" style={{ margin: '10px auto 0', width: '90%' }}>
              {error}
            </div>
          )}

          <div className="egg-form-actions">
            <button type="button" className="cancel-btn-egg" onClick={onClose} disabled={saving}>
              Cancel
            </button>

            <button type="submit" className="submit-btn-egg" disabled={saving}>
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
