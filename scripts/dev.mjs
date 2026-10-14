import { spawn } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const children = [];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
}
function launch(command, args, cwd, env = {}) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(); process.exitCode = 1; });
  child.on('exit', code => { if (!stopping) { console.error(`Server dừng với mã ${code}.`); stop(); process.exitCode = code || 1; } });
}
process.on('SIGINT', stop); process.on('SIGTERM', stop);
launch('dotnet', ['run', '--project', path.join(root,'backend/CodeKid.Api'), '--no-launch-profile'], root, { ASPNETCORE_ENVIRONMENT: 'Development' });
if (process.platform === 'win32') launch(process.env.ComSpec || 'cmd.exe', ['/d','/s','/c','npm.cmd run dev -- --port 5173 --strictPort'], path.join(root,'frontend'));
else launch('npm', ['run','dev','--','--port','5173','--strictPort'], path.join(root,'frontend'));
async function ready() {
  const deadline = Date.now() + 60000;
  while (!stopping && Date.now() < deadline) {
    try {
      const page = await fetch('http://127.0.0.1:5173/', { signal: AbortSignal.timeout(1000) });
      const health = await fetch('http://127.0.0.1:5173/api/health', { signal: AbortSignal.timeout(1000) });
      if (page.ok && (await page.text()).includes('CodeKid') && health.ok && (await health.json()).status === 'ok') {
        console.log('CodeKid sẵn sàng: http://127.0.0.1:5173 · Ctrl+C để dừng.');
        return;
      }
    } catch { /* Servers may still be building. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!stopping) { console.error('Không khởi động được CodeKid trong 60 giây. Kiểm tra log ở trên.'); stop(); process.exitCode = 1; }
}
void ready();
