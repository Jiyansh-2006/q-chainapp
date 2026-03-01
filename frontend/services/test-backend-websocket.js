// test-backend-websocket.js
// Run this with Node.js: node test-backend-websocket.js

const WebSocket = require('ws');

console.log('🔌 Testing WebSocket connection to backend...');

const ws = new WebSocket('ws://localhost:8000/ws/transactions');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  console.log('📤 Sending ping...');
  
  // Send a ping
  ws.send(JSON.stringify({ type: 'ping' }));
  
  // Send a subscription
  setTimeout(() => {
    console.log('📤 Sending subscription...');
    ws.send(JSON.stringify({ 
      type: 'subscribe_transactions',
      client: 'test-script',
      timestamp: new Date().toISOString()
    }));
  }, 1000);
  
  // Send a test transaction
  setTimeout(() => {
    console.log('📤 Sending test transaction...');
    ws.send(JSON.stringify({ 
      type: 'new_transaction',
      amount: 100,
      sender: '0xtest',
      receiver: '0xtest2',
      timestamp: new Date().toISOString()
    }));
  }, 2000);
});

ws.on('message', function incoming(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📩 Received:', parsed);
  } catch (e) {
    console.log('📩 Received raw:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 WebSocket closed - Code: ${code}, Reason: ${reason || 'No reason'}`);
});

// Keep the script running
console.log('⏳ Waiting for WebSocket events... (Ctrl+C to exit)');

// Exit after 10 seconds
setTimeout(() => {
  console.log('⏰ Test complete, closing connection...');
  ws.close();
  process.exit(0);
}, 10000);