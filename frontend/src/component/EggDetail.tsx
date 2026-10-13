import { useEffect, useRef, useState } from 'react';
import { faXmark, faImage } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { authFetch } from '../utils/authFetch';
import {
  eggStageFilename,
  imageExt,
  uploadImage,
  validateImage,
} from '../utils/uploadImage';
import type { EggStage } from '../utils/uploadImage';
import { normalizeEggName, rarityFromEggName } from '../utils/eggName';

import '../css/eggdetail.css';
import '../css/admin.css';

export interface EggRow {
  id: number;
  name: string;
  required: number; // minutes
  image: string; // main image filename, served from /images/ (stage images are derived from it)
  rewardsCount: number;
}

interface Eggprop {
  egg: EggRow | null; // null = create new egg
  rarities: string[]; // rarity names created by the admin
  onClose: () => void;
  onSaved: (message: string) => void;
}

const STAGES: { key: EggStage; label: string; hint: string }[] = [
  { key: 'normal', label: 'Normal', hint: 'Egg while focusing' },
  { key: 'cracked', label: 'Cracked', hint: 'Almost hatching' },
  { key: 'split', label: 'Split', hint: 'About to hatch' },
];

type StageMap<T> = Record<EggStage, T>;

const emptyMap = <T,>(value: T): StageMap<T> => ({ normal: value, cracked: value, split: value });

export default function EggDetail({ egg, rarities, onClose, onSaved }: Eggprop) {
  const isEdit = egg !== null;

  // Current image of each stage on the server (edit mode only)
  const savedUrl = (stage: EggStage) => (egg ? `/images/${eggStageFilename(egg.image, stage)}` : null);

  const [name, setName] = useState(egg?.name ?? '');
  const [required, setRequired] = useState(egg ? String(egg.required) : '');
  const [files, setFiles] = useState<StageMap<File | null>>(emptyMap(null));
  const [previews, setPreviews] = useState<StageMap<string | null>>({
    normal: savedUrl('normal'),
    cracked: savedUrl('cracked'),
    split: savedUrl('split'),
  });
  // An existing image can be missing on the server (e.g. egg created before it had 3 images)
  const [broken, setBroken] = useState<StageMap<boolean>>(emptyMap(false));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Live hint: which rarity the animals of this egg will get, based on the name typed so far
  const normalizedName = normalizeEggName(name);
  const firstWord = normalizedName.split(' ')[0]?.toLowerCase() ?? '';
  const nameRarity = normalizedName ? rarityFromEggName(normalizedName, rarities) : null;

  const inputRefs = useRef<StageMap<HTMLInputElement | null>>(emptyMap(null));
  const previewsRef = useRef(previews);
  previewsRef.current = previews;

  // Release blob preview URLs on unmount (never the existing /images/... paths)
  useEffect(() => {
    return () => {
      Object.values(previewsRef.current).forEach((url) => {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const setPreview = (stage: EggStage, url: string | null) => {
    setPreviews((prev) => {
      if (prev[stage]?.startsWith('blob:')) URL.revokeObjectURL(prev[stage]!);
      return { ...prev, [stage]: url };
    });
  };

  const handleImageChange = (stage: EggStage, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFiles((prev) => ({ ...prev, [stage]: file }));
    setBroken((prev) => ({ ...prev, [stage]: false }));
    setPreview(stage, URL.createObjectURL(file));
  };

  // Reset the form to its starting values without closing the window
  const handleCancel = () => {
    setName(egg?.name ?? '');
    setRequired(egg ? String(egg.required) : '');
    setFiles(emptyMap(null));
    setBroken(emptyMap(false));
    STAGES.forEach(({ key }) => {
      setPreview(key, savedUrl(key));
      const input = inputRefs.current[key];
      if (input) input.value = '';
    });
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const minutes = Number(required);
    // Add the missing "Egg" suffix (e.g. "epic" -> "epic Egg") before saving
    const eggName = normalizeEggName(name);
    if (!eggName) return setError('Please enter an egg name.');
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return setError('Hatch time must be a whole number of minutes greater than 0.');
    }

    // A new egg needs all 3 images; when editing, only the images that were picked are replaced
    if (!isEdit) {
      const missing = STAGES.filter(({ key }) => !files[key]).map(({ label }) => label);
      if (missing.length) return setError(`Please select the ${missing.join(', ')} image.`);
    }

    const picked = STAGES.filter(({ key }) => files[key]);
    for (const { key, label } of picked) {
      const problem = validateImage(files[key]!, 'egg');
      if (problem) return setError(`${label}: ${problem}`);
    }

    // The three images share one file extension (the app derives the stage filenames from the main one)
    const targetExt = isEdit
      ? imageExt(egg.image)
      : imageExt(files.normal!.name);
    const wrongExt = picked.filter(({ key }) => imageExt(files[key]!.name) !== targetExt);
    if (wrongExt.length) {
      return setError(
        `All 3 images must be the same format (${targetExt}). Check: ${wrongExt
          .map(({ label }) => label)
          .join(', ')}.`,
      );
    }

    setSaving(true);
    try {
      let image = egg?.image ?? '';

      // 1) main image: new egg -> saved under a unique name, edit -> replaced in place
      if (files.normal) {
        image = isEdit
          ? await uploadImage(files.normal, 'egg', { overwrite: true, baseName: egg.image })
          : await uploadImage(files.normal, 'egg');
      }

      // 2) stage images, named from the main image's final filename
      for (const stage of ['cracked', 'split'] as const) {
        const file = files[stage];
        if (file) await uploadImage(file, 'egg', { stage, baseName: image });
      }

      // 3) save the egg itself
      const res = await authFetch(isEdit ? `/api/admin/eggs/${egg.id}` : '/api/admin/eggs', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({ name: eggName, required: minutes, image }),
      });
      
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save egg');
      onSaved(isEdit ? `Updated egg "${eggName}".` : `Created egg "${eggName}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save egg');
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
          {/* Row 1: Egg name */}
          <div className="egg-form-group egg-name-row">
            <label htmlFor="egg-name">Name</label>
            <input
              id="egg-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. epic Egg"
              maxLength={100}
              required
            />
            <p className="egg-image-hint" style={{ textAlign: 'left' }}>
              {!normalizedName
                ? `Start the name with a rarity (${rarities.join(', ') || 'none created yet'}). "Egg" is added automatically if missing.`
                : nameRarity
                  ? `Saved as "${normalizedName}". Animals of this egg will be ${nameRarity}.`
                  : `Saved as "${normalizedName}". There is no rarity "${firstWord}" yet, so animals can't use this egg until you add it in the Rarities tab.`}
            </p>
          </div>

          {/* Row 2: Hatch time */}
          <div className="egg-form-group">
            <label htmlFor="egg-required">Hatch time (minutes)</label>
            <input
              id="egg-required"
              type="number"
              min={1}
              step={1}
              value={required}
              onChange={(event) => setRequired(event.target.value)}
              placeholder="e.g. 60"
              required
            />
          </div>

          {/* Row 3: One clickable image per hatching stage */}
          <div className="egg-images-row">
            {STAGES.map(({ key, label, hint }) => {
              const preview = previews[key];
              const inputId = `egg-image-${key}`;
              const fileName = files[key]?.name ?? (egg ? eggStageFilename(egg.image, key) : '');
              return (
                <div className="egg-image-field" key={key}>
                  <label htmlFor={inputId}>{label}</label>

                  <input
                    ref={(el) => {
                      inputRefs.current[key] = el;
                    }}
                    id={inputId}
                    className="egg-file-input"
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={(event) => handleImageChange(key, event)}
                  />

                  <label
                    htmlFor={inputId}
                    className="egg-image-clickable"
                    title="Click to select or change image"
                  >
                    {preview && !broken[key] ? (
                      <img
                        src={preview}
                        alt={`${label} egg preview`}
                        onError={() => setBroken((prev) => ({ ...prev, [key]: true }))}
                      />
                    ) : (
                      <div className="egg-image-placeholder">
                        <FontAwesomeIcon icon={faImage} />
                        <span>{preview && broken[key] ? 'Image missing' : 'Choose image'}</span>
                      </div>
                    )}
                  </label>

                  <p className="egg-image-hint">{hint}</p>
                  <p className="egg-image-name">{fileName || 'No image selected'}</p>
                </div>
              );
            })}
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
