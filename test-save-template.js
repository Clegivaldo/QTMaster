const http = require('http');

const templateData = {
  name: "Teste Template",
  description: "Teste",
  category: "test",
  elements: [],
  globalStyles: {
    fontFamily: "Arial",
    fontSize: 14,
    color: "#000000",
    backgroundColor: "#ffffff",
    lineHeight: 1.5
  },
  pageSettings: {
    size: "A4",
    orientation: "portrait",
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    backgroundColor: "#ffffff",
    showMargins: true
  },
  tags: [],
  isPublic: false
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/editor-templates',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
    'X-User-ID': 'test-user-123'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify(templateData));
req.end();
