#!/usr/bin/env node
/**
 * Test script to simulate file import via UI
 * Tests the Python fallback integration
 */
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_URL = 'http://localhost/api';
const FILE_PATH = 'uploads/Elitech RC-4HC.xls';

async function login() {
  console.log('🔐 Logging in...');
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@sistema.com',
      password: 'admin123'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('✅ Login successful');
  return data.accessToken;
}

async function getSuitcases(token) {
  console.log('📦 Fetching suitcases...');
  const response = await fetch(`${API_URL}/suitcases`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`Get suitcases failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`✅ Found ${data.length} suitcases`);
  return data;
}

async function uploadFile(token, suitcaseId) {
  console.log('\n📤 Uploading file via import endpoint...');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(FILE_PATH));
  form.append('suitcaseId', suitcaseId);
  form.append('validateData', 'true');
  
  const response = await fetch(`${API_URL}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  console.log('\n✅ Upload successful!');
  console.log('📊 Result:', JSON.stringify(data, null, 2));
  
  return data;
}

async function main() {
  try {
    console.log('🚀 Testing XLS import with Python fallback\n');
    
    // Check file exists
    if (!fs.existsSync(FILE_PATH)) {
      throw new Error(`File not found: ${FILE_PATH}`);
    }
    console.log(`✅ File found: ${FILE_PATH}\n`);
    
    // Login
    const token = await login();
    
    // Get suitcases
    const suitcases = await getSuitcases(token);
    if (suitcases.length === 0) {
      throw new Error('No suitcases found. Create one first.');
    }
    
    const suitcaseId = suitcases[0].id;
    console.log(`📦 Using suitcase: ${suitcaseId}\n`);
    
    // Upload file
    const result = await uploadFile(token, suitcaseId);
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`\n📈 Stats:`);
    console.log(`   - Total records: ${result.totalRecords || 0}`);
    console.log(`   - File: ${result.fileName || 'N/A'}`);
    console.log(`   - Sensor: ${result.sensorId || 'N/A'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
