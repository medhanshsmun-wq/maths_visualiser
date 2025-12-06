/**
 * MathViz Backend Server
 * Express + MongoDB + Google OAuth
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const app = express();

// Models
const User = require('./models/User');
const Visualization = require('./models/Visualization');

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                picture: profile.photos[0]?.value || ''
            });
            console.log('New user created:', user.email);
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ============ AUTH ROUTES ============

// Start Google OAuth
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/failure' }),
    (req, res) => {
        // Generate JWT token
        const token = jwt.sign(
            { userId: req.user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
    }
);

// Auth failure
app.get('/auth/failure', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
});

// Get current user
app.get('/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-googleId');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ VISUALIZATION ROUTES ============

// Get all visualizations for user
app.get('/api/visualizations', authMiddleware, async (req, res) => {
    try {
        const visualizations = await Visualization.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(visualizations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch visualizations' });
    }
});

// Get single visualization
app.get('/api/visualizations/:id', authMiddleware, async (req, res) => {
    try {
        const viz = await Visualization.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!viz) {
            return res.status(404).json({ error: 'Visualization not found' });
        }

        res.json(viz);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch visualization' });
    }
});

// Save new visualization
app.post('/api/visualizations', authMiddleware, async (req, res) => {
    try {
        const { query, description, objects, explanation, animation, view } = req.body;

        const viz = await Visualization.create({
            userId: req.userId,
            query,
            description,
            objects,
            explanation,
            animation,
            view
        });

        res.status(201).json(viz);
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save visualization' });
    }
});

// Delete visualization
app.delete('/api/visualizations/:id', authMiddleware, async (req, res) => {
    try {
        const result = await Visualization.deleteOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Visualization not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete visualization' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
