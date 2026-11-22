import { describe, expect, test } from 'bun:test';
import { chooseSessionProvider, otherProvider } from './providerChoice';

describe('chooseSessionProvider', () => {
  const both = () => true;
  const onlyOpenrouter = (p: string) => p === 'openrouter';

  test('uses the saved choice when its key exists', () => {
    expect(chooseSessionProvider('opencode', both)).toBe('opencode');
    expect(chooseSessionProvider('openrouter', both)).toBe('openrouter');
  });

  test('keeps the session provider when the chosen key is missing', () => {
    expect(chooseSessionProvider('opencode', onlyOpenrouter)).toBeNull();
  });

  test('keeps the session provider when no choice is saved or it is unknown', () => {
    expect(chooseSessionProvider(null, both)).toBeNull();
    expect(chooseSessionProvider('', both)).toBeNull();
    expect(chooseSessionProvider('anthropic', both)).toBeNull();
  });
});

describe('otherProvider', () => {
  test('returns the opposite provider', () => {
    expect(otherProvider('openrouter')).toBe('opencode');
    expect(otherProvider('opencode')).toBe('openrouter');
  });
});
