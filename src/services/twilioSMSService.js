const { getTwilioClient, TWILIO_PHONE_NUMBER } = require('../config/twilio');

/**
 * Twilio SMS Service for OTP and notifications
 */
class TwilioSMSService {
  constructor() {
    this.client = null;
    this.fromNumber = TWILIO_PHONE_NUMBER;
  }

  /**
   * Initialize Twilio client
   */
  async initialize() {
    try {
      this.client = getTwilioClient();
      console.log('[TwilioSMSService] Service initialized successfully');
    } catch (error) {
      console.error('[TwilioSMSService] Failed to initialize:', error.message);
      throw error;
    }
  }

  /**
   * Send OTP via SMS
   * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
   * @param {string} otp - OTP code to send
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendOTP(phoneNumber, otp) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      if (!this.fromNumber) {
        throw new Error('Twilio phone number not configured');
      }

      // Format the phone number to ensure it includes country code
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const message = await this.client.messages.create({
        body: `Your Gormish verification code is: ${otp}. This code will expire in 10 minutes.`,
        from: this.fromNumber,
        to: formattedPhone
      });

      console.log(`[TwilioSMSService] OTP sent successfully to ${formattedPhone}. Message SID: ${message.sid}`);
      
      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
        phoneNumber: formattedPhone
      };
      
    } catch (error) {
      console.error('[TwilioSMSService] Failed to send OTP:', error.message);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  /**
   * Send general SMS
   * @param {string} phoneNumber - Phone number in E.164 format
   * @param {string} message - Message to send
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendSMS(phoneNumber, message) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      if (!this.fromNumber) {
        throw new Error('Twilio phone number not configured');
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const twilioMessage = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone
      });

      console.log(`[TwilioSMSService] SMS sent successfully to ${formattedPhone}. Message SID: ${twilioMessage.sid}`);
      
      return {
        success: true,
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
        phoneNumber: formattedPhone
      };
      
    } catch (error) {
      console.error('[TwilioSMSService] Failed to send SMS:', error.message);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it doesn't start with country code, assume it's Indian number and add +91
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Verify phone number format
   * @param {string} phoneNumber - Phone number to verify
   * @returns {boolean} - True if valid format
   */
  isValidPhoneNumber(phoneNumber) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const formatted = this.formatPhoneNumber(phoneNumber);
    return phoneRegex.test(formatted);
  }

  /**
   * Get message status
   * @param {string} messageSid - Twilio message SID
   * @returns {Promise<Object>} - Message status object
   */
  async getMessageStatus(messageSid) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      const message = await this.client.messages(messageSid).fetch();
      
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent
      };
      
    } catch (error) {
      console.error('[TwilioSMSService] Failed to get message status:', error.message);
      throw new Error(`Failed to get message status: ${error.message}`);
    }
  }
}

// Create singleton instance
const twilioSMSService = new TwilioSMSService();

module.exports = twilioSMSService;
