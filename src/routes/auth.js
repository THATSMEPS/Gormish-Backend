const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validation');
const { authenticateToken, tokenBlacklist } = require('../middleware/auth');

// Validation middleware
// const registerValidation = [
//   body('email').isEmail().normalizeEmail(),
//   body('password').isLength({ min: 6 }),
//   body('name').trim().notEmpty(),
//   body('role').optional().isIn(['customer', 'restaurant', 'delivery_partner']),
// ];

// const loginValidation = [
//   body('email').isEmail().normalizeEmail(),
//   body('password').notEmpty(),
// ];

const refreshTokenValidation = [
  body('refresh_token').notEmpty()
];


// Routes
router.post('/register', validate, authController.register);
// router.post('/login', loginValidation, validate, authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getCurrentUser);

router.post('/send-verification-email',
  body('email').isEmail().normalizeEmail(),
  validate,
  authController.sendVerificationEmail
);

router.post('/verify-otp',
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  validate,
  authController.verifyOtp
);

// Deprecated route for token verification
router.get('/verify-email', authController.verifyEmail);

router.get('/emailexist',
  authController.emailExist
);

// New route to check if phone number exists
router.get('/phoneexist',
  authController.phoneExist
);

router.post('/refresh-token',
  refreshTokenValidation,
  validate,
  (req, res) => res.status(501).json({ message: 'Refresh token not implemented' })
);

// New route to verify Firebase ID token for phone auth
router.post('/verify-firebase-token',
  body('idToken').notEmpty(),
  validate,
  authController.verifyFirebaseToken
);

module.exports = router;
