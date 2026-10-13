import { useEffect, useMemo, useRef, useState } from 'react';
import { faXmark, faImage } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { authFetch } from '../utils/authFetch';
import { uploadImage, validateImage } from '../utils/uploadImage';
import { rarityFromEggName } from '../utils/eggName';
import type { EggRow } from './EggDetail';


import '../css/eggdetail.css';
import '../css/admin.css';

export interface AnimalRow {
  id: number;
  name: string;
  rarity: string | null;
  image: string; // filename, served from /images/animal/
  animation: string; // filename, served from /images/animal/
  droppedFromEggs: { eggId: number; eggName: string; dropRate: number }[];
}

interface Animalprop {
  animal: AnimalRow | null; // null = create new animal
  eggs: EggRow[];
  rarities: string[]; // rarity names created by the admin
  onClose: () => void;
  onSaved: (message: string) => void;
}

const IMAGE_DIR = '/images/animal/';
const DEFAULT_DROP_RATE = 10;

// Throws with the backend's error message when a request fails
async function request(url: string, method: string, body?: unknown) {
  const res = await authFetch(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function AnimalDetail({ animal, eggs, rarities, onClose, onSaved }: Animalprop) {
  const isEdit = animal !== null;
  const currentLink = animal?.droppedFromEggs[0];

  const [name, setName] = useState(animal?.name ?? '');
  const [eggId, setEggId] = useState(currentLink ? String(currentLink.eggId) : '');
  const [dropRate, setDropRate] = useState(String(currentLink?.dropRate ?? DEFAULT_DROP_RATE));

  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(animal ? IMAGE_DIR + animal.image : null);
  const [preview2, setPreview2] = useState<string | null>(
    animal ? IMAGE_DIR + animal.animation : null,
  );

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Rarity isn't chosen by hand: it comes from the selected egg's name ("epic Egg" -> epic)
  const selectedEgg = useMemo(() => eggs.find((e) => String(e.id) === eggId), [eggs, eggId]);
  const rarity = selectedEgg ? rarityFromEggName(selectedEgg.name, rarities) : null;

  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  // Release blob preview URLs (but never the existing /images/... paths)
  useEffect(() => {
    return () => {
      if (preview1?.startsWith('blob:')) URL.revokeObjectURL(preview1);
    };
  }, [preview1]);

  useEffect(() => {
    return () => {
      if (preview2?.startsWith('blob:')) URL.revokeObjectURL(preview2);
    };
  }, [preview2]);

  const handleImage1Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage1(file);
      setPreview1(URL.createObjectURL(file));
    }
  };

  const handleImage2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage2(file);
      setPreview2(URL.createObjectURL(file));
    }
  };

  // Reset to the starting values without closing the window
  const handleCancel = () => {
    setName(animal?.name ?? '');
    setEggId(currentLink ? String(currentLink.eggId) : '');
    setDropRate(String(currentLink?.dropRate ?? DEFAULT_DROP_RATE));
    setImage1(null);
    setImage2(null);
    setPreview1(animal ? IMAGE_DIR + animal.image : null);
    setPreview2(animal ? IMAGE_DIR + animal.animation : null);
    setError('');
    if (input1Ref.current) input1Ref.current.value = '';
    if (input2Ref.current) input2Ref.current.value = '';
  };

  // Keep egg_rewards in sync with the selected egg.
  // The list endpoint doesn't return reward ids, so read them from the detail endpoint.
  const syncEggLink = async (animalId: number, rate: number) => {
    const detail = await request(`/api/admin/animals/${animalId}`, 'GET');
    const links: { rewardId: number; eggId: number; dropRate: number }[] =
      detail.data.droppedFromEggs;
    const wantedEggId = eggId ? Number(eggId) : null;

    // remove links to any egg other than the chosen one
    for (const link of links.filter((l) => l.eggId !== wantedEggId)) {
      await request(`/api/admin/egg-rewards/${link.rewardId}`, 'DELETE');
    }

    if (wantedEggId === null) return;

    const existing = links.find((l) => l.eggId === wantedEggId);
    if (!existing) {
      await request('/api/admin/egg-rewards', 'POST', {
        eggId: wantedEggId,
        animalId,
        dropRate: rate,
      });
    } else if (existing.dropRate !== rate) {
      await request(`/api/admin/egg-rewards/${existing.rewardId}`, 'PUT', { dropRate: rate });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) return setError('Please enter an animal name.');
    if (!selectedEgg) return setError("Please select an egg: the animal's rarity comes from it.");
    if (!rarity) {
      return setError(
        `Can't tell the rarity from the egg name "${selectedEgg.name}". Its first word must be one of: ${rarities.join(', ') || '(no rarities yet)'}. Rename the egg or add that rarity in the Rarities tab.`,
      );
    }

    if ((!image1 && !animal?.image) || (!image2 && !animal?.animation)) {
      return setError('Please select both images.');
    }
    for (const file of [image1, image2]) {
      if (!file) continue;
      const problem = validateImage(file, 'animal');
      if (problem) return setError(problem);
    }

    const rate = Number(dropRate);
    if (!Number.isInteger(rate) || rate <= 0) {
      return setError('Drop rate must be a whole number greater than 0.');
    }

    setSaving(true);
    let savedId: number | null = animal?.id ?? null;
    try {
      // Upload newly picked images first; when editing keep the old filename for any image not replaced
      const image = image1 ? await uploadImage(image1, 'animal') : animal!.image;
      const animation = image2 ? await uploadImage(image2, 'animal') : animal!.animation;

      const payload = { name: name.trim(), rarity, image, animation };
      const saved = isEdit
        ? await request(`/api/admin/animals/${animal.id}`, 'PUT', payload)
        : await request('/api/admin/animals', 'POST', payload);
      savedId = saved.data.id;

      await syncEggLink(saved.data.id, rate);
      onSaved(isEdit ? `Updated animal "${name.trim()}".` : `Created animal "${name.trim()}".`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save animal';
      setError(
        savedId !== null && !isEdit
          ? `Animal was created, but linking it to the egg failed: ${message}. Edit the animal to retry.`
          : message,
      );
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
          {/* Row 1: Name and egg */}
          <div className="animal-info-row">
            <div className="egg-form-group">
              <label htmlFor="animal-name">Name</label>
              <input
                id="animal-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter animal name"
                maxLength={100}
                required
              />
            </div>

            <div className="egg-form-group">
              <label htmlFor="animal-egg">Select egg</label>
              <select
                id="animal-egg"
                className="data-select"
                value={eggId}
                onChange={(event) => setEggId(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select an egg
                </option>
                {eggs.map((egg) => (
                  <option key={egg.id} value={egg.id}>
                    {egg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Rarity (from the egg) and drop rate */}
          <div className="animal-info-row">
            <div className="egg-form-group">
              <label htmlFor="animal-rarity">Rarity (from egg)</label>
              <input
                id="animal-rarity"
                type="text"
                value={
                  rarity
                    ? rarity.charAt(0).toUpperCase() + rarity.slice(1)
                    : selectedEgg
                      ? 'Unknown'
                      : '-'
                }
                readOnly
                disabled
              />
            </div>

            <div className="egg-form-group">
              <label htmlFor="animal-drop-rate">Drop rate</label>
              <input
                id="animal-drop-rate"
                type="number"
                min={1}
                step={1}
                value={dropRate}
                onChange={(event) => setDropRate(event.target.value)}
                required
              />
            </div>
          </div>

          {/* Row 3: Two clickable image previews */}
          <div className="animal-images-row">
            <div className="animal-image-field">
              <label>Image animal</label>

              <input
                ref={input1Ref}
                id="animal-image-1"
                className="animal-file-input"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImage1Change}
              />

              <label
                htmlFor="animal-image-1"
                className="animal-image-clickable"
                title="Click to select or change image"
              >
                {preview1 ? (
                  <img src={preview1} alt="Animal image preview" />
                ) : (
                  <div className="animal-image-placeholder">
                    <FontAwesomeIcon icon={faImage} />
                    <span>Choose image</span>
                  </div>
                )}
              </label>

              <p className="animal-image-name">
                {image1?.name || animal?.image || 'No image selected'}
              </p>
            </div>

            <div className="animal-image-field">
              <label>Animation animal</label>

              <input
                ref={input2Ref}
                id="animal-image-2"
                className="animal-file-input"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImage2Change}
              />

              <label
                htmlFor="animal-image-2"
                className="animal-image-clickable"
                title="Click to select or change image"
              >
                {preview2 ? (
                  <img src={preview2} alt="Animal animation preview" />
                ) : (
                  <div className="animal-image-placeholder">
                    <FontAwesomeIcon icon={faImage} />
                    <span>Choose image</span>
                  </div>
                )}
              </label>

              <p className="animal-image-name">
                {image2?.name || animal?.animation || 'No image selected'}
              </p>
            </div>
          </div>

          {error && (
            <div className="users-error" role="alert" style={{ margin: '10px auto 0', width: '90%' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="egg-form-actions">
            <button type="button" className="cancel-btn-egg" onClick={handleCancel} disabled={saving}>
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
