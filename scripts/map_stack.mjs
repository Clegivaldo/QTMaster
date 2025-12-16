import fetch from 'node-fetch';
import { SourceMapConsumer } from 'source-map';

const args = process.argv.slice(2);
const mapUrl = args[0] || 'http://localhost:3001/assets/ValidationDetails-f8e86b38.js.map';
const line = Number(args[1] || 11);
const column = Number(args[2] || 24118);

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
    });
  } catch (err) {
    console.error('Error mapping sourcemap:', err);
    process.exit(1);
  }
})();
