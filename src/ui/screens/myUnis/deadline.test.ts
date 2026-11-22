import { describe, expect, it } from 'bun:test';
import { daysUntil, parseDeadline } from './deadline';

describe('parseDeadline', () => {
  it('reads ISO dates', () => {
    expect(parseDeadline('Applications close 2027-01-15.')).toBe('2027-01-15');
  });

  it('reads day-month-year and month-day-year names', () => {
    expect(parseDeadline('Deadline: 15 January 2027')).toBe('2027-01-15');
    expect(parseDeadline('Due January 15, 2027')).toBe('2027-01-15');
    expect(parseDeadline('Due Sept. 3, 2026')).toBe('2026-09-03');
  });

  it('reads numeric dates only when one number is above 12', () => {
    expect(parseDeadline('Closes 15/01/2027')).toBe('2027-01-15');
    expect(parseDeadline('Closes 01/15/2027')).toBe('2027-01-15');
    expect(parseDeadline('Closes 05/01/2027')).toBeNull();
  });

  it('returns the first date in the text', () => {
    expect(parseDeadline('Early: 1 November 2026; regular: 15 January 2027')).toBe('2026-11-01');
  });

  it('rejects impossible dates and empty input', () => {
    expect(parseDeadline('31 February 2027')).toBeNull();
    expect(parseDeadline('2027-13-01')).toBeNull();
    expect(parseDeadline('Rolling admissions')).toBeNull();
    expect(parseDeadline(null)).toBeNull();
  });
});

describe('daysUntil', () => {
  it('counts whole calendar days from today', () => {
    expect(daysUntil('2027-01-15', '2027-01-01')).toBe(14);
    expect(daysUntil('2026-12-31', '2027-01-01')).toBe(-1);
    expect(daysUntil('2027-01-01', '2027-01-01')).toBe(0);
  });

  it('crosses month and leap-day boundaries', () => {
    expect(daysUntil('2028-03-01', '2028-02-28')).toBe(2);
  });
});
