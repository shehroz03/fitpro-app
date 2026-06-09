const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'fitcore_dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const generateRefreshToken = (payload) =>
  jwt.sign({ ...payload, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET || 'fitcore_refresh_dev_secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET || 'fitcore_dev_secret');

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fitcore_refresh_dev_secret');

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
