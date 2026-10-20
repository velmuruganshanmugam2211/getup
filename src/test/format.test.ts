import { describe, it, expect } from 'vitest';
import { formatINR, formatMonth, formatDate } from '@/lib/format';

describe('Format Utilities', () => {
  it('formats whole integer amounts as Indian Rupee (INR) without decimals', () => {
    // Normal positive INR
    const formatted = formatINR(50000);
    expect(formatted).toContain('50,000');
    expect(formatted).toContain('₹');

    // 0 amount
    expect(formatINR(0)).toContain('0');

    // Null or undefined
    expect(formatINR(null)).toBe('₹0');
  });

  it('formats month string into human readable title', () => {
    expect(formatMonth('2026-10')).toBe('October 2026');
    expect(formatMonth('2026-02')).toBe('February 2026');
  });

  it('formats ISO dates correctly', () => {
    expect(formatDate('2026-10-17')).toBe('17 Oct 2026');
  });
});
