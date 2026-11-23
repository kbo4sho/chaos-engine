import { expect, it } from 'vitest';
import M from 'matter-js';
import { sandboxStudy } from '../one-part-missing/discovery/sandbox-study.js';
import {
  readSetupAddress,
  sandboxAddress,
  studyPage,
} from '../one-part-missing/discovery/setup-address.js';
import { shutterReading } from '../one-part-missing/sandbox-shutters.js';

it('round-trips the two selected settings under the project subdirectory', () => {
  const route = 'shaft-clock/fit/1.0';
  const loc = new URL(
    sandboxAddress('shutters', route),
    'https://example.org/chaos-engine/one-part-missing/discovery/double.html',
  );
  expect(loc.pathname).toBe('/chaos-engine/');
  expect(new URLSearchParams(loc.hash.slice(1)).get('shutters')).toBe(route);
  expect(readSetupAddress(route)).toEqual({ route: 'shaft-clock', settings: [1, 0] });
  expect(studyPage('shutters', route)).toBe('one-part-missing/discovery/double.html#' + route);
});
it('rejects unknown, ambiguous and unattainable imports', () => {
  for (const query of [
    'study=air-brake/test/fit/9',
    'study=air-brake/test/fit/1&study=air-brake/test/fit/1',
    'study=air-brake/test/fit/1&shutters=clutch-train/fit/1.2',
    'shutters=screened-slide/take/1.0/fit/1.1',
    'study=air-brake/test/fit/1/fit/2',
    'shutters=timed-cable/take/0.0',
    'study=unknown/fit/0',
  ]) {
    expect(sandboxStudy(M, new URLSearchParams(query)), query).toBeNull();
  }
});
it('uses the working rim as a point on a rotating body and records a missing load', () => {
  const actor = { position: { x: 11, y: 13 }, angle: Math.PI / 2, render: { machineShape: { r: 50 } } };
  const mark = { position: { x: 11, y: 49 } },
    shape = { actor: 'rim', r: 15 };
  expect(shutterReading(actor, mark, shape)).toMatchObject({ matched: true, y: 49 });
  expect(shutterReading(null, mark, shape)).toEqual({ matched: false, missing: true });
  expect(shutterReading(actor, mark, { ...shape, actor: 'cargo' })).toMatchObject({
    matched: false,
    dy: -36,
  });
});
