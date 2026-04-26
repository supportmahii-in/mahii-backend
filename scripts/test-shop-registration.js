const http = require('http');

function testShopOwnerRegistration() {
  console.log('🧪 Testing Shop Owner Registration API...');

  const postData = JSON.stringify({
    name: 'Test Shop Owner',
    email: 'testshop2@mahii.com',
    phone: '9999999993',
    password: 'Test@123456',
    shopName: 'Test Restaurant',
    shopCategory: 'hotel',
    shopAddress: '123 Test Street, Test Area, Test City',
    fssaiLicense: 'TEST123456',
    bankDetails: {
      accountNumber: '1234567890',
      ifscCode: 'TEST0001',
      upiId: 'test@upi'
    }
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/shopowner/register',
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

        if (res.statusCode === 201 && jsonData.success) {
          console.log('✅ Shop owner registration successful!');
          console.log('👤 User ID:', jsonData.user.id);
          console.log('🏪 Shop ID:', jsonData.shop.id);
        } else {
          console.log('❌ Registration failed');
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

testShopOwnerRegistration();