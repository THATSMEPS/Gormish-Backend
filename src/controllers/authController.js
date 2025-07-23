const supabase = require('../config/supabase');
const prisma = require('../config/prisma');
const { OAuth2Client } = require('google-auth-library');
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require('../utils/responseHandler');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const tokenStore = require('../utils/tokenStore');
const twilioSMSService = require('../services/twilioSMSService');
const path = require('path');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const config = require('../config/environment');

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// In-memory store for phone OTPs (consider using Redis for production)
const phoneOtpStore = new Map();

const register = async (req, res) => {
  try {
    const { email, password, name, phone = '' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });

    if (existingUser) {
      return errorResponse(res, 'User already exists with this email', 400);
    }

    /*
    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return errorResponse(res, authError.message, 400);
    }
    */

    const user = await prisma.customer.create({
      data: {
        email,
        name,
        phone
      }
    });

    return successResponse(res, {
      user,
      // token: authData.session?.access_token
    }, 'Registration successful', 201);
  } catch (error) {
    return errorResponse(res, 'Error during registration', 500, error);
  }
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const otpStore = new Map(); // Simple in-memory store for OTPs, consider persistent store for production

const sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Email is required', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });
    if (existingUser) {
      return errorResponse(res, 'Email is already verified and registered', 400);
    }

    // Generate OTP
    const otp = generateOtp();

    // Store OTP with expiration (e.g., 10 minutes)
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    // Send email using nodemailer
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure, // true for 465, false for other ports
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    });

    const mailOptions = {
      from: config.smtpFrom,
      to: email,
      subject: 'Your Email Verification Code',
      html: `<p>Your verification code is: <strong>${otp}</strong></p>
             <p>This code will expire in 10 minutes.</p>`
    };

    await transporter.sendMail(mailOptions);

    return successResponse(res, null, 'Verification email sent with OTP');
  } catch (error) {
    console.error('Error sending verification email:', error);
    return errorResponse(res, 'Error sending verification email', 500, error);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return errorResponse(res, 'Email and OTP are required', 400);
    }

    const record = otpStore.get(email);
    if (!record) {
      return errorResponse(res, 'OTP not found or expired', 400);
    }

    if (record.expiresAt < Date.now()) {
      otpStore.delete(email);
      return errorResponse(res, 'OTP expired', 400);
    }

    if (record.otp !== otp) {
      return errorResponse(res, 'Invalid OTP', 400);
    }

    // OTP is valid, remove it
    otpStore.delete(email);

    // Check if user already exists (email verified)
    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });
    if (existingUser) {
      return errorResponse(res, 'Email is already verified', 400);
    }

    // Mark email as verified by allowing registration (frontend flow)
    // Here we just return success
    return successResponse(res, null, 'Email verified successfully');
  } catch (error) {
    return errorResponse(res, 'Error verifying OTP', 500, error);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return errorResponse(res, 'Verification token is required', 400);
    }

    // Validate token
    const validation = tokenStore.validateToken(token);
    if (!validation.valid) {
      return errorResponse(res, validation.reason, 400);
    }

    const email = validation.email;

    // Check if user already exists (email verified)
    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });
    if (existingUser) {
      tokenStore.invalidateToken(token);
      return errorResponse(res, 'Email is already verified', 400);
    }

    // Mark email as verified by allowing registration (frontend flow)
    // Here we just invalidate the token and return success
    tokenStore.invalidateToken(token);

    return successResponse(res, null, 'Email verified successfully');
  } catch (error) {
    return errorResponse(res, 'Error verifying email', 500, error);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    /*
    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return errorResponse(res, 'Invalid credentials', 401);
    }
    */

    // Get user profile
    const user = await prisma.customer.findUnique({
      where: { email }
    });

    if (!user) {
      return errorResponse(res, 'User profile not found', 404);
    }

    return successResponse(res, {
      user,
      /*
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at
      }
      */
    }, 'Login successful');
  } catch (error) {
    return errorResponse(res, 'Error during login', 500, error);
  }
};

const logout = async (req, res) => {
  try {
    /*
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return errorResponse(res, 'Error during logout', 400);
    }
    */

    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, 'Error during logout', 500, error);
  }
};

const getCurrentUser = async (req, res) => {
  try {
    /*
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return errorResponse(res, 'Not authenticated', 401);
    }
    */

    const user = await prisma.customer.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return errorResponse(res, 'User profile not found', 404);
    }

    return successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving user', 500, error);
  }
};

const refreshToken = async (req, res) => {
  try {
    
    const { refresh_token } = req.body;

    const { data: { session }, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    return successResponse(res, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at
    }, 'Token refreshed successfully');
    
    return errorResponse(res, 'Refresh token not implemented', 501);
  } catch (error) {
    return errorResponse(res, 'Error refreshing token', 500, error);
  }
};

const emailExist = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return errorResponse(res, 'Email query parameter is required', 400);
    }

    const existingUser = await prisma.customer.findUnique({
      where: { email }
    });

    return successResponse(res, { email_exist: !!existingUser });
  } catch (error) {
    return errorResponse(res, 'Error checking email existence', 500, error);
  }
};

// New controller to check if phone number exists
const phoneExist = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return errorResponse(res, 'Phone query parameter is required', 400);
    }
    const existingUser = await prisma.customer.findUnique({
      where: { phone: phone }
    });

    return successResponse(res, { phone_exist: !!existingUser });
  } catch (error) {
    console.error('Error checking phone existence:', error);
    return errorResponse(res, 'Error checking phone existence', 500, error);
  }
};

// Send OTP to phone number using Twilio
const sendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return errorResponse(res, 'Phone number is required', 400);
    }

    // Validate phone number format
    if (!twilioSMSService.isValidPhoneNumber(phone)) {
      return errorResponse(res, 'Invalid phone number format', 400);
    }

    // Format phone number
    const formattedPhone = twilioSMSService.formatPhoneNumber(phone);

    // Generate OTP
    const otp = generateOtp();

    // Store OTP with expiration (10 minutes)
    phoneOtpStore.set(formattedPhone, { 
      otp, 
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });

    // Send OTP via Twilio
    await twilioSMSService.sendOTP(formattedPhone, otp);

    return successResponse(res, { 
      phone: formattedPhone 
    }, 'OTP sent successfully to your phone');

  } catch (error) {
    console.error('Error sending phone OTP:', error);
    return errorResponse(res, 'Failed to send OTP', 500, error);
  }
};

// Verify phone OTP and authenticate user
const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return errorResponse(res, 'Phone number and OTP are required', 400);
    }

    // Format phone number
    const formattedPhone = twilioSMSService.formatPhoneNumber(phone);

    // Get stored OTP
    const record = phoneOtpStore.get(formattedPhone);
    if (!record) {
      return errorResponse(res, 'OTP not found or expired', 400);
    }

    // Check expiration
    if (record.expiresAt < Date.now()) {
      phoneOtpStore.delete(formattedPhone);
      return errorResponse(res, 'OTP expired', 400);
    }

    // Check attempt limit (max 3 attempts)
    if (record.attempts >= 3) {
      phoneOtpStore.delete(formattedPhone);
      return errorResponse(res, 'Too many failed attempts. Please request a new OTP', 400);
    }

    // Verify OTP
    if (record.otp !== otp) {
      record.attempts += 1;
      phoneOtpStore.set(formattedPhone, record);
      return errorResponse(res, 'Invalid OTP', 400);
    }

    // OTP is valid, remove it
    phoneOtpStore.delete(formattedPhone);

    // Check if user exists
    let user = await prisma.customer.findUnique({
      where: { phone: formattedPhone }
    });

    // If user does not exist, create new user with phone number only
    if (!user) {
      user = await prisma.customer.create({
        data: {
          phone: formattedPhone,
          name: '', // Name can be updated later
          email: '', // Email can be updated later
        }
      });
    }

    // Generate JWT token for session
    const accessToken = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return successResponse(res, {
      user,
      session: {
        authToken: accessToken,
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
      }
    }, 'Phone number verified and user authenticated');

  } catch (error) {
    console.error('Error verifying phone OTP:', error);
    return errorResponse(res, 'Error verifying OTP', 500, error);
  }
};

module.exports = {
  register,
  sendVerificationEmail,
  verifyEmail,
  login,
  logout,
  getCurrentUser,
  // googleSignIn,
  refreshToken,
  verifyOtp,
  emailExist,
  phoneExist,
  sendPhoneOTP,
  verifyPhoneOTP
};

