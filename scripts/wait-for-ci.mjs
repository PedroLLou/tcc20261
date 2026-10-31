import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const workflows = [
  ['ci-build.yml', ['build-backend', 'build-frontend']],
  ['ci-tests.yml', ['test-container-helpers', 'test-backend', 'test-frontend']],
  ['lint.yml', ['ESLint', 'ESLint Frontend']],
  ['codeql.yml', ['Analyze']],
];

export async function waitForCi({
  repository, sha, ref, token,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  now = Date.now,
  timeoutMs = 15 * 60 * 1000,
  intervalMs = 15 * 1000,
  log = console.log,
}) {
  if (ref !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(sha ?? '') ||
      !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !token) {
    throw new Error('Deploy exige main, SHA válido, repositório e GITHUB_TOKEN.');
  }
  const deadline = now() + timeoutMs;
  const prefix = `https://api.github.com/repos/${repository}`;

  async function getItems(path, key) {
    const items = [];
    for (let page = 1; page <= 10; page++) {
      const url = new URL(prefix + path);
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      let response;
      try {
        response = await fetchImpl(url, {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
          signal: AbortSignal.timeout(10_000),
          redirect: 'error',
        });
      } catch {
        throw new Error('Falha ao consultar CI no GitHub; deploy bloqueado.');
      }
      if (!response.ok) throw new Error(`GitHub respondeu HTTP ${response.status}; deploy bloqueado.`);
      let data;
      try { data = await response.json(); }
      catch { throw new Error('Resposta inválida do GitHub; deploy bloqueado.'); }
      if (!Array.isArray(data[key]) || !Number.isSafeInteger(data.total_count)) {
        throw new Error('Lista de execuções do GitHub inválida; deploy bloqueado.');
      }
      items.push(...data[key]);
      if (items.length >= data.total_count) return items;
      if (data[key].length === 0) break;
    }
    throw new Error('Lista de execuções do GitHub incompleta; deploy bloqueado.');
  }

  async function inspectWorkflow(file, requiredJobs) {
    const params = new URLSearchParams({ branch: 'main', event: 'push', head_sha: sha });
    const runs = await getItems(`/actions/workflows/${file}/runs?${params}`, 'workflow_runs');
    const run = runs.filter((item) => item.head_sha === sha && item.head_branch === 'main' && item.event === 'push')
      .sort((a, b) => b.id - a.id)[0];
    if (!run || run.status !== 'completed') return false;
    if (run.conclusion !== 'success') throw new Error(`CI reprovado em ${file}; deploy bloqueado.`);
    if (!Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) {
      throw new Error('Identidade da execução de CI inválida; deploy bloqueado.');
    }
    const jobs = await getItems(`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`, 'jobs');
    for (const name of requiredJobs) {
      const matches = jobs.filter((job) => job.name === name);
      if (matches.length !== 1 || matches[0].head_sha !== sha ||
          matches[0].run_id !== run.id || matches[0].status !== 'completed' ||
          matches[0].conclusion !== 'success') {
        throw new Error(`Job obrigatório ${name} não aprovado para este SHA; deploy bloqueado.`);
      }
    }
    return true;
  }

  while (now() < deadline) {
    const states = [];
    for (const [file, jobs] of workflows) states.push(await inspectWorkflow(file, jobs));
    if (now() >= deadline) break;
    if (states.every(Boolean)) {
      log(`CI aprovado: quatro workflows e oito jobs para ${sha}.`);
      return;
    }
    log(`Aguardando CI do commit ${sha}.`);
    await sleep(Math.min(intervalMs, deadline - now()));
  }
  throw new Error('Tempo limite aguardando CI; deploy bloqueado.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  waitForCi({
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    ref: process.env.GITHUB_REF,
    token: process.env.GITHUB_TOKEN,
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
