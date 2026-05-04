# Admin User Creation Script

This script creates an initial admin user for the Mahii application.

## Usage

Run this script once to create the admin user:

```bash
cd server
node scripts/create-admin.js
```

## Admin Credentials

After successful execution, you can login with:

- **Email:** admin@mahii.dev
- **Password:** NewAdmin@2026!

## Important Notes

- The script checks if an admin already exists before creating a new one
- Change the password after first login for security
- The admin user is automatically verified and approved
- This script should only be run once during initial setup

## Troubleshooting

If you encounter connection issues:
1. Ensure MongoDB Atlas cluster is running
2. Check network connectivity
3. Verify MONGODB_URI in .env file
4. Make sure the server has proper permissions for the database