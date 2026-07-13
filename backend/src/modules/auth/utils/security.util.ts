import { createHash, randomBytes } from 'node:crypto';

export const opaqueToken = (): string => randomBytes(48).toString('base64url');
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const durationToSeconds = (value: string, fallback: number): number => {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) return fallback;
  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return amount * multipliers[match[2] as keyof typeof multipliers];
};

export const normalizeIdentifier = (value: string): { email?: string; phone?: string; employeeId?: string } => {
  const normalized = value.trim();
  if (normalized.includes('@')) return { email: normalized.normalize('NFKC').toLowerCase() };
  const compact = normalized.replace(/[\s()-]/g, '');
  if (/^\+\d{8,15}$/.test(compact)) return { phone: compact };
  if (/^0\d{9}$/.test(compact)) return { phone: `+94${compact.slice(1)}` };
  return { employeeId: normalized.toUpperCase() };
};
