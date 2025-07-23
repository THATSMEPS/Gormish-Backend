# Firebase FCM Integration - Backend Deployment Guide

## Overview
This guide covers the complete backend setup for Firebase Cloud Messaging (FCM) integration for restaurant notifications in the Gormish application.

## Prerequisites
1. Firebase project with FCM enabled
2. Firebase Admin SDK service account key
3. Database with updated schema
4. Node.js environment with all dependencies installed

## Setup Steps

### 1. Firebase Configuration
Create a Firebase service account:
1. Go to Firebase Console → Project Settings → Service accounts
2. Click "Generate new private key"
3. Download the JSON file or copy the credentials

Set up environment variables:
```bash
# Option 1: JSON string in environment variable (recommended for production)
FIREBASE_CREDENTIALS='{"type":"service_account",...}'

# Option 2: Path to credentials file (for development)
# FIREBASE_CREDENTIALS_PATH="./firebasecreds.json"
```

### 2. Database Migration
Apply the schema changes:
```bash
# Generate Prisma client
npx prisma generate

# Apply database migrations (when DATABASE_URL is configured)
npx prisma migrate dev --name "add-fcm-support"
```

### 3. Environment Variables
Update your `.env` file:
```bash
DATABASE_URL="your-database-url"
FIREBASE_CREDENTIALS="your-firebase-credentials-json"
API_BASE_URL="http://localhost:3000/api"
```

### 4. New API Endpoints
The following endpoints are now available:

#### Restaurant FCM Token Management
- `PATCH /api/notifications/restaurants/storeFCMToken` - Store FCM token
- `DELETE /api/notifications/restaurants/removeFCMToken` - Remove FCM token
- `GET /api/notifications/restaurants/:id/settings` - Get notification settings

#### Testing
- `POST /api/notifications/restaurants/test` - Send test notification

### 5. Database Schema Changes
New tables added:
- `RestaurantFCMToken` - Multiple FCM token support per restaurant
- `NotificationLog` - Analytics and delivery tracking

Updated tables:
- `Restaurant` - Added `fcmToken` field for primary token storage

## API Usage Examples

### Store FCM Token
```javascript
POST /api/notifications/restaurants/storeFCMToken
{
  "restaurantId": "restaurant-id",
  "fcmToken": "fcm-token-from-frontend"
}
```

### Send Test Notification
```javascript
POST /api/notifications/restaurants/test
{
  "restaurantId": "restaurant-id",
  "title": "Test Notification",
  "body": "This is a test message"
}
```

### Get Notification Settings
```javascript
GET /api/notifications/restaurants/{restaurantId}/settings
```

## Integration Points

### Order Creation Flow
When a new order is created, the system automatically:
1. Sends FCM notification to the restaurant using multicast messaging
2. Handles token validation and cleanup
3. Logs notification delivery status

### Frontend Integration
The frontend should:
1. Initialize Firebase SDK with the same project configuration
2. Request notification permission from users
3. Generate FCM tokens and send to backend via `/storeFCMToken` endpoint
4. Handle token refresh and update backend accordingly

## Error Handling
The system handles:
- Invalid or expired FCM tokens (automatic cleanup)
- Firebase service unavailability (graceful degradation)
- Missing environment configuration (detailed error messages)
- Database connection issues (proper error responses)

## Monitoring and Analytics
- All notifications are logged in `NotificationLog` table
- Delivery status and error messages are tracked
- Failed token deliveries trigger automatic token cleanup

## Security Considerations
- FCM tokens are stored securely in the database
- Firebase Admin SDK uses service account authentication
- All API endpoints follow existing authentication patterns
- Sensitive credentials are environment-variable based

## Testing Checklist
- [ ] Firebase credentials are properly configured
- [ ] Database schema is migrated successfully
- [ ] FCM token storage and retrieval works
- [ ] Test notifications are delivered successfully
- [ ] Order creation triggers restaurant notifications
- [ ] Token cleanup works for invalid tokens
- [ ] Error handling provides meaningful responses

## Troubleshooting

### Common Issues
1. **"Firebase app not initialized"**
   - Check FIREBASE_CREDENTIALS environment variable
   - Ensure credentials JSON is valid

2. **"FCM token invalid"**
   - Token may be expired or from different Firebase project
   - Check frontend Firebase configuration matches backend

3. **Database errors**
   - Ensure Prisma client is generated after schema changes
   - Check DATABASE_URL configuration

### Debug Endpoints
Use the test notification endpoint to verify setup:
```bash
curl -X POST http://localhost:3000/api/notifications/restaurants/test \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"test-id","title":"Debug Test"}'
```

## Performance Considerations
- FCM supports up to 500 tokens per multicast message
- Token validation is handled asynchronously
- Database queries are optimized with proper indexing
- Failed tokens are cleaned up automatically to maintain performance

## Future Enhancements
- Notification scheduling and queuing
- Advanced analytics and reporting
- Push notification campaigns
- A/B testing for notification content
