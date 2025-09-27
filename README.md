TrustBridge Health – Backend
Secure telehealth backend built with Next.js 15 (App Router), Prisma, PostgreSQL, and JWT authentication.

Project Module Description
The project consists of several functional modules:

Authentication: Manages user registration, login, and 2FA.
File Management: Enables secure uploading, downloading, and sharing of medical files.
Role-Based Access Control (RBAC): Defines roles (Patient, Provider, Admin) with specific permissions.
Audit Logging: Maintains detailed logs of user actions for security and compliance.
*********************************************************************
Directory Tree
trustbridge-health-src/
├── 403
├── README.md
├── docker-compose.yml
├── middleware.ts
├── next-env.d.ts
├── package.json
├── pnpm-workspace.yaml
├── prisma
│ ├── migrations
│ ├── migration_lock.toml
│ ├── schema.prisma
│ └── seed.ts
├── src
│ ├── app
│ │ ├── admin
│ │ │ ├── users
│ │ │ └── audit-logs
│ │ ├── api
│ │ │ ├── admin
│ │ │ ├── auth
│ │ │ ├── files
│ │ │ └── me
│ │ └── layout.tsx
│ ├── lib
│ ├── scripts
│ └── tests
├── tsconfig.json
└── tsconfig.scripts.json
File Description Inventory
README.md: Documentation for the project.
docker-compose.yml: Configuration for Docker services.
middleware.ts: Middleware for authentication and role enforcement.
prisma/schema.prisma: Database schema definition using Prisma.
src/app/api/: Contains API route handlers for authentication, file management, and admin operations.
src/lib/: Contains utility functions for authentication, audit logging, and file management.
Technology Stack
Next.js 15: Framework for building the application.
TypeScript: Programming language for type safety.
Prisma: ORM for database management.
PostgreSQL: Database for storing application data.
Redis: Caching and rate-limiting.
JWT: Authentication method using JSON Web Tokens.
Usage
Installation
Install dependencies:
pnpm install
Start Services
Start Redis and PostgreSQL:
docker-compose up -d
Set Up Database
Generate Prisma client:
pnpm db:generate
Push schema to database:
pnpm db:push
Seed with test data:
pnpm db:seed
Start the application:
pnpm dev

****************************************************************************
Features
User Registration – /api/auth/register
User Login – /api/auth/login (returns JWT + HttpOnly cookie)
Logout – /api/auth/logout (clears cookie)
Current User – /api/me (protected)
Role-Based Access Control (RBAC) – USER & ADMIN roles
Admin Ping – /api/admin/ping (admin-only)
Middleware Guard – JWT required for all protected routes
Secure Cookies – httpOnly, sameSite=lax/strict, secure in prod
Rate Limiting – login attempts protected with Redis + rate-limiter-flexible
Tech Stack
Next.js 15 (App Router, API Routes, Middleware)
TypeScript
Prisma ORM + PostgreSQL
bcryptjs (password hashing)
jsonwebtoken (JWT auth)
rate-limiter-flexible + Redis (brute-force protection)
pino (logging, optional)
*************************************************************************
Environment Variables
Create a .env.local file:

# Local development environment variables
JWT_SECRET="mRCdPJHvLF+k9UEuszEtUzisxu1Xhf/Zhaf2vDz+Qrw="
REDIS_URL=redis://localhost:6379
RATE_LIMIT_DISABLED="true"
NEXT_PUBLIC_E2E=1
UPLOAD_BUCKET="dev-bucket"
DATABASE_URL="postgresql://postgres:password@localhost:5432/trustbridge_health"
AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="trustbridge-health-files"
NODE_ENV="development"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-nextauth-secret"
LOG_LEVEL="debug"

*******************************************************************************


# Admin → Users Dashboard (API checks & endpoints)

Ensure database is seeded:

if not (npm run db:seed)


Get your admin token (save this for all tests):
:: Admin login
curl -s -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@trustbridge.health\",\"password\":\"AdminPass123!\"}"

:: Copy the "token" value from the response and paste below
set eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWZ4eHZyYXgwMDAwb2RjZm84d3doNXpxIiwiZW1haWwiOiJhZG1pbkB0cnVzdGJyaWRnZS5oZWFsdGgiLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiQURNSU4iLCJ0d29GYWN0b3JFbmFibGVkIjpmYWxzZSwidHdvRmFjdG9yVmVyaWZpZWQiOnRydWUsImlhdCI6MTc1ODgwNjk2OSwiZXhwIjoxNzU5NDExNzY5fQ.TuC6-OkNW05g7kZtjyRb6QBnLKLOOML7xQRrKqRA5b8

:: List users
curl -s -X GET "http://localhost:3000/api/admin/users?page=1&pageSize=20&sort=createdAt&order=desc" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWZ4eHZyYXgwMDAwb2RjZm84d3doNXpxIiwiZW1haWwiOiJhZG1pbkB0cnVzdGJyaWRnZS5oZWFsdGgiLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiQURNSU4iLCJ0d29GYWN0b3JFbmFibGVkIjpmYWxzZSwidHdvRmFjdG9yVmVyaWZpZWQiOnRydWUsImlhdCI6MTc1ODgwNjk2OSwiZXhwIjoxNzU5NDExNzY5fQ.TuC6-OkNW05g7kZtjyRb6QBnLKLOOML7xQRrKqRA5b8"

:: Search
curl -s -X GET "http://localhost:3000/api/admin/users?q=basic&page=1&pageSize=20" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%"

:: Filter by role
curl -s -X GET "http://localhost:3000/api/admin/users?role=ADMIN" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWZ4eHZyYXgwMDAwb2RjZm84d3doNXpxIiwiZW1haWwiOiJhZG1pbkB0cnVzdGJyaWRnZS5oZWFsdGgiLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiQURNSU4iLCJ0d29GYWN0b3JFbmFibGVkIjpmYWxzZSwidHdvRmFjdG9yVmVyaWZpZWQiOnRydWUsImlhdCI6MTc1ODgwNjk2OSwiZXhwIjoxNzU5NDExNzY5fQ.TuC6-OkNW05g7kZtjyRb6QBnLKLOOML7xQRrKqRA5b8"

---

## ===== 3) Last-admin guard (legacy PATCH) =====
curl -i -s -X PATCH "http://localhost:3000/api/admin/users/<cmfxxvrax0000odcfo8wwh5zq>/role" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWZ4eHZyYXgwMDAwb2RjZm84d3doNXpxIiwiZW1haWwiOiJhZG1pbkB0cnVzdGJyaWRnZS5oZWFsdGgiLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiQURNSU4iLCJ0d29GYWN0b3JFbmFibGVkIjpmYWxzZSwidHdvRmFjdG9yVmVyaWZpZWQiOnRydWUsImlhdCI6MTc1ODgwNjk2OSwiZXhwIjoxNzU5NDExNzY5fQ.TuC6-OkNW05g7kZtjyRb6QBnLKLOOML7xQRrKqRA5b8" ^
  -d "{\"role\":\"USER\"}"
:: → Expect: 400 or 403 with {"error":"Cannot demote the last remaining admin"}

---

## ===== 4) Promote endpoint =====
:: Body:
:: { "userId": "string" }

curl -i -X POST http://localhost:3000/api/admin/promote ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWZ4eHZyYXgwMDAwb2RjZm84d3doNXpxIiwiZW1haWwiOiJhZG1pbkB0cnVzdGJyaWRnZS5oZWFsdGgiLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiQURNSU4iLCJ0d29GYWN0b3JFbmFibGVkIjpmYWxzZSwidHdvRmFjdG9yVmVyaWZpZWQiOnRydWUsImlhdCI6MTc1ODgwNjk2OSwiZXhwIjoxNzU5NDExNzY5fQ.TuC6-OkNW05g7kZtjyRb6QBnLKLOOML7xQRrKqRA5b8" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"cmfxxvs3n0001odcfl0zgbm5i\"}"

---

## ===== 5) Demote endpoint =====
curl -i -X POST http://localhost:3000/api/admin/demote ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWZ4eHZyYXgwMDAwb2RjZm84d3doNXpxIiwiZW1haWwiOiJhZG1pbkB0cnVzdGJyaWRnZS5oZWFsdGgiLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiQURNSU4iLCJ0d29GYWN0b3JFbmFibGVkIjpmYWxzZSwidHdvRmFjdG9yVmVyaWZpZWQiOnRydWUsImlhdCI6MTc1ODgyMzkwMSwiZXhwIjoxNzU5NDI4NzAxfQ.juyn04Ex6ncMhCQAjUb6_-2RtV2d0NRXsgu5H9lb_sU" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"cmfxxvs3n0001odcfl0zgbm5i\"}"


______________________________________________________________
_______________________                     __________ _____________-    ________________



🔐 TESTING 2FA ENDPOINTS
1. Enroll in 2FA (Get QR Code)
# Windows Command Prompt
curl -X POST http://localhost:3000/api/auth/totp/enroll -H "Authorization: Bearer YOUR_TOKEN"

# Linux/Mac/PowerShell
curl -X POST http://localhost:3000/api/auth/totp/enroll -H "Authorization: Bearer YOUR_TOKEN"
Expected Response:

{
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "secret": "JBSWY3DPEHPK3PXP",
  "backupCodes": ["123456", "789012", "345678", "901234", "567890"]
}
📱 To test QR code:

Copy the qrCodeUrl data URL
Paste it in your browser address bar to see the QR code image
Scan with Google Authenticator or Authy app
Note down the backup codes for testing
2. Verify 2FA Setup
# Windows Command Prompt (replace 123456 with code from your authenticator app)
curl -X POST http://localhost:3000/api/auth/totp/verify -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"totpCode\":\"123456\"}"

# Linux/Mac/PowerShell
curl -X POST http://localhost:3000/api/auth/totp/verify -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"totpCode":"123456"}'
Expected Response:

{
  "success": true,
  "message": "Two-factor authentication enabled successfully"
}
3. Test Login with 2FA (After enabling)
# Windows Command Prompt
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@trustbridge.health\",\"password\":\"AdminPass123!\",\"totpCode\":\"123456\"}"

# Linux/Mac/PowerShell
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@trustbridge.health","password":"AdminPass123!","totpCode":"123456"}'
4. Disable 2FA
# Windows Command Prompt
curl -X POST http://localhost:3000/api/auth/totp/disable -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"totpCode\":\"123456\"}"

# Linux/Mac/PowerShell
curl -X POST http://localhost:3000/api/auth/totp/disable -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"totpCode":"123456"}'
📁 TESTING FILE ENDPOINTS
1. Get Presigned Upload URL
# Windows Command Prompt
curl -X POST http://localhost:3000/api/files/presign-upload -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"filename\":\"test-document.pdf\",\"contentType\":\"application/pdf\",\"size\":1024000}"

# Linux/Mac/PowerShell
curl -X POST http://localhost:3000/api/files/presign-upload -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"filename":"test-document.pdf","contentType":"application/pdf","size":1024000}'
Expected Response:

{
  "uploadUrl": "https://s3.amazonaws.com/bucket/...",
  "fileId": "cm123abc456",
  "fields": {
    "key": "users/cm123/1234567890-test-document.pdf",
    "policy": "eyJleHBpcmF0aW9uIjoi..."
  }
}
2. Direct File Upload (Alternative)
Create a test file first:

# Create a test file
echo "This is a test document for TrustBridge Health" > test-file.txt
# Windows Command Prompt
curl -X POST http://localhost:3000/api/files/upload -H "Authorization: Bearer YOUR_TOKEN" -F "file=@test-file.txt"

# Linux/Mac/PowerShell
curl -X POST http://localhost:3000/api/files/upload -H "Authorization: Bearer YOUR_TOKEN" -F "file=@test-file.txt"
Expected Response:

{
  "file": {
    "id": "cm123abc456",
    "filename": "test-file.txt",
    "originalName": "test-file.txt",
    "size": 45,
    "mimeType": "text/plain",
    "objectKey": "users/cm123/1234567890-test-file.txt"
  }
}
3. Get Presigned Download URL
# Windows Command Prompt (replace FILE_ID with actual file ID from upload response)
curl -X POST http://localhost:3000/api/files/presign-download -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"fileId\":\"FILE_ID\"}"

# Linux/Mac/PowerShell
curl -X POST http://localhost:3000/api/files/presign-download -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"fileId":"FILE_ID"}'
Expected Response:

{
  "downloadUrl": "https://s3.amazonaws.com/bucket/users/cm123/1234567890-test-file.txt?X-Amz-Algorithm=...",
  "expiresIn": 3600
}
4. Share a File
First, get another user’s ID by listing users:

# Get user list to find someone to share with
curl -X GET http://localhost:3000/api/admin/users -H "Authorization: Bearer YOUR_TOKEN"
Then share the file:

# Windows Command Prompt (replace FILE_ID and GRANTEE_USER_ID)
curl -X POST http://localhost:3000/api/files/share -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"fileId\":\"FILE_ID\",\"granteeId\":\"GRANTEE_USER_ID\",\"canDownload\":true}"

# Linux/Mac/PowerShell
curl -X POST http://localhost:3000/api/files/share -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"fileId":"FILE_ID","granteeId":"GRANTEE_USER_ID","canDownload":true}'
Expected Response:

{
  "share": {
    "id": "cm456def789",
    "fileId": "cm123abc456",
    "granteeId": "cm789ghi012",
    "canDownload": true,
    "expiresAt": null
  }
}
5. Revoke File Share
# Windows Command Prompt (replace SHARE_ID with actual share ID)
curl -X DELETE http://localhost:3000/api/files/shares/SHARE_ID/revoke -H "Authorization: Bearer YOUR_TOKEN"

# Linux/Mac/PowerShell
curl -X DELETE http://localhost:3000/api/files/shares/SHARE_ID/revoke -H "Authorization: Bearer YOUR_TOKEN"
Expected Response:

{
  "success": true,
  "message": "Share revoked successfully"
}
🛡️ TESTING PROTECTED ROUTES
1. Get Current User Info
# Windows Command Prompt
curl -X GET http://localhost:3000/api/me -H "Authorization: Bearer YOUR_TOKEN"

# Linux/Mac/PowerShell
curl -X GET http://localhost:3000/api/me -H "Authorization: Bearer YOUR_TOKEN"
Expected Response:

{
  "user": {
    "id": "cm123abc456",
    "email": "admin@trustbridge.health",
    "name": "System Administrator",
    "role": "ADMIN",
    "twoFactorEnabled": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
2. Admin Ping (Health Check)
# Windows Command Prompt
curl -X GET http://localhost:3000/api/admin/ping -H "Authorization: Bearer YOUR_TOKEN"

# Linux/Mac/PowerShell
curl -X GET http://localhost:3000/api/admin/ping -H "Authorization: Bearer YOUR_TOKEN"
Expected Response:

{
  "message": "Hello, [logged in role]"
}
3. Test Unauthorized Access
# Test without token (should fail)
curl -X GET http://localhost:3000/api/me

# Test with invalid token (should fail)
curl -X GET http://localhost:3000/api/me -H "Authorization: Bearer invalid_token"
Expected Response (401 Unauthorized):

{
  "error": "Unauthorized"
}
🧪 TESTING ERROR SCENARIOS
1. Test Rate Limiting
# Make 6+ rapid login attempts to trigger rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"wrong@email.com","password":"wrongpass"}'
  echo "Attempt $i"
done
2. Test Account Lockout
# Make 5+ failed login attempts with correct email but wrong password
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@trustbridge.health","password":"wrongpassword"}'
  echo "Failed attempt $i"
done
3. Test File Upload Limits
# Create a large file (this should fail if size limits are enforced)
dd if=/dev/zero of=large-file.bin bs=1M count=100  # Creates 100MB file
curl -X POST http://localhost:3000/api/files/upload -H "Authorization: Bearer YOUR_TOKEN" -F "file=@large-file.bin"
📊 TESTING CHECKLIST
Mark each as ✅ when successfully tested:

Authentication & 2FA:

[ ] Login with correct credentials ✅ 
[ ] Login with wrong credentials (should fail) ✅ 
[ ] Enroll in 2FA (get QR code) ✅ 
[ ] Verify 2FA setup ✅ 
[ ] Login with 2FA code ✅ 
[ ] Login with wrong 2FA code (should fail) ✅ 
[ ] Disable 2FA ✅ 
File Management:

[ ] Get presigned upload URL ✅ 
[ ] Direct file upload ✅ 
[ ] Get presigned download URL ✅ 
[ ] Share file with another user ✅ 
[ ] Revoke file share ✅ 
[ ] Try to access file without permission (should fail) ✅ 
Protected Routes:

[ ] Get current user info (/api/me) ✅ 
[ ] Admin ping (/api/admin/ping) ✅ 
[ ] Access protected route without token (should fail) ✅ 
[ ] Access admin route as non-admin (should fail) ✅ 
Security Features:

[ ] Rate limiting (too many requests) ✅ 
[ ] Account lockout (failed login attempts) ✅ 
[ ] File size limits ✅ 
[ ] Invalid file types ✅ 



🚨 TROUBLESHOOTING
If S3 endpoints fail:

Check if AWS credentials are configured in .env.local
Verify S3 bucket exists and has correct permissions
If 2FA QR code doesn’t work:

Ensure the qrCodeUrl is a valid data URL starting with data:image/png;base64,
Try a different authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
If file uploads fail:

Check file permissions in your directory
Ensure the file exists before uploading
Verify Content-Type headers match the file type
If tokens expire:

Re-login to get a fresh token