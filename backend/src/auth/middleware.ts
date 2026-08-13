import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "./jwt.js";

// ขยาย interface ของ express Request ให้มี user field
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware ตรวจสอบ JWT จาก Authorization header
 * รูปแบบ: Authorization: Bearer <token>
 * ถ้า valid → inject req.user และเรียก next()
 * ถ้า invalid → return 401
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token. Please log in again." });
    return;
  }

  req.user = payload;
  next();
}
