import { describe, expect, it } from 'vitest';
import { mergeMetadata } from '../utils';

describe('mergeMetadata', () => {
  it('merges metadata recursively and prefers newer values', () => {
    const base = { integrity: { status: 'healthy', checksum: '123' }, title: 'Doc' };
    const addition = { integrity: { status: 'stale', reason: 'mismatch' }, author: 'bot' };
    const merged = mergeMetadata(base, addition);

    expect(merged).toEqual({
      integrity: { status: 'stale', checksum: '123', reason: 'mismatch' },
      title: 'Doc',
      author: 'bot',
    });
  });

  it('handles undefined or null metadata gracefully', () => {
    expect(mergeMetadata(undefined, { foo: 'bar' })).toEqual({ foo: 'bar' });
    expect(mergeMetadata(null, undefined)).toEqual({});
  });
});
