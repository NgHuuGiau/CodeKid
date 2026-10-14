// Original, captioned lesson walkthroughs. Run after npm install in frontend.
import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const lessons = JSON.parse(await readFile(path.join(root, 'backend/CodeKid.Api/seed/python.json'), 'utf8'));
const destination = path.join(root, 'frontend/public/videos');
const fontFiles = ['vietnamese', 'latin-ext', 'latin'].map(part => path.join(root, `frontend/node_modules/@fontsource/be-vietnam-pro/files/be-vietnam-pro-${part}-600-normal.woff2`));
const fontStyle = (await Promise.all(fontFiles.map(async file => `@font-face{font-family:'Be Vietnam Pro';font-weight:600;src:url(data:font/woff2;base64,${(await readFile(file)).toString('base64')})}`))).join('');
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
try {
  let cursor = 0;
  async function worker() {
    while (cursor < lessons.length) {
      const index = cursor++, lesson = lessons[index];
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      try {
        await page.setContent(`<html lang="vi"><head><style>${fontStyle}body{font-family:'Be Vietnam Pro'}</style></head><body>CodeKid</body></html>`);
        await page.evaluate(async () => { await document.fonts.load('600 30px "Be Vietnam Pro"'); });
        const result = await page.evaluate(async ({ lesson, index }) => {
          const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
          document.body.replaceChildren(canvas); const ctx = canvas.getContext('2d');
          const stream = canvas.captureStream(8);
          const recorder = new MediaRecorder(stream, { mimeType: 'video/mp4;codecs=avc1.42001E', videoBitsPerSecond: 600000 });
          const chunks = []; recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
          const stopped = new Promise(resolve => { recorder.onstop = resolve; });
          const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
          function wrap(text, x, y, width, lineHeight) {
            const words = text.split(' '); let line = '';
            for (const word of words) {
              const next = line ? line + ' ' + word : word;
              if (ctx.measureText(next).width > width && line) { ctx.fillText(line, x, y); y += lineHeight; line = word; } else line = next;
            }
            ctx.fillText(line, x, y);
          }
          function frame(step, progress) {
            ctx.fillStyle = '#f3f5ff'; ctx.fillRect(0, 0, 1280, 720);
            ctx.fillStyle = '#6366f1'; ctx.fillRect(0, 0, 12, 720);
            ctx.font = '700 20px "Be Vietnam Pro", sans-serif'; ctx.fillText('CodeKid Academy  ·  Python', 64, 54);
            ctx.fillStyle = '#1e293b'; ctx.font = '700 40px "Be Vietnam Pro", sans-serif'; ctx.fillText(`${index + 1}. ${lesson.title}`, 64, 115);
            ctx.fillStyle = '#64748b'; ctx.font = '600 18px "Be Vietnam Pro", sans-serif'; ctx.fillText(['01 · Hiểu một điều mới', '02 · Đọc và thử ví dụ', '03 · Ghi nhớ & thực hành'][step], 64, 169);
            if (step === 1) {
              ctx.fillStyle = '#252d47'; ctx.beginPath(); ctx.roundRect(60, 198, 1160, 392, 22); ctx.fill();
              ctx.font = '23px Consolas, monospace';
              lesson.example.split('\n').forEach((line, i) => { ctx.fillStyle = '#7886a9'; ctx.fillText(String(i + 1), 82, 245 + i * 30); ctx.fillStyle = i / lesson.example.split('\n').length <= progress ? '#a9eed0' : '#697693'; ctx.fillText(line, 126, 245 + i * 30); });
            } else {
              ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(60, 200, 1160, 370, 22); ctx.fill();
              ctx.font = '600 29px "Be Vietnam Pro", sans-serif'; ctx.fillStyle = '#364563';
              wrap(step === 0 ? lesson.explanation : lesson.notes, 92, 265, 1090, 49);
              if (step === 2) { ctx.fillStyle = '#6366f1'; ctx.font = '600 23px "Be Vietnam Pro", sans-serif'; wrap('Tiếp theo: trả lời câu hỏi ôn tập, rồi khám phá ba chế độ thực hành.', 92, 475, 1060, 38); }
            }
            ctx.fillStyle = '#64748b'; ctx.font = '18px "Be Vietnam Pro", sans-serif'; ctx.fillText('Dừng video khi cần đọc kỹ · Không có âm thanh · Phụ đề tiếng Việt', 64, 642);
            ctx.fillStyle = '#dce1f6'; ctx.fillRect(64, 680, 1150, 5); ctx.fillStyle = '#6366f1'; ctx.fillRect(64, 680, 1150 * (step + progress) / 3, 5);
          }
          frame(0, 0); recorder.start();
          for (let step = 0; step < 3; step++) for (let tick = 0; tick < 48; tick++) { frame(step, tick / 48); await sleep(125); }
          recorder.stop(); await stopped; stream.getTracks().forEach(t => t.stop());
          const bytes = new Uint8Array(await new Blob(chunks, { type: 'video/mp4' }).arrayBuffer());
          let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          return btoa(binary);
        }, { lesson, index });
        await writeFile(path.join(destination, `lesson-${index + 1}.mp4`), Buffer.from(result, 'base64'));
        await writeFile(path.join(destination, `lesson-${index + 1}.vtt`), `WEBVTT\n\n00:00.000 --> 00:06.000\n${lesson.explanation}\n\n00:06.000 --> 00:12.000\n${lesson.example}\n\n00:12.000 --> 00:19.000\n${lesson.notes}\n`);
        console.log(`Video ${index + 1}/12: ${lesson.title}`);
      } finally { await page.close(); }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
} finally { await browser.close(); }
