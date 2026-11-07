/**
 * src/sync/rules.ts 자체 점검 — 동기화 실패를 어떻게 다루는지, 토큰 갱신이 한 번만 나가는지.
 *
 *   node scripts/check-sync.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const out = mkdtempSync(join(tmpdir(), 'fitto-check-'));

try {
  execFileSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', 'src/sync/rules.ts', '--outDir', out, '--target', 'es2020', '--module', 'es2022', '--skipLibCheck', '--ignoreConfig'],
    { stdio: 'inherit' }
  );
  const { classifyFailure, singleFlight } = await import(pathToFileURL(join(out, 'rules.js')).href);

  // 연결 문제·서버가 잠깐 못 받는 것은 세지 않고 멈춘다.
  assert.equal(classifyFailure('meal.add', { network: true }), 'pause');
  for (const status of [500, 502, 503, 429]) {
    assert.equal(classifyFailure('water.put', { network: false, status }), 'pause', `${status}는 멈춤`);
  }
  // 응답 해석 실패는 client.ts가 연결 문제로 바꿔 던진다 → 위 network 경우.

  // 토큰 만료.
  assert.equal(classifyFailure('meal.add', { network: false, status: 401 }), 'refresh');

  // 지우려던 게 이미 없으면 성공. 지우기가 아닌 404는 거절이다.
  assert.equal(classifyFailure('meal.remove', { network: false, status: 404 }), 'done');
  assert.equal(classifyFailure('meal.add', { network: false, status: 404 }), 'count');

  // 서버가 거절한 요청은 센다.
  for (const status of [400, 403, 409, 422]) {
    assert.equal(classifyFailure('profile.patch', { network: false, status }), 'count', `${status}는 셈`);
  }

  // 동시에 세 번 불러도 한 번만 돌고, 셋 다 같은 결과를 받는다.
  let calls = 0;
  let release;
  const gate = new Promise((r) => (release = r));
  const once = singleFlight(async () => {
    calls++;
    await gate;
    return 'token-' + calls;
  });
  const results = Promise.all([once(), once(), once()]);
  release();
  assert.deepEqual(await results, ['token-1', 'token-1', 'token-1']);
  assert.equal(calls, 1);

  // 끝난 뒤 다시 부르면 새로 돈다(실패한 갱신을 영영 붙잡고 있지 않는다).
  assert.equal(await once(), 'token-2');

  // 실패도 같이 받고, 다음 호출은 새로 돈다.
  let n = 0;
  const flaky = singleFlight(async () => {
    n++;
    if (n === 1) throw new Error('끊김');
    return 'ok';
  });
  await assert.rejects(Promise.all([flaky(), flaky()]));
  assert.equal(await flaky(), 'ok');
  assert.equal(n, 2);

  console.log('동기화 규칙 점검 통과');
} finally {
  rmSync(out, { recursive: true, force: true });
}
