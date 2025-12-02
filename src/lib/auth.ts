import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  twoFactorVerified: boolean;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

export function generateJWT(user: any, twoFactorVerified: boolean = true): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorVerified: twoFactorVerified,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTOTPSecret(email: string): { secret: string; otpauth_url: string } {
  const secret = speakeasy.generateSecret({
    name: email,
    issuer: 'TrustBridge Health',
    length: 32
  });
  
  return {
    secret: secret.base32!,
    otpauth_url: secret.otpauth_url!
  };
}

export async function generateQRCode(otpauth_url: string): Promise<string> {
  return QRCode.toDataURL(otpauth_url);
}

export function verifyTotpCode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
}

export function generateBackupCodes(): string[] {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  return codes;
}

export async function getCurrentUser(request: Request): Promise<User | null> {
  return getCurrentUserFromRequest(request as NextRequest);
}

export async function getCurrentUserFromRequest(request: NextRequest): Promise<User | null> {
  try {
    // Try to get token from cookie first, then Authorization header
    let token = request.cookies.get('token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    const payload = verifyJWT(token);
    
    if (!payload || !payload.sub) {
      console.error('Invalid JWT payload:', payload);
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        totpSecret: true
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.totpSecret || undefined
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function generateTotpSecret(userId: string, email: string): Promise<{ 
  secret: string; 
  qrCode: string; 
  manualEntryKey: string;
}> {
  const secret = speakeasy.generateSecret({
    name: email,
    issuer: 'TrustBridge Health',
    length: 32
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  // Store the secret (but don't enable 2FA yet)
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: secret.base32,
    },
  });

  return { 
    secret: secret.base32!, 
    qrCode, 
    manualEntryKey: secret.base32! 
  };
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { emailLower: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hashedPassword: true,
        twoFactorEnabled: true,
        totpSecret: true,
        lockedUntil: true
      }
    });

    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new Error('Account is locked due to too many failed attempts');
    }

    const isValidPassword = await verifyPassword(password, user.hashedPassword);
    if (!isValidPassword) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.totpSecret || undefined
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
}