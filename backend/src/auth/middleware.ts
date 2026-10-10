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

/**
 * Middleware ตรวจสอบสิทธิ์ Admin
 * ต้องใช้ร่วมกับ requireAuth (หรือถ้ายังไม่มี req.user จะส่ง 401)
 * ถ้าไม่ใช่ admin → return 403 Forbidden
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Access denied. Admin privileges required." });
    return;
  }

  next();
}
