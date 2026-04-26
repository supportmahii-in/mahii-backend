const http = require('http');

function testShopOwnerLogin() {
  console.log('🧪 Testing Shop Owner Login...');

  const postData = JSON.stringify({
    email: 'testshop2@mahii.com',
    password: 'Test@123456',
    role: 'shopowner'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
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

        if (res.statusCode === 200 && jsonData.success) {
          console.log('✅ Shop owner login successful!');
          console.log('🔑 Token received:', jsonData.token ? 'Yes' : 'No');
          console.log('👤 User:', jsonData.user.name, '-', jsonData.user.role);
        } else if (res.statusCode === 403) {
          console.log('⚠️  Login blocked - awaiting admin approval (expected)');
        } else {
          console.log('❌ Login failed');
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

testShopOwnerLogin();