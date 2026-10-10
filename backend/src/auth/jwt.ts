import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "pomonest-dev-secret-change-in-production";

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

/**
 * ออก JWT Token
 * @param payload ข้อมูล user ที่จะฝังใน token
 * @param rememberMe ถ้า true = อายุ 30 วัน, ถ้า false = อายุ 1 วัน
 */
export function signToken(payload: JwtPayload, rememberMe = false): string {
  const expiresIn = rememberMe ? "30d" : "1d";
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * ตรวจสอบและถอดรหัส JWT Token
 * @returns JwtPayload ถ้า valid, null ถ้า invalid / หมดอายุ
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
