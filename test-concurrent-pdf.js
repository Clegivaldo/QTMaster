#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost';
const TEMPLATE_ID = '1deca820-11cf-49ac-9c2f-37853d9206ce'; // From get-test-ids.mjs
const VALIDATION_ID = '7153ca90-8bec-47e8-9a71-7a051b06a944'; // From get-test-ids.mjs
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxZWE3YTE5My00ZmNmLTQxMGMtOWZiNi1iOThmYWUxOWYzZWUiLCJlbWFpbCI6ImFkbWluQHNpc3RlbWEuY29tIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3NjQ2ODU3MzEsImV4cCI6MTc2NDY4OTMzMX0.gCRpksXFBzXQcKGwBc11OoBcNeapJI16S2Hm-XYCDX8';

async function generatePDF(jobNumber) {
  try {
    const response = await fetch(`${BASE_URL}/api/editor-templates/${TEMPLATE_ID}/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        validationId: VALIDATION_ID
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`Job ${jobNumber} started:`, result.data.jobId);

    return result.data.jobId;
  } catch (error) {
    console.error(`Job ${jobNumber} failed to start:`, error.message);
    return null;
  }
}

async function pollJobStatus(jobId, jobNumber) {
  const maxAttempts = 300; // 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${BASE_URL}/api/editor-templates/${TEMPLATE_ID}/generate-pdf/${jobId}/status`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const status = result.data.status;
        console.log(`Job ${jobNumber} (${jobId}): ${status}`);

        if (status === 'completed') {
          console.log(`Job ${jobNumber} completed successfully!`);
          return true;
        } else if (status === 'failed') {
          console.log(`Job ${jobNumber} failed:`, result.error);
          return false;
        }
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error(`Job ${jobNumber} polling error:`, error.message);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`Job ${jobNumber} timed out after ${maxAttempts * 2} seconds`);
  return false;
}

async function runConcurrentTest(numJobs = 5) {
  console.log(`Starting concurrent PDF generation test with ${numJobs} jobs...`);

  // Start all jobs
  const jobPromises = [];
  for (let i = 1; i <= numJobs; i++) {
    jobPromises.push(generatePDF(i));
  }

  const jobIds = await Promise.all(jobPromises);
  const validJobIds = jobIds.filter(id => id !== null);

  console.log(`Started ${validJobIds.length} jobs successfully`);

  if (validJobIds.length === 0) {
    console.log('No jobs started successfully. Exiting.');
    return;
  }

  // Poll all jobs concurrently
  const pollPromises = validJobIds.map((jobId, index) =>
    pollJobStatus(jobId, index + 1)
  );

  const results = await Promise.all(pollPromises);
  const successful = results.filter(result => result === true).length;

  console.log(`\nTest completed:`);
  console.log(`- Total jobs: ${numJobs}`);
  console.log(`- Started: ${validJobIds.length}`);
  console.log(`- Completed successfully: ${successful}`);
  console.log(`- Failed: ${validJobIds.length - successful}`);
}

// Run the test
runConcurrentTest(10).catch(console.error);