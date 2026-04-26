# Admin Setup API

This API provides a secure way to create the first admin user via HTTP request.

## ✅ Status: IMPLEMENTED & TESTED

- ✅ Controller function added to `authController.js`
- ✅ Route added to `authRoutes.js`
- ✅ Environment variable `ADMIN_SETUP_KEY` configured
- ✅ Security tested - invalid keys rejected
- ✅ Duplicate prevention tested - existing admin detected

## Endpoint

```
POST /api/auth/setup-admin
```

## Request Body

```json
{
  "secretKey": "mahii_admin_setup_secret_2024_secure_key",
  "name": "Super Admin",
  "email": "admin@mahii.com",
  "password": "Admin@123456"
}
```

## Security Features

- **Secret Key Protection**: Requires `ADMIN_SETUP_KEY` from environment variables
- **One-time Use**: Prevents creation if admin already exists
- **Input Validation**: Validates required fields and email format

## Usage Example

### Using curl:

```bash
curl -X POST http://localhost:5000/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "mahii_admin_setup_secret_2024_secure_key",
    "name": "Super Admin",
    "email": "admin@mahii.com",
    "password": "Admin@123456"
  }'
```

### Using JavaScript/fetch:

```javascript
fetch('http://localhost:5000/api/auth/setup-admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    secretKey: 'mahii_admin_setup_secret_2024_secure_key',
    name: 'Super Admin',
    email: 'admin@mahii.com',
    password: 'Admin@123456'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Response

### Success (201):

```json
{
  "success": true,
  "message": "Admin created successfully",
  "admin": {
    "id": "...",
    "name": "Super Admin",
    "email": "admin@mahii.com",
    "role": "admin"
  }
}
```

### Error Responses:

- **403 Forbidden**: Invalid secret key
- **400 Bad Request**: Admin already exists
- **500 Internal Server Error**: Server/database error

## Security Notes

- Change the `ADMIN_SETUP_KEY` in production
- This endpoint should be disabled/removed after initial setup
- Store the secret key securely and never commit to version control
- Consider adding IP restrictions for additional security

## Alternative Method

For direct database creation (already implemented), use:
```bash
cd server
node scripts/create-admin.js
```

## Test Results

✅ **Security Test**: Invalid secret key properly rejected (403)
✅ **Duplicate Prevention**: Existing admin detected (400)
✅ **Route Active**: Endpoint responding correctly