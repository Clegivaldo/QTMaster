import fetch from 'node-fetch';
import { SourceMapConsumer } from 'source-map';

const args = process.argv.slice(2);
const mapUrl = args[0] || 'http://localhost:3001/assets/ValidationDetails-405917ea.js.map';
const line = Number(args[1] || 11);
const column = Number(args[2] || 24118);
const contextLines = Number(args[3] || 8);

(async () => {
  try {
    console.log('Fetching sourcemap from', mapUrl);
    const res = await fetch(mapUrl);
    if (!res.ok) throw new Error(`Failed to fetch sourcemap: ${res.status}`);
    const sm = await res.json();

    await SourceMapConsumer.with(sm, null, consumer => {
      const pos = consumer.originalPositionFor({ line, column });
      console.log('Mapped position:');
      console.log(JSON.stringify(pos, null, 2));

      if (pos.source) {
        const content = consumer.sourceContentFor(pos.source, true) || '';
        const srcLines = content.split(/\r?\n/);
        const start = Math.max(0, (pos.line || 0) - contextLines - 1);
        const end = Math.min(srcLines.length, (pos.line || 0) + contextLines);
        console.log('\nSource context:');
        for (let i = start; i < end; i++) {
          const num = i + 1;
          const prefix = num === pos.line ? '>>' : '  ';
          console.log(`${prefix} ${num.toString().padStart(4, ' ')} | ${srcLines[i]}`);
        }
      }
    });
  } catch (err) {
    console.error('Error mapping sourcemap:', err);
    process.exit(1);
  }
})();
