import fs from 'fs';
const input = 'puppeteer_check_output.json';
const out = 'puppeteer_excerpt.json';
const raw = JSON.parse(fs.readFileSync(input,'utf8'));
const body = raw.network && raw.network.find(r=> r.url && r.url.includes('/api/validations/'));
const data = {
  chartConfig: body && body.body && body.body.data && body.body.data.validation && body.body.data.validation.chartConfig ? body.body.data.validation.chartConfig : null,
  statistics: body && body.body && body.body.data && body.body.data.validation && body.body.data.validation.statistics ? body.body.data.validation.statistics : null,
  sensorDataSample: body && body.body && body.body.data && body.body.data.validation && Array.isArray(body.body.data.validation.sensorData) ? body.body.data.validation.sensorData.slice(0,200) : []
};
fs.writeFileSync(out, JSON.stringify(data,null,2));
console.log('Wrote', out);
