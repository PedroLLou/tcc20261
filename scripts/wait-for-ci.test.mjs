import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { waitForCi } from './wait-for-ci.mjs';

const sha = 'a'.repeat(40);
const otherSha = 'b'.repeat(40);
const definitions = [
  ['ci-build.yml', ['build-backend', 'build-frontend']],
  ['ci-tests.yml', ['test-container-helpers', 'test-backend', 'test-frontend']],
  ['lint.yml', ['ESLint', 'ESLint Frontend']],
  ['codeql.yml', ['Analyze']],
];

function fixture(change = () => {}) {
  let time = 0;
  let polls = 0;
  const requests = [];
  const runs = Object.fromEntries(definitions.map(([file], index) => [file, [{
    id: index + 1, head_sha: sha, head_branch: 'main', event: 'push',
    status: 'completed', conclusion: 'success', run_attempt: 1,
  }]]));
  const jobs = Object.fromEntries(definitions.map(([, names], index) => [index + 1,
    names.map((name) => ({ name, head_sha: sha, run_id: index + 1, status: 'completed', conclusion: 'success' })),
  ]));
  return {
    runs, jobs, requests,
    options: {
      repository: 'owner/repo', sha, ref: 'refs/heads/main', token: 'TOKEN_CANARY',
      timeoutMs: 100, intervalMs: 10, now: () => time, log: () => {},
      sleep: async (ms) => { time += ms; polls++; },
      fetchImpl: async (url, options) => {
        assert.equal(url.origin, 'https://api.github.com');
        assert.equal(options.headers.Authorization, 'Bearer TOKEN_CANARY');
        assert.equal(options.redirect, 'error');
        requests.push(url);
        change({ runs, jobs, polls });
        const workflow = url.pathname.match(/\/workflows\/([^/]+)\/runs$/)?.[1];
        if (workflow) {
          assert.equal(url.searchParams.get('head_sha'), sha);
          assert.equal(url.searchParams.get('branch'), 'main');
          assert.equal(url.searchParams.get('event'), 'push');
          return { ok: true, json: async () => ({ total_count: runs[workflow].length, workflow_runs: runs[workflow] }) };
        }
        const match = url.pathname.match(/\/runs\/(\d+)\/attempts\/(\d+)\/jobs$/);
        assert.ok(match, 'Only workflow runs and exact run attempts may be read');
        const selected = jobs[match[1]];
        return { ok: true, json: async () => ({ total_count: selected.length, jobs: selected }) };
      },
    },
  };
}

test('waits until the four workflows for the exact commit have completed successfully', async () => {
  const state = fixture(({ runs, polls }) => {
    runs['codeql.yml'][0].status = polls === 0 ? 'in_progress' : 'completed';
  });
  await waitForCi(state.options);
  assert.ok(state.requests.filter((url) => url.pathname.endsWith('/codeql.yml/runs')).length >= 2);
  assert.equal(state.requests.at(-1).pathname, '/repos/owner/repo/actions/runs/4/attempts/1/jobs');
});

for (const [file] of definitions) {
  test(`blocks when ${file} fails`, async () => {
    const state = fixture();
    state.runs[file][0].conclusion = 'failure';
    await assert.rejects(waitForCi(state.options), /CI reprovado/);
  });
}

for (const conclusion of ['cancelled', 'skipped', 'neutral', 'timed_out', 'action_required', null]) {
  test(`refuses workflow conclusion ${conclusion}`, async () => {
    const state = fixture();
    state.runs['ci-tests.yml'][0].conclusion = conclusion;
    await assert.rejects(waitForCi(state.options), /CI reprovado/);
  });
}

test('does not reuse success from another commit, branch or event', async () => {
  for (const invalid of [{ head_sha: otherSha }, { head_branch: 'feature' }, { event: 'pull_request' }]) {
    const state = fixture();
    Object.assign(state.runs['ci-tests.yml'][0], invalid);
    await assert.rejects(waitForCi(state.options), /Tempo limite/);
  }
});

test('requires a new run and does not reuse success from an older run', async () => {
  const state = fixture();
  state.runs['ci-tests.yml'].push({ ...state.runs['ci-tests.yml'][0], id: 20, status: 'in_progress', conclusion: null });
  await assert.rejects(waitForCi(state.options), /Tempo limite/);
});

test('reads jobs from the latest run attempt', async () => {
  const state = fixture();
  state.runs['ci-tests.yml'][0].run_attempt = 2;
  await waitForCi(state.options);
  assert.ok(state.requests.some((url) => url.pathname.endsWith('/runs/2/attempts/2/jobs')));
});

test('requires all eight jobs even when the workflow reports success', async () => {
  for (const [index, [, names]] of definitions.entries()) {
    for (const [jobIndex] of names.entries()) {
      for (const invalid of ['missing', 'skipped', 'failure', 'wrong_sha', 'wrong_run']) {
        const state = fixture();
        const selected = state.jobs[index + 1];
        if (invalid === 'missing') selected.splice(jobIndex, 1);
        else if (invalid === 'wrong_sha') selected[jobIndex].head_sha = otherSha;
        else if (invalid === 'wrong_run') selected[jobIndex].run_id = 99;
        else selected[jobIndex].conclusion = invalid;
        await assert.rejects(waitForCi(state.options), /Job obrigatório/);
      }
    }
  }
});

test('does not expose credentials on network errors', async () => {
  const state = fixture();
  state.options.fetchImpl = async () => { throw new Error('TOKEN_CANARY'); };
  await assert.rejects(waitForCi(state.options), (error) => {
    assert.match(error.message, /Falha ao consultar CI/);
    assert.ok(!error.message.includes('TOKEN_CANARY'));
    return true;
  });
});

test('fails closed for missing runs, denied API access and malformed responses', async () => {
  const missing = fixture();
  missing.runs['ci-tests.yml'] = [];
  await assert.rejects(waitForCi(missing.options), /Tempo limite/);
  for (const response of [
    { ok: false, status: 403 },
    { ok: true, json: async () => ({ total_count: 1 }) },
    { ok: true, json: async () => { throw new Error('TOKEN_CANARY'); } },
  ]) {
    const state = fixture();
    state.options.fetchImpl = async () => response;
    await assert.rejects(waitForCi(state.options), (error) => !error.message.includes('TOKEN_CANARY'));
  }
});

test('rejects manual deployment from another branch before making any request', async () => {
  const state = fixture();
  await assert.rejects(waitForCi({ ...state.options, ref: 'refs/heads/feature' }), /Deploy exige main/);
  assert.equal(state.requests.length, 0);
});

test('the command exits with failure for a manual deployment from another branch', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./wait-for-ci.mjs', import.meta.url))], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_SHA: sha,
      GITHUB_REF: 'refs/heads/feature', GITHUB_TOKEN: 'TOKEN_CANARY' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Deploy exige main/);
  assert.ok(!result.stderr.includes('TOKEN_CANARY'));
});

test('does not ignore a failed duplicate job on a later API page', async () => {
  const state = fixture();
  const originalFetch = state.options.fetchImpl;
  state.options.fetchImpl = async (url, options) => {
    if (url.pathname.endsWith('/runs/2/attempts/1/jobs')) {
      const first = [...state.jobs[2], ...Array.from({ length: 97 }, (_, i) => ({ name: `extra-${i}` }))];
      const second = [{ ...state.jobs[2][0], conclusion: 'failure' }];
      return { ok: true, json: async () => ({ total_count: 101,
        jobs: url.searchParams.get('page') === '1' ? first : second }) };
    }
    return originalFetch(url, options);
  };
  await assert.rejects(waitForCi(state.options), /Job obrigatório/);
});

test('migration and deploy depend on successful CI; the gate receives no deployment secrets', () => {
  const workflow = readFileSync(new URL('../.github/workflows/cd-render.yml', import.meta.url), 'utf8');
  const ci = workflow.split(/^  ci:\s*$/m)[1]?.split(/^  deploy:\s*$/m)[0];
  const deploy = workflow.split(/^  deploy:\s*$/m)[1];
  assert.ok(ci, 'The workflow must have a separate CI gate');
  assert.match(ci, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(ci, /node scripts\/wait-for-ci\.mjs/);
  assert.doesNotMatch(ci, /secrets\.(DIRECT_URL|RENDER_)/);
  assert.match(deploy, /^    needs: ci$/m);
  assert.doesNotMatch(deploy, /always\(\)/);
  assert.ok(deploy.indexOf('Run migrations') < deploy.indexOf('Deploy backend'));
  assert.ok(deploy.indexOf('Deploy backend') < deploy.indexOf('Deploy frontend'));
});
