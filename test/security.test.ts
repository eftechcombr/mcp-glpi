import { strict as assert } from 'node:assert';
import { test } from 'bun:test';
import { assertAllowedGlpiUrl, parseBoundedEnvInt } from '../src/security.js';

test('fixed GLPI configuration restricts caller URLs to its origin', () => {
  assert.doesNotThrow(() =>
    assertAllowedGlpiUrl('https://glpi.example.com/other-path', 'https://glpi.example.com/glpi', undefined)
  );
  assert.throws(() =>
    assertAllowedGlpiUrl('http://127.0.0.1:8080', 'https://glpi.example.com', undefined)
  );
});

test('multi-tenant GLPI URLs require an explicit host allowlist', () => {
  assert.throws(() => assertAllowedGlpiUrl('https://glpi.example.com', undefined, undefined));
  assert.doesNotThrow(() =>
    assertAllowedGlpiUrl('https://glpi.example.com/glpi', undefined, 'glpi.example.com')
  );
  assert.doesNotThrow(() =>
    assertAllowedGlpiUrl('https://glpi.example.com:8443', undefined, 'glpi.example.com:8443')
  );
  assert.throws(() =>
    assertAllowedGlpiUrl('https://attacker.example', undefined, 'glpi.example.com')
  );
});

test('bounded environment integers reject invalid and out-of-range values', () => {
  assert.equal(parseBoundedEnvInt('LIMIT', undefined, 10, 1, 100), 10);
  assert.equal(parseBoundedEnvInt('LIMIT', '0', 10, 0, 100), 0);
  for (const value of ['-1', '1.5', '1e2', 'abc', '101']) {
    assert.throws(() => parseBoundedEnvInt('LIMIT', value, 10, 0, 100));
  }
});
