const twilio = require('twilio');

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACccbb61439d008997e00841088cff3864';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

if (!TWILIO_AUTH_TOKEN) {
  console.error('TWILIO_AUTH_TOKEN is required. Please add it to your environment variables.');
}

if (!TWILIO_PHONE_NUMBER) {
  console.error('TWILIO_PHONE_NUMBER is required. Please add it to your environment variables.');
}

// Initialize Twilio client
let twilioClient = null;

const initializeTwilio = () => {
  try {
    if (!TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio Auth Token is missing');
    }
    
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('[Twilio] Twilio client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('[Twilio] Failed to initialize Twilio client:', error.message);
    throw error;
  }
};

const getTwilioClient = () => {
  if (!twilioClient) {
    return initializeTwilio();
  }
  return twilioClient;
};

module.exports = {
  getTwilioClient,
  initializeTwilio,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER
};
