import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthedRequest extends Request {
  userId?: string;
}

export interface JwtPayload {
  userId: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId } satisfies JwtPayload, config.jwtSecret, {
    expiresIn: "30d",
  });
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Hard auth: rejects the request if there is no valid token.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Soft auth: attaches userId when a valid token is present, but never rejects.
// Used on public endpoints that show extra data (e.g. "my rating") when logged in.
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      req.userId = payload.userId;
    } catch {
      /* ignore invalid token on optional routes */
    }
  }
  next();
}
