import { authFetch } from './authFetch';

export type UploadType = 'egg' | 'animal';
export type EggStage = 'normal' | 'cracked' | 'split';

const MAX_MB: Record<UploadType, number> = { egg: 10, animal: 100 };
const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

// Returns an error message if the file can't be uploaded, otherwise null (checked before sending anything)
export function validateImage(file: File, type: UploadType): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `"${file.name}" must be a PNG or JPEG image.`;
  if (file.size > MAX_MB[type] * 1024 * 1024) {
    return `"${file.name}" is larger than ${MAX_MB[type]} MB.`;
  }
  return null;
}

// File extension in lowercase, with jpeg treated the same as jpg
export function imageExt(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return ext === '.jpeg' ? '.jpg' : ext;
}

// Same naming rule Focus.tsx uses: "common.png" -> "common-cracked.png" / "common-split.png"
export function eggStageFilename(image: string, stage: EggStage): string {
  if (stage === 'normal') return image;
  const dot = image.lastIndexOf('.');
  return `${image.slice(0, dot)}-${stage}${image.slice(dot)}`;
}

type UploadOptions = {
  // Egg stage images: `baseName` is the egg's main image filename, saved as <name>-<stage>.<ext>
  stage?: Exclude<EggStage, 'normal'>;
  // Replace an existing egg's main image in place (the backend only allows names an egg already uses)
  overwrite?: boolean;
  baseName?: string;
};

// Uploads the file to the backend and resolves with the filename it was saved as.
// For a new image the backend may rename it if that name is taken, so always use the returned name.
export async function uploadImage(
  file: File,
  type: UploadType,
  options: UploadOptions = {},
): Promise<string> {
  const params = new URLSearchParams({ type, filename: options.baseName ?? file.name });
  if (options.stage) params.set('stage', options.stage);
  if (options.overwrite) params.set('overwrite', 'true');

  const res = await authFetch(`/api/admin/uploads?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Failed to upload "${file.name}"`);
  return body.data.filename as string;
}
