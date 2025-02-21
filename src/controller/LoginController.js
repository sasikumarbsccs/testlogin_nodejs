import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Users from '../model/userModel.js';
import { generateToken } from '../utils/jwtToken.js';

const app = express();
const SECRET_KEY = 'User';
const LINK_EXPIRATION_TIME = 60 * 60 * 1000;
const PORT = process.env.PORT || 3000;

app.use(express.json());

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phoneNumber);
};

// User Login
export const userLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || (username && !(validateEmail(username) || validatePhoneNumber(username)))) {
            return res.status(400).json({ message: 'Username must be a valid email address or phone number' });
        }

        if (!password || password.length < 5) {
            return res.status(400).json({ message: 'Password must be at least 5 characters long' });
        }

        const user = await Users.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'Invalid User!' });
        }

        if (user.locked_date && user.locked_date > Date.now()) {
            return res.status(403).json({ message: 'Account is locked. Try again after some time!' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            user.attempt_login += 1;
            if (user.attempt_login >= 3) {
                user.locked_date = Date.now() + 15 * 60 * 1000; // Account locked for 15 minutes
            }
            await user.save();

            let message = "Invalid password!";
            if (user.attempt_login >= 3) {
                message = "Account locked due to too many failed login attempts. Try again after 15 minutes.";
            } else {
                message = `Invalid password! You have ${3 - user.attempt_login} attempt(s) left.`;
            }

            return res.status(401).json({ message });
        }

        if (user.active !== 1) {
            return res.status(400).json({ message: 'User is deactivated' });
        }

        user.attempt_login = 0;
        user.locked_date = undefined;
        await user.save();

        const payload = { id: user._id, username: user.username };
        const generate_token = await generatetoken(payload);

        return res.status(200).json({ message: 'Login successful', token: generate_token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Generate Token
const generatetoken = async (payload) => {
    try {
        const hashedToken = generateToken(payload);
        const linkExpiresAt = new Date(Date.now() + LINK_EXPIRATION_TIME);

        const user = await Users.findOne({ _id: payload.id });
        user.onetimelink_token = hashedToken;
        user.link_exprie = linkExpiresAt;
        await user.save();

        const jwtToken = jwt.sign({ username: payload.username, token: hashedToken }, SECRET_KEY, { expiresIn: LINK_EXPIRATION_TIME / 1000 });

        return jwtToken;
    } catch (error) {
        console.error("Error generating one-time link:", error);
        throw new Error("Error generating one-time link");
    }
};

// User Signup
export const userSignup = async (req, res) => {
    const { username, password } = req.body;

    // Validate username (email or phone)
    if (!username || (username && !(validateEmail(username) || validatePhoneNumber(username)))) {
        return res.status(400).json({ message: 'Username must be a valid email address or phone number' });
    }

    // Validate password (minimum 5 characters)
    if (!password || password.length < 5) {
        return res.status(400).json({ message: 'Password must be at least 5 characters long' });
    }

    // Check if the username already exists
    const existingUser = await Users.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    // Create a new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new Users({ username, password: hashedPassword });

    try {
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};