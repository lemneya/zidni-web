/**
 * Zidni Feature Verification Script
 * Tests all backend endpoints to verify functionality
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const results = {
  passed: [],
  failed: [],
  skipped: []
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, endpoint, data = null, skipIfNoBackend = true) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    log(`\n🧪 Testing: ${name}`, 'cyan');
    log(`   ${method} ${url}`, 'blue');
    
    let response;
    if (method === 'GET') {
      response = await axios.get(url, { timeout: 5000 });
    } else if (method === 'POST') {
      response = await axios.post(url, data, { timeout: 10000 });
    } else if (method === 'DELETE') {
      response = await axios.delete(url, { timeout: 5000 });
    }
    
    log(`   ✅ PASSED - Status: ${response.status}`, 'green');
    results.passed.push({ name, status: response.status, data: response.data });
    return { success: true, data: response.data };
  } catch (error) {
    if (error.code === 'ECONNREFUSED' && skipIfNoBackend) {
      log(`   ⏭️  SKIPPED - Backend not running`, 'yellow');
      results.skipped.push({ name, error: 'Backend not running' });
      return { success: false, skipped: true };
    }
    log(`   ❌ FAILED - ${error.message}`, 'red');
    results.failed.push({ name, error: error.message });
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  ZIDNI FEATURE VERIFICATION', 'cyan');
  log('  API Base URL: ' + API_BASE_URL, 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  // ==================== HEALTH & CONFIG ====================
  log('\n📋 HEALTH & CONFIGURATION', 'yellow');
  
  await testEndpoint('Health Check', 'GET', '/api/health');
  await testEndpoint('Get Tools', 'GET', '/api/tools');
  await testEndpoint('KIMI Models', 'GET', '/api/kimi/models');

  // ==================== CONVERSATIONS ====================
  log('\n💬 CONVERSATIONS', 'yellow');
  
  await testEndpoint('List Conversations', 'GET', '/api/conversations');
  const createConv = await testEndpoint('Create Conversation', 'POST', '/api/conversations', { title: 'Test Conversation' });
  
  let conversationId = null;
  if (createConv.success && createConv.data?.id) {
    conversationId = createConv.data.id;
    await testEndpoint('Get Conversation Messages', 'GET', `/api/conversations/${conversationId}/messages`);
  }

  // ==================== CHAT ====================
  log('\n🤖 CHAT SYSTEM', 'yellow');
  
  await testEndpoint('Send Message (Demo Mode)', 'POST', '/api/chat', {
    message: 'Hello from test',
    conversationId: conversationId,
    history: []
  });

  // ==================== FILE UPLOAD ====================
  log('\n📁 FILE MANAGEMENT', 'yellow');
  
  await testEndpoint('File Upload (needs multipart)', 'POST', '/api/upload', null);

  // ==================== MEMORY ====================
  log('\n🧠 MEMORY SYSTEM', 'yellow');
  
  await testEndpoint('Get Memory', 'GET', '/api/memory');
  await testEndpoint('Save Memory', 'POST', '/api/memory', { 
    key: 'test_key', 
    value: 'test_value',
    category: 'test' 
  });

  // ==================== WEBSITE DEPLOYMENT ====================
  log('\n🌐 WEBSITE DEPLOYMENT', 'yellow');
  
  await testEndpoint('List Deployed Websites', 'GET', '/api/deploy');
  const deploySite = await testEndpoint('Deploy Website', 'POST', '/api/deploy', {
    title: 'Test Site',
    prompt: 'Test deployment',
    html: '<html><body><h1>Test</h1></body></html>'
  });
  
  if (deploySite.success && deploySite.data?.slug) {
    await testEndpoint('Get Deployed Website', 'GET', `/api/deploy/${deploySite.data.slug}`);
    await testEndpoint('Delete Deployed Website', 'DELETE', `/api/deploy/${deploySite.data.slug}`);
  }

  // ==================== CHANNELS ====================
  log('\n📱 CHANNEL MANAGER', 'yellow');
  
  await testEndpoint('Channel Status', 'GET', '/api/channels/status');
  await testEndpoint('Channel Messages', 'GET', '/api/channels/messages');
  // Note: WhatsApp/Telegram/Discord init requires credentials

  // ==================== AGENTS ====================
  log('\n🤖 MULTI-AGENT SYSTEM', 'yellow');
  
  await testEndpoint('List Agents (25)', 'GET', '/api/agents');
  await testEndpoint('Agent Templates', 'GET', '/api/agents/templates');
  
  const assignTask = await testEndpoint('Assign Task to Agent', 'POST', '/api/agents/general/task', {
    task: 'Say hello',
    priority: 'normal'
  });
  
  if (assignTask.success && assignTask.data?.taskId) {
    await testEndpoint('Get Task Status', 'GET', `/api/agents/tasks/${assignTask.data.taskId}`);
  }

  // ==================== SUMMARY ====================
  log('\n' + '='.repeat(60), 'cyan');
  log('  TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n✅ PASSED: ${results.passed.length}`, 'green');
  log(`❌ FAILED: ${results.failed.length}`, 'red');
  log(`⏭️  SKIPPED: ${results.skipped.length}`, 'yellow');
  
  if (results.failed.length > 0) {
    log('\n❌ FAILED TESTS:', 'red');
    results.failed.forEach(test => {
      log(`   - ${test.name}: ${test.error}`, 'red');
    });
  }
  
  if (results.skipped.length > 0) {
    log('\n⏭️  SKIPPED TESTS (Backend not running):', 'yellow');
    results.skipped.forEach(test => {
      log(`   - ${test.name}`, 'yellow');
    });
  }
  
  log('\n' + '='.repeat(60) + '\n', 'cyan');
  
  // Return exit code
  if (results.failed.length > 0) {
    process.exit(1);
  }
  if (results.skipped.length > 0) {
    log('⚠️  Some tests skipped - Backend may not be running\n', 'yellow');
    process.exit(0);
  }
  log('🎉 All tests passed!\n', 'green');
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
