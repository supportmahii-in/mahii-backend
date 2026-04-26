const http = require('http');

function testAdminSetup() {
  console.log('🧪 Testing Admin Setup API...');

  const postData = JSON.stringify({
    secretKey: 'wrong_secret_key',
    name: 'Test Admin',
    email: 'testadmin@mahii.com',
    password: 'Test@123456'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/setup-admin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log('📊 Response Status:', res.statusCode);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('📄 Response Data:', JSON.stringify(jsonData, null, 2));

        if (res.statusCode === 403 && jsonData.message.includes('Invalid setup key')) {
          console.log('✅ Security working - Invalid secret key rejected');
        } else {
          console.log('❌ Unexpected response for invalid key');
        }
      } catch (e) {
        console.log('📄 Raw Response:', data);
        console.log('❌ Failed to parse JSON response');
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request failed:', e.message);
  });

  req.write(postData);
  req.end();
}

testAdminSetup();