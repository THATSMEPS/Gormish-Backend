# Twilio SMS OTP Integration Documentation

## Overview
This document describes the Twilio SMS OTP integration that replaces Firebase phone authentication in the Gormish Backend application.

## Prerequisites
1. Twilio Account SID: **REQUIRED** - Get from Twilio Console  ✅
2. Twilio Auth Token: **REQUIRED** - Get from Twilio Console
3. Twilio Phone Number: **REQUIRED** - Purchase from Twilio Console

## Environment Variables
Add these to your `.env` file:

```env
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

## API Endpoints

### 1. Send Phone OTP
**Endpoint:** `POST /api/auth/send-phone-otp`

**Request Body:**
```json
{
  "phone": "+919876543210"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "phone": "+919876543210"
  },
  "message": "OTP sent successfully to your phone"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid phone number format",
  "error": "..."
}
```

### 2. Verify Phone OTP
**Endpoint:** `POST /api/auth/verify-phone-otp`

**Request Body:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "phone": "+919876543210",
      "name": "",
      "email": "",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "session": {
      "authToken": "jwt_token_here",
      "expires_at": 1640995200
    }
  },
  "message": "Phone number verified and user authenticated"
}
```

## Features

### Phone Number Formatting
- Automatically formats phone numbers to E.164 format
- Adds +91 country code for 10-digit Indian numbers
- Validates phone number format before sending

### OTP Security
- 6-digit OTP codes
- 10-minute expiration time
- Maximum 3 verification attempts per OTP
- Secure in-memory storage (consider Redis for production)

### User Management
- Creates new user automatically if phone number doesn't exist
- Returns existing user if phone number is already registered
- Generates JWT token with 7-day expiration

## Phone Number Format Examples
```
Input: "9876543210" → Output: "+919876543210"
Input: "+919876543210" → Output: "+919876543210"
Input: "919876543210" → Output: "+919876543210"
```

## Testing

### 1. Run Integration Test
```bash
node test-twilio-integration.js
```

### 2. Test API Endpoints
```bash
# Send OTP
curl -X POST http://localhost:3000/api/auth/send-phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456"}'
```

## Migration from Firebase

### What Changed:
1. **Removed:** Firebase Admin SDK dependency
2. **Removed:** `POST /api/auth/verify-firebase-token` endpoint
3. **Added:** Twilio SMS service
4. **Added:** `POST /api/auth/send-phone-otp` endpoint
5. **Added:** `POST /api/auth/verify-phone-otp` endpoint

### Frontend Changes Required:
```javascript
// OLD Firebase approach:
// 1. Initialize Firebase Auth
// 2. Send OTP via Firebase
// 3. Verify OTP via Firebase
// 4. Send Firebase ID token to backend

// NEW Twilio approach:
// 1. Send phone number to backend
// 2. User receives SMS OTP
// 3. Send phone + OTP to backend for verification
// 4. Receive JWT token directly
```

## Production Considerations

### Security:
- Use Redis instead of in-memory storage for OTP
- Implement rate limiting for OTP requests
- Add phone number blacklisting for abuse prevention
- Consider SMS cost optimization

### Monitoring:
- Track OTP delivery success rates
- Monitor SMS costs
- Log failed verification attempts

### Scaling:
- Use Redis cluster for OTP storage
- Implement SMS queuing for high volume
- Consider multiple Twilio numbers for better delivery

## Troubleshooting

### Common Issues:
1. **"Twilio Auth Token is missing"** - Add TWILIO_AUTH_TOKEN to .env
2. **"Twilio phone number not configured"** - Add TWILIO_PHONE_NUMBER to .env
3. **"Invalid phone number format"** - Ensure phone number includes country code
4. **SMS not delivered** - Check Twilio console for delivery status

### Debug Steps:
1. Verify Twilio credentials in console
2. Check phone number verification status
3. Review Twilio message logs
4. Test with verified phone numbers first

## Cost Estimation
- SMS cost varies by country (typically $0.01-0.10 per SMS)
- Consider implementing SMS cost tracking
- Use Twilio's bulk pricing for high volume

## Next Steps
1. ✅ Install Twilio SDK
2. ✅ Create Twilio configuration
3. ✅ Implement SMS service
4. ✅ Update auth controller
5. ✅ Update API routes
6. ⏳ Get Twilio Auth Token
7. ⏳ Get Twilio Phone Number
8. ⏳ Update .env configuration
9. ⏳ Test integration
10. ⏳ Update frontend code
