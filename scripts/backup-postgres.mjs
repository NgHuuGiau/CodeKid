import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Sao lưu PostgreSQL bằng pg_dump trong container db của compose.
// Dùng: node scripts/backup-postgres.mjs
// Biến: COMPOSE_FILE (mặc định compose.yml), COMPOSE_PROJECT_NAME, BACKUP_DIR (mặc định artifacts/db-backups), KEEP (mặc định 7).
const root = path.resolve(import.meta.dirname, '..');
const file = process.env.COMPOSE_FILE || 'compose.yml';
const outDir = path.resolve(root, process.env.BACKUP_DIR || 'artifacts/db-backups');
const keep = Number(process.env.KEEP || 7);

const compose = ['compose', '-f', file];
if (process.env.COMPOSE_PROJECT_NAME) compose.push('-p', process.env.COMPOSE_PROJECT_NAME);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(outDir, `codekid-${stamp}.dump`);

const dump = spawnSync('docker', [...compose, 'exec', '-T', 'db', 'pg_dump', '-U', 'codekid', '-d', 'codekid', '--format=custom'], { cwd: root, maxBuffer: 1 << 30 });
if (dump.status !== 0) {
  process.stderr.write(dump.stderr?.toString() || '');
  console.error('Sao lưu thất bại: không chạy được pg_dump. Kiểm tra stack compose đang chạy (docker compose ps).');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
writeFileSync(target, dump.stdout);
console.log(`Đã sao lưu: ${target} (${(statSync(target).size / 1024 / 1024).toFixed(2)} MB)`);

const old = readdirSync(outDir).filter((f) => f.startsWith('codekid-') && f.endsWith('.dump')).sort().slice(0, -keep);
for (const f of old) rmSync(path.join(outDir, f));
if (old.length) console.log(`Đã xoá ${old.length} bản sao lưu cũ (giữ ${keep} bản gần nhất).`);
