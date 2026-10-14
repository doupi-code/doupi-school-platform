import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClientId } from '../src/utils/clientId.ts';

test('client IDs work when HTTP browsers expose getRandomValues but no randomUUID', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues } });
    const ids = Array.from({ length: 1000 }, () => createClientId());
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(id => typeof id === 'string' && id.length > 0));
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor!);
  }
});

test('client IDs remain distinct with no crypto API even in the same millisecond', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const now = Date.now;
  const random = Math.random;
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    Date.now = () => 123456;
    Math.random = () => 0.5;
    assert.notEqual(createClientId(), createClientId());
  } finally {
    Date.now = now;
    Math.random = random;
    Object.defineProperty(globalThis, 'crypto', descriptor!);
  }
});

test('client IDs use native randomUUID when supported', () => {
  assert.match(createClientId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
