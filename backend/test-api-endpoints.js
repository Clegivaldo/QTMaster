// Test the enhanced import API endpoints
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testAPIEndpoints() {
  console.log('🧪 Testing Enhanced Import API Endpoints...\n');

  try {
    // Test health check
    console.log('🔍 Testing health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // Test API info
    console.log('\n🔍 Testing API info...');
    const infoResponse = await axios.get(`${API_BASE_URL}/`);
    console.log('✅ API info:', infoResponse.data);

    // Test file processing status endpoint (should work even without database)
    console.log('\n🔍 Testing file processing status endpoint...');
    const statusResponse = await axios.get(`${API_BASE_URL}/files/processing-status/test-job-123`);
    console.log('✅ Processing status:', statusResponse.data);

    console.log('\n✅ All API endpoints are working correctly!');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running. Please start the server first.');
    } else {
      console.error('❌ API test failed:', error.message);
      console.error('Response:', error.response?.data);
    }
  }
}

// Run the test
testAPIEndpoints().catch(console.error);