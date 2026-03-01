// testZKP.js
const testZKP = async () => {
  try {
    console.log('1️⃣ Testing Health Check...');
    const healthRes = await fetch('http://localhost:8002/health');
    const health = await healthRes.json();
    console.log('✅ Health check:', health);

    console.log('\n2️⃣ Generating Wallet...');
    // CORRECTED URL - removed the extra 's'
    const walletRes = await fetch('http://localhost:8002/generate-wallet', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        security_level: "Kyber768",
        signature_level: "Dilithium2"
      })
    });

    if (!walletRes.ok) {
      const error = await walletRes.text();
      throw new Error(`Wallet generation failed: ${error}`);
    }

    const wallet = await walletRes.json();
    console.log('✅ Wallet created:', wallet);
    
    if (!wallet.wallet_id) {
      throw new Error('No wallet_id in response');
    }

    console.log('\n3️⃣ Testing Transaction Signing...');
    const now = Date.now();
    const payload = {
      wallet_id: wallet.wallet_id,
      transaction: {
        amount: 10,
        to: '0x1234567890123456789012345678901234567890',
        nonce: now,
        timestamp: new Date().toISOString()
      },
      algorithm: 'pqc',
      zkp: {
        enable: true,
        attributes: ["amount", "recipient", "nonce", "amount_gt_zero"],
        circuit_type: "merkle",
        public_inputs: {
          amount_gt_zero: true,
          amount: 10,
          recipient: '0x1234567890123456789012345678901234567890',
          nonce: now,
          timestamp: new Date().toISOString()
        }
      }
    };

    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

    const signRes = await fetch('http://localhost:8002/sign', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!signRes.ok) {
      const error = await signRes.json();
      console.error('❌ Signing failed:', JSON.stringify(error, null, 2));
    } else {
      const result = await signRes.json();
      console.log('✅ Signing successful:', result);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testZKP();