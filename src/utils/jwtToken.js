import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
const secretKey = process.env.JWT_SECRET;

// generate a JWT
export const generateToken = (payload) => {
  return jwt.sign(payload, secretKey, { expiresIn: '1h' });
};

// verify a JWT
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, secretKey);
  } catch (err) {
    return null;
  }
};