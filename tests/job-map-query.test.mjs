import assert from 'node:assert/strict';
import test from 'node:test';

import { parseJobMapQuery } from '../app/lib/job-map-query.mjs';

function parse(queryString) {
  return parseJobMapQuery(new URLSearchParams(queryString));
}

test('job map query defaults when no coordinates or radius are provided', () => {
  assert.deepEqual(parse(''), {
    ok: true,
    value: { lat: 43.0731, lng: -104.1458, radius: 25 },
  });
});

test('job map query accepts valid coordinate and radius boundaries', () => {
  assert.deepEqual(parse('lat=-90&lng=-180&radius=0'), {
    ok: true,
    value: { lat: -90, lng: -180, radius: 0 },
  });

  assert.deepEqual(parse('lat=90&lng=180&radius=100'), {
    ok: true,
    value: { lat: 90, lng: 180, radius: 100 },
  });
});

test('job map query rejects missing coordinate pairs', () => {
  assert.deepEqual(parse('lat=43.0731'), {
    ok: false,
    error: 'Invalid map query parameters',
    message: 'lat and lng must be provided together',
    field: 'lng',
  });

  assert.deepEqual(parse('lng=-104.1458'), {
    ok: false,
    error: 'Invalid map query parameters',
    message: 'lat and lng must be provided together',
    field: 'lat',
  });
});

test('job map query rejects non-finite and out-of-range coordinates', () => {
  assert.equal(parse('lat=abc&lng=-104.1458').field, 'lat');
  assert.equal(parse('lat=91&lng=-104.1458').field, 'lat');
  assert.equal(parse('lat=43.0731&lng=Infinity').field, 'lng');
  assert.equal(parse('lat=43.0731&lng=-181').field, 'lng');
});

test('job map query rejects invalid radius values', () => {
  assert.deepEqual(parse('radius='), {
    ok: false,
    error: 'Invalid map query parameters',
    message: 'radius must be a non-negative number in kilometers',
    field: 'radius',
  });

  assert.equal(parse('radius=-1').field, 'radius');
  assert.equal(parse('radius=NaN').field, 'radius');
});
