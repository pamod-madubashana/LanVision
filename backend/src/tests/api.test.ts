import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testHealthEndpoint() {
  try {
    console.log('Testing health endpoint...');
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testAuthEndpoints() {
  try {
    console.log('\nTesting authentication endpoints...');
    
    // Test create admin endpoint
    console.log('Creating admin user...');
    const adminResponse = await axios.post(`${API_BASE_URL}/api/auth/create-admin`);
    console.log('✅ Admin created:', adminResponse.data);
    
    // Test login
    console.log('Testing login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      return loginResponse.data.data.token;
    } else {
      console.error('❌ Login failed:', loginResponse.data.error.message);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Auth test failed:', error.response?.data || error.message);
    return null;
  }
}

async function testScanEndpoints(token: string) {
  try {
    console.log('\nTesting scan endpoints...');
    
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    // Test start scan
    console.log('Starting test scan...');
    const scanResponse = await axios.post(`${API_BASE_URL}/api/scans/start`, {
      target: '127.0.0.1',
      profile: 'quick'
    }, config);
    
    if (scanResponse.data.success) {
      console.log('✅ Scan started:', scanResponse.data.data);
      return scanResponse.data.data.scanId;
    } else {
      console.error('❌ Scan start failed:', scanResponse.data.error.message);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Scan test failed:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Running Network Scanner Dashboard Tests\n');
  
  // Test 1: Health endpoint
  const healthOk = await testHealthEndpoint();
  if (!healthOk) {
    console.log('\n❌ Backend server not running. Please start the backend first.');
    return;
  }
  
  // Test 2: Authentication
  const token = await testAuthEndpoints();
  if (!token) {
    console.log('\n❌ Authentication tests failed');
    return;
  }
  
  // Test 3: Scan functionality
  const scanId = await testScanEndpoints(token);
  if (scanId) {
    console.log(`\n✅ All tests passed! Scan ID: ${scanId}`);
  } else {
    console.log('\n⚠️ Scan tests had issues, but authentication works');
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runTests().then(() => {
    console.log('\n🏁 Test suite completed');
  }).catch(error => {
    console.error('Test suite failed:', error);
  });
}

export default runTests;