import test from 'node:test';
import assert from 'node:assert/strict';

import {
  captureAuthGeneration,
  clearAccessToken,
  getAccessToken,
  isCurrentAuthGeneration,
  setAccessToken,
} from '../src/lib/auth-session.js';

test('stale auth generations cannot overwrite a cleared session', () => {
  clearAccessToken();
  const generation = captureAuthGeneration();

  assert.equal(isCurrentAuthGeneration(generation), true);
  assert.equal(setAccessToken('fresh-token', generation), true);
  assert.equal(getAccessToken(), 'fresh-token');

  clearAccessToken();

  assert.equal(isCurrentAuthGeneration(generation), false);
  assert.equal(setAccessToken('stale-token', generation), false);
  assert.equal(getAccessToken(), null);
});
