// src/lib/rateLimit.ts
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from './audit';

// Enable rate limiting in both development and production
const useRedis = process.env.NODE_ENV === 'production' && !!process.env.REDIS_URL;

let redis: Redis | null = null;
let _loginLimiter: RateLimiterRedis | RateLimiterMemory | null = null;
let _twoFactorLimiter: RateLimiterRedis | RateLimiterMemory | null = null;

const rateLimiterConfig = {
  points: 5,          // attempts
  duration: 900,      // per 15 minutes
  blockDuration: 900, // block for 15 minutes
};

const twoFactorConfig = {
  points: 10,         // attempts
  duration: 300,      // per 5 minutes
  blockDuration: 300, // block for 5 minutes
};

if (useRedis) {
  // Production: Use Redis
  redis = new Redis(process.env.REDIS_URL!);
  
  _loginLimiter = new RateLimiterRedis({
    storeClient: redis,
    ...rateLimiterConfig,
    keyPrefix: 'rl:login',
  });

  _twoFactorLimiter = new RateLimiterRedis({
    storeClient: redis,
    ...twoFactorConfig,
    keyPrefix: 'rl:2fa',
  });
  
  console.log('Rate limiter initialized with Redis storage');
} else {
  // Development: Use Memory
  _loginLimiter = new RateLimiterMemory({
    ...rateLimiterConfig,
    keyPrefix: 'rl:login',
  });

  _twoFactorLimiter = new RateLimiterMemory({
    ...twoFactorConfig,
    keyPrefix: 'rl:2fa',
  });
  
  console.log('Rate limiter initialized with memory storage (development mode)');
}

export const loginLimiter = _loginLimiter;
export const twoFactorLimiter = _twoFactorLimiter;

// Account lockout constants - PER USER/EMAIL BASIS
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Handle failed login attempt for a specific user
 * This locks the USER ACCOUNT (by email), not the IP address
 */
export async function handleFailedLogin(userId: string, ip?: string, userAgent?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        email: true,
        loginAttempts: true, 
        lockedUntil: true 
      },
    });

    if (!user) return;

    const attempts = user.loginAttempts + 1;
    const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: attempts,
        lockedUntil,
      },
    });

    if (shouldLock) {
      await AuditLogger.logAccountLock(
        userId,
        `User account ${user.email} locked after ${attempts} failed login attempts`,
        ip,
        userAgent
      );
      console.log(`🔒 USER ACCOUNT LOCKED: ${user.email} locked for 15 minutes after ${attempts} failed attempts`);
    } else {
      console.log(`⚠️  Failed login attempt ${attempts}/${MAX_LOGIN_ATTEMPTS} for user: ${user.email}`);
    }

    return { attempts, locked: shouldLock, lockedUntil, email: user.email };
  } catch (error) {
    console.error('Failed to handle failed login:', error);
    return null;
  }
}

/**
 * Handle successful login - clears failed attempts for this user
 */
export async function handleSuccessfulLogin(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, loginAttempts: true }
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    if (user && user.loginAttempts > 0) {
      console.log(`✅ Successful login for ${user.email} - cleared ${user.loginAttempts} failed attempts`);
    }
  } catch (error) {
    console.error('Failed to handle successful login:', error);
  }
}

/**
 * Check if a specific user account is locked (by user ID, not IP)
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true,
        lockedUntil: true,
        loginAttempts: true
      },
    });

    if (!user?.lockedUntil) return false;
    
    const isLocked = user.lockedUntil > new Date();
    
    // Auto-unlock if lock period has expired
    if (!isLocked && user.lockedUntil) {
      await prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: null, loginAttempts: 0 },
      });
      console.log(`🔓 Auto-unlocked expired lock for user: ${user.email}`);
    } else if (isLocked) {
      const timeLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      console.log(`🔒 Account ${user.email} is locked for ${timeLeft} more minutes`);
    }

    return isLocked;
  } catch (error) {
    console.error('Failed to check account lock status:', error);
    return false;
  }
}

/**
 * Check if a specific email has too many failed attempts (before user lookup)
 */
export async function checkEmailLockout(email: string): Promise<{ locked: boolean; attempts: number; timeLeft?: number }> {
  try {
    const user = await prisma.user.findUnique({
      where: { emailLower: email.toLowerCase() },
      select: { 
        id: true,
        email: true,
        loginAttempts: true,
        lockedUntil: true
      },
    });

    if (!user) {
      return { locked: false, attempts: 0 };
    }

    const isLocked = user.lockedUntil && user.lockedUntil > new Date();
    const timeLeft = isLocked ? Math.ceil((user.lockedUntil!.getTime() - Date.now()) / 1000 / 60) : undefined;

    return {
      locked: !!isLocked,
      attempts: user.loginAttempts,
      timeLeft
    };
  } catch (error) {
    console.error('Failed to check email lockout:', error);
    return { locked: false, attempts: 0 };
  }
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Use localhost for development
  return '127.0.0.1';
}

export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown';
}