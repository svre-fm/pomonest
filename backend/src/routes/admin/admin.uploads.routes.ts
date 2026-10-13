import express, { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { eggs } from "@db/schema.js";

const adminUploadsRouter = Router();
const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "..", "frontend", "public", "images"),
);

const TYPE_CONFIG = {
  egg: { dir: UPLOAD_ROOT, maxBytes: 10 * 1024 * 1024 },
  animal: { dir: path.join(UPLOAD_ROOT, "animal"), maxBytes: 100 * 1024 * 1024 },
} as const;

type UploadType = keyof typeof TYPE_CONFIG;

const EGG_STAGES = ["cracked", "split"] as const;
type EggStage = (typeof EGG_STAGES)[number];

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function isPng(buf: Buffer) {
  return buf.subarray(0, 4).equals(PNG_MAGIC);
}
function isJpeg(buf: Buffer) {
  return buf.subarray(0, 3).equals(JPEG_MAGIC);
}

// ตัด path ออก
function sanitizeFilename(raw: string): string | null {
  const base = path.basename(raw.replace(/\\/g, "/"));
  const ext = path.extname(base).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) return null;
  const stem = path
    .basename(base, path.extname(base))
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
  if (!stem) return null;
  return `${stem}${ext}`;
}

// รับไฟล์เป็น raw binary (ไม่ต้องใช้ multer) และจับ error ของ parser ให้ตอบเป็น JSON
const rawImage = express.raw({ type: ["image/png", "image/jpeg"], limit: "100mb" });

function parseBody(req: Request, res: Response, next: NextFunction) {
  rawImage(req, res, (err?: unknown) => {
    if (!err) return next();
    const status = (err as { status?: number }).status === 413 ? 413 : 400;
    res.status(status).json({
      error: status === 413 ? "File is too large" : "Invalid upload body",
    });
  });
}

// ==========================================
// POST /api/admin/uploads?type=egg|animal&filename=cat.png
// body: raw bytes, Content-Type: image/png | image/jpeg
// ==========================================
adminUploadsRouter.post("/", parseBody, async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string;
    if (type !== "egg" && type !== "animal") {
      return res.status(400).json({ error: "type must be 'egg' or 'animal'" });
    }
    const config = TYPE_CONFIG[type as UploadType];

    const filename = sanitizeFilename(String(req.query.filename ?? ""));
    if (!filename) {
      return res.status(400).json({ error: "A valid .png, .jpg or .jpeg filename is required" });
    }

    const stage = req.query.stage === undefined ? null : String(req.query.stage);
    const overwrite = req.query.overwrite === "true";

    if ((stage !== null || overwrite) && type !== "egg") {
      return res.status(400).json({ error: "stage and overwrite are only supported for eggs" });
    }
    if (stage !== null && !(EGG_STAGES as readonly string[]).includes(stage)) {
      return res.status(400).json({ error: `stage must be one of: ${EGG_STAGES.join(", ")}` });
    }
    if (stage !== null && overwrite) {
      return res.status(400).json({ error: "Use either stage or overwrite, not both" });
    }

    const body = req.body as unknown;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ error: "Image must be sent as image/png or image/jpeg" });
    }
    if (body.length > config.maxBytes) {
      return res.status(413).json({
        error: `File is too large (max ${Math.round(config.maxBytes / 1024 / 1024)} MB)`,
      });
    }

    const ext = path.extname(filename).toLowerCase();
    const validContent = ext === ".png" ? isPng(body) : isJpeg(body);
    if (!validContent) {
      return res.status(400).json({
        error:
          stage !== null
            ? `Stage image must be the same format as the main egg image (${ext})`
            : "File content does not match a PNG or JPEG image",
      });
    }

    const stem = path.basename(filename, ext);

    if (overwrite) {
      const [owner] = await dbClient
        .select({ id: eggs.id })
        .from(eggs)
        .where(eq(eggs.image, filename))
        .limit(1);
      if (!owner) {
        return res.status(400).json({ error: "overwrite is only allowed for an existing egg image" });
      }
    }

    await fs.mkdir(config.dir, { recursive: true });

    let finalName = stage !== null ? `${stem}-${stage as EggStage}${ext}` : filename;

    if (stage !== null || overwrite) {
      await fs.writeFile(path.join(config.dir, finalName), body);
    } else {
      for (let attempt = 0; ; attempt++) {
        try {
          await fs.writeFile(path.join(config.dir, finalName), body, { flag: "wx" });
          break;
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "EEXIST" || attempt >= 20) throw err;
          finalName = `${stem}-${Date.now().toString(36)}${attempt}${ext}`;
        }
      }
    }

    res.status(201).json({
      message: "Image uploaded successfully",
      data: { filename: finalName, renamed: stage === null && finalName !== filename },
    });
  } catch (error) {
    console.error("Error uploading image by admin:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export default adminUploadsRouter;
