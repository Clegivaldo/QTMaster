import { sanitizeTemplate } from './src/utils/templateValidation';

function makeTemplate() {
  return {
    id: 'template-123',
    name: 'Test Template',
    elements: [
      {
        id: 'el-table-1',
        type: 'table',
        position: { x: 10, y: 20 },
        size: { width: 400, height: 200 },
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        properties: {
          dataSource: '{{sensorData}}',
          columns: [
            { field: 'timestamp', header: 'Data/Hora', width: 150, align: 'left', format: 'date' },
            { field: 'temperature', header: 'Temperatura (°C)', width: 120, align: 'right', format: 'temperature', decimalPlaces: 2 }
          ],
          showHeader: true,
          headerStyle: { background: '#eee' },
          rowStyle: { fontSize: 10 },
          alternatingRowColors: true,
          borderStyle: 'grid',
          fontSize: 10,
          fontFamily: 'Arial',
          maxRows: 20,
          pageBreak: false
        }
      }
    ],
    pages: [],
    globalStyles: { fontFamily: 'Arial', fontSize: 12, color: '#000', backgroundColor: '#fff', lineHeight: 1.4 }
  } as any;
}

function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function run() {
  const tpl = makeTemplate();
  console.log('Original table properties:', JSON.stringify(tpl.elements[0].properties, null, 2));

  const sanitized = sanitizeTemplate(tpl as any);
  console.log('After sanitize (client-side) properties:', JSON.stringify(sanitized.elements[0].properties, null, 2));

  // Simulate server round-trip: JSON serialize/deserialize (server might strip unknown fields)
  const roundTrip = JSON.parse(JSON.stringify(sanitized));

  // Simulate loading template on client (sanitize again)
  const sanitizedAfterLoad = sanitizeTemplate(roundTrip as any);
  console.log('After round-trip + sanitize properties:', JSON.stringify(sanitizedAfterLoad.elements[0].properties, null, 2));

  const preserved = deepEqual(tpl.elements[0].properties, sanitizedAfterLoad.elements[0].properties);

  if (preserved) {
    console.log('\n✅ Table properties preserved through sanitize -> roundtrip -> sanitize');
    process.exit(0);
  } else {
    console.error('\n❌ Table properties NOT preserved. Difference:');
    console.error('Original:', JSON.stringify(tpl.elements[0].properties, null, 2));
    console.error('Final:', JSON.stringify(sanitizedAfterLoad.elements[0].properties, null, 2));
    process.exit(2);
  }
}

run();
