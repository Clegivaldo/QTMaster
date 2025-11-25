#!/usr/bin/env node
/**
 * verify-processing-status.mjs
 * Simple polling script to inspect enhanced file processing job status & progress.
 *
 * Usage:
 *   node scripts/verify-processing-status.mjs <jobId> [token] [intervalMs]
 * Example:
 *   node scripts/verify-processing-status.mjs enhanced_job_123456_abcdef YOUR_JWT_TOKEN 3000
 */

const jobId = process.argv[2];
const token = process.argv[3];
const interval = Number(process.argv[4] || '5000');

if (!jobId) {
  console.error('Missing jobId. Usage: node scripts/verify-processing-status.mjs <jobId> [token] [intervalMs]');
  process.exit(1);
}

const BASE_URL = process.env.BASE_URL || 'http://localhost'; // nginx front door

async function fetchJson(path) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: res.ok, status: res.status, data: json };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

function printStatus(statusResp, progressResp) {
  const statusData = statusResp.data?.data || {};
  const progressData = progressResp.data?.data || {};
  const line = [
    new Date().toISOString(),
    `STATUS=${statusData.status || 'n/a'}`,
    `PROGRESS=${statusData.progress ?? progressData.percentage ?? '0'}%`,
    `FILES ${statusData.statistics?.processedFiles ?? progressData.processed ?? '0'}/${statusData.statistics?.totalFiles ?? progressData.total ?? '0'}`,
    `CUR_FILE=${progressData.currentFile || 'n/a'}`,
    `HTTP(status=${statusResp.status}/${progressResp.status})`
  ].join(' | ');
  console.log(line);
  if (statusData.results && statusData.results.length) {
    const first = statusData.results[0];
    console.log(`  First file: ${first.fileName} success=${first.success} rec=${first.recordsProcessed} failed=${first.recordsFailed}`);
  }
}

async function loop() {
  const statusResp = await fetchJson(`/api/files/processing-status/${encodeURIComponent(jobId)}`);
  const progressResp = await fetchJson(`/api/files/processing-status/${encodeURIComponent(jobId)}/progress`);
  printStatus(statusResp, progressResp);
  if (statusResp.data?.data?.status === 'completed' || statusResp.data?.data?.status === 'failed') {
    console.log('Job finished. Exiting.');
    process.exit(0);
  }
  setTimeout(loop, interval);
}

console.log(`Polling job '${jobId}' every ${interval}ms at ${BASE_URL} ...`);
loop();
