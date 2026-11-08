#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-ownership-'));
const artifacts = path.join(temp, 'artifacts');
const env = { ...process.env, CHAOS_VERIFY_ARTIFACTS: artifacts };
const common = path.join(root, 'scripts/lib/chaos-verify-common.sh');
const helper = path.join(root, 'scripts/verify-chaos-engine');
const shell = (command, args = []) => spawnSync('bash', ['-c', 'source "$1"; ' + command, 'test', common, ...args], { env, encoding: 'utf8' });
const check = (name, fn) => { fn(); console.log(`PASS ${name}`); };
const fixture = path.join(temp, 'server.js');
fs.writeFileSync(fixture, "require('http').createServer((req,res)=>res.end('fixture')).listen(0,'127.0.0.1',function(){console.log(this.address().port)})");
const child = spawn('node', [fixture], { stdio: ['ignore', 'pipe', 'inherit'] });
try {
  const [data] = await once(child.stdout, 'data');
  const port = Number(String(data).trim());
  assert.ok(port > 0);
  fs.mkdirSync(path.join(artifacts, '.run'), { recursive: true });
  const statePath = path.join(artifacts, '.run/state.json');
  const started = shell('chaos_pid_started "$2"', [String(child.pid)]).stdout.trim();
  const state = { pid: child.pid, port, url: `http://127.0.0.1:${port}`, revision: "fixture", origin: "branch", serveRoot: temp, processStartedAt: started };
  const write = changes => fs.writeFileSync(statePath, JSON.stringify({ ...state, ...changes }));
  write({});
  check('live exact server identity accepted', () => assert.equal(shell('chaos_pid_is_server "$2"', [String(child.pid)]).status, 0));
  check('actual listener owner identified', () => assert.equal(shell('chaos_port_owner "$2"', [String(port)]).stdout.trim(), String(child.pid)));
  check('every listener owner is retained', () => {
    const result = shell('lsof() { printf "p111\\np222\\np111\\n"; }; chaos_port_owner "$2"', [String(port)]);
    assert.equal(result.stdout.trim(), '111\n222');
  });
  check('launch refuses an occupied port without touching its owner', () => {
    const result = spawnSync('bash', [helper, 'launch'], {
      env: { ...env, CHAOS_PORT: String(port), CHAOS_VERIFY_ARTIFACTS: path.join(temp, 'occupied') }, encoding: 'utf8'
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /port .* already in use/);
    process.kill(child.pid, 0);
  });
  check('doctor rejects a different port owner', () => {
    write({ port: 1 });
    const result = spawnSync('bash', [helper, 'doctor'], { env, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /port 1 is owned by pid/);
    write({});
  });
  check('another checkout with same server basename rejected', () => {
    write({ serveRoot: root });
    assert.notEqual(shell('chaos_pid_is_server "$2"', [String(child.pid)]).status, 0);
  });
  check('doctor refuses foreign checkout', () => assert.notEqual(spawnSync('bash', [helper, 'doctor'], { env, encoding: 'utf8' }).status, 0));
  check('cleanup refuses foreign checkout and preserves state/process', () => {
    const result = spawnSync('bash', [helper, 'cleanup'], { env, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing to kill/);
    process.kill(child.pid, 0);
    assert.ok(fs.existsSync(statePath));
  });
  check('reused PID birth identity rejected', () => {
    write({ processStartedAt: 'not-the-recorded-start' });
    assert.notEqual(shell('chaos_pid_is_server "$2"', [String(child.pid)]).status, 0);
  });
  check('legacy state without birth identity rejected', () => {
    write({ processStartedAt: null });
    assert.notEqual(shell('chaos_pid_is_server "$2"', [String(child.pid)]).status, 0);
  });
  check('nonpositive and malformed PIDs rejected', () => {
    for (const pid of ['0', '1', '-1', 'abc']) assert.notEqual(shell('chaos_pid_alive "$2"', [pid]).status, 0);
  });
  check('file and stdin hashes match known SHA-256', () => {
    const file = path.join(temp, 'hash'); fs.writeFileSync(file, 'abc');
    const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    assert.equal(shell('chaos_sha256 "$2"', [file]).stdout.trim(), expected);
    assert.equal(shell('printf abc | chaos_sha256').stdout.trim(), expected);
  });
  child.kill('SIGTERM');
  await once(child, 'exit');
  check('exited PID rejected', () => assert.notEqual(shell('chaos_pid_alive "$2"', [String(child.pid)]).status, 0));
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  fs.rmSync(temp, { recursive: true, force: true });
}
