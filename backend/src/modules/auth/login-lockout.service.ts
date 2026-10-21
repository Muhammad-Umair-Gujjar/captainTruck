import { Injectable } from '@nestjs/common';

type LockEntry = {
  failures: number;
  lockedUntil: number | null;
};

/**
 * In-memory login lockout (Phase 3). Redis-backed lockout can replace this in Phase 10.
 */
@Injectable()
export class LoginLockoutService {
  private readonly store = new Map<string, LockEntry>();
  private readonly maxFailures = 5;
  private readonly lockMs = 15 * 60 * 1000;

  isLocked(email: string): { locked: boolean; retryAfterSeconds?: number } {
    const entry = this.store.get(email);
    if (!entry?.lockedUntil) {
      return { locked: false };
    }
    const now = Date.now();
    if (entry.lockedUntil <= now) {
      this.store.delete(email);
      return { locked: false };
    }
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  recordFailure(email: string): {
    locked: boolean;
    retryAfterSeconds?: number;
  } {
    const current = this.store.get(email) ?? { failures: 0, lockedUntil: null };
    current.failures += 1;

    if (current.failures >= this.maxFailures) {
      current.lockedUntil = Date.now() + this.lockMs;
      current.failures = 0;
      this.store.set(email, current);
      return {
        locked: true,
        retryAfterSeconds: Math.ceil(this.lockMs / 1000),
      };
    }

    this.store.set(email, current);
    return { locked: false };
  }

  clear(email: string): void {
    this.store.delete(email);
  }
}
