
// ISO 6346 letter-to-value table (multiples of 11 are skipped: 11→skip, 22→skip, 33→skip)
const LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19,
  J: 20, K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29,
  S: 30, T: 31, U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

export type ContainerErrorCode = 'format' | 'checkDigit' | 'length';

export interface ContainerValidationResult {
  isValid: boolean;
  isComplete: boolean;
  errorCode?: ContainerErrorCode;
  expectedCheckDigit?: number;
}

/**
 * Validates a container ID against the ISO 6346 standard.
 * Format: 3 owner letters + 1 equipment category (U/J/Z) + 6 serial digits + 1 check digit = 11 chars
 */
export function validateISO6346(raw: string): ContainerValidationResult {
  const id = raw.replace(/\s/g, '').toUpperCase();

  if (id.length === 0) return { isValid: false, isComplete: false };
  if (id.length < 11) return { isValid: false, isComplete: false };
  if (id.length > 11) return { isValid: false, isComplete: true, errorCode: 'length' };

  // Must be 4 uppercase letters followed by 7 digits
  if (!/^[A-Z]{4}\d{7}$/.test(id)) {
    return { isValid: false, isComplete: true, errorCode: 'format' };
  }

  // 4th character must be U (freight), J (detachable freight), or Z (trailer)
  const category = id[3];
  if (!['U', 'J', 'Z'].includes(category)) {
    return { isValid: false, isComplete: true, errorCode: 'format' };
  }

  // Check digit calculation: sum(value[i] * 2^i) mod 11, with 10 → 0
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = id[i];
    const val = /\d/.test(c) ? parseInt(c, 10) : LETTER_VALUES[c];
    sum += val * Math.pow(2, i);
  }
  const expected = sum % 11 === 10 ? 0 : sum % 11;
  const actual = parseInt(id[10], 10);

  if (expected !== actual) {
    return { isValid: false, isComplete: true, errorCode: 'checkDigit', expectedCheckDigit: expected };
  }

  return { isValid: true, isComplete: true };
}

/**
 * Strips non-alphanumeric characters and uppercases the input, capped at 11 chars.
 */
export function formatContainerInput(raw: string): string {
  return raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 11);
}
