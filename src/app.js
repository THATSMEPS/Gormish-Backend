const express = require('express');
const config = require('./config/environment');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');

const { AppError, handleValidationError, handleDuplicateFieldsDB, handleCastError } = require('./services/errorHandler');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const restaurantRoutes = require('./routes/restaurants');
const areaRoutes = require('./routes/areas');
const deliveryPartnerRoutes = require('./routes/delivery-partners');
const reviewRoutes = require('./routes/reviews');
const customerRoutes = require('./routes/customers');
const cuisineRoutes = require('./routes/cuisines');
const notificationRoutes = require('./routes/notificationRoutes');
// const customerNotificationRoutes = require('./routes/customerNotifications');

const app = express();

// Root route handler to redirect or inform about API base path
app.get('/', (req, res) => {
  res.redirect('/api');
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running',
    environment: config.environment,
    timestamp: new Date()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/delivery-partners', deliveryPartnerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/cuisines', cuisineRoutes);
app.use('/api/notifications', notificationRoutes);
// app.use('/api/customer-notifications', customerNotificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
  err.status = err.status || 'error';

  if (config.environment === 'development') {
    if (err.name === 'ValidationError') err = handleValidationError(err);
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === 'CastError') err = handleCastError(err);

    res.status(err.statusCode).json({
      success: false,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production
    if (err.isOperational) {
      res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        success: false,
        message: 'Something went wrong!'
      });
    }
  }
});

// Handle unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

module.exports = app;
