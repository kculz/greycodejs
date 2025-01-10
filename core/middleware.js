// core/middleware.js
const express = require('express');
const cors = require('cors')


// Default CORS options
const defaultCorsOptions = {
  origin: '*', // Allow all origins by default
};

// Dynamically configure CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || defaultCorsOptions.origin, // Read from env or use default
  methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow common HTTP methods
  credentials: process.env.CORS_CREDENTIALS === 'true' || false, // Allow credentials if set to 'true'
};


const applyMiddleware = (app) => {
  // Parse JSON requests
  app.use(express.json()); 
  // Parse form data
  app.use(express.urlencoded({ extended: true }));
  // Apply CORS middleware
  app.use(cors(corsOptions));
};

module.exports = applyMiddleware;
