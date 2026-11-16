import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fixture = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'fixture.html')).href;
const output = execFileSync(chrome, [
  '--headless', '--disable-gpu', '--no-sandbox', '--disable-logging',
  '--virtual-time-budget=3000', '--dump-dom', fixture
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const match = output.match(/<pre id="output">([^<]+)<\/pre>/);
assert.ok(match, 'collector should finish');
const result = JSON.parse(match[1].replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'));
assert.deepEqual(result.comments, [
  { author: 'An', text: 'Bình luận đầu' },
  { author: 'Bình', text: 'Phản hồi' },
  { author: 'Chi', text: 'Bình luận tải thêm' }
]);
assert.match(result.reason, /Không thể xác nhận đã lấy đủ/);
console.log('PASS: comment, reply, load more, completeness warning');
