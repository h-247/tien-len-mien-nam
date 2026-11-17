import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../lib/server/crypto';

describe('Password Hashing & Verification (Web Crypto)', () => {
  it('correctly hashes and verifies valid password', async () => {
    const raw = 'MatKhauBaoMat123@';
    const hash = await hashPassword(raw);

    expect(hash).toContain(':');
    const isValid = await verifyPassword(raw, hash);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const raw = 'MatKhauDung123';
    const hash = await hashPassword(raw);

    const isWrong = await verifyPassword('MatKhauSai456', hash);
    expect(isWrong).toBe(false);
  });

  it('generates unique salts across multiple hashes of the same password', async () => {
    const raw = 'SamePassword123';
    const hash1 = await hashPassword(raw);
    const hash2 = await hashPassword(raw);

    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(raw, hash1)).toBe(true);
    expect(await verifyPassword(raw, hash2)).toBe(true);
  });
});
