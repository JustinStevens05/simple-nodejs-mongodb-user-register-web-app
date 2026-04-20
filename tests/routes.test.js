const request = require('supertest');
const express = require('express');
const session = require('express-session');
const path = require('path');

// Mock multer BEFORE requiring the routes
jest.mock('multer', () => {
    const multer = () => ({
        single: () => (req, res, next) => {
            // Mocking req.file behavior
            if (req.body.name === 'NoImage') {
                req.file = undefined;
            } else {
                req.file = { filename: 'test_image.png' };
            }
            next();
        }
    });
    multer.diskStorage = jest.fn().mockImplementation(() => ({}));
    return multer;
});

// Mock the User model
jest.mock('../models/users');
const User = require('../models/users');
const router = require('../routes/routes');

describe('User Registration Route - POST /add', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.urlencoded({ extended: false }));
        app.use(express.json());
        app.use(session({
            secret: 'test secret',
            resave: false,
            saveUninitialized: true
        }));
        
        // Mock session message exposure (similar to main.js)
        app.use((req, res, next) => {
            res.locals.message = req.session.message;
            next();
        });

        app.use('/', router);
        
        jest.clearAllMocks();
    });

    test('Case 1: Primary Success Scenario (New user created)', async () => {
        // Mock User.save to succeed
        User.prototype.save = jest.fn().mockResolvedValue({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            image: 'test_image.png'
        });

        const response = await request(app)
            .post('/add')
            .send('name=John Doe&email=john@example.com&phone=1234567890');

        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/');
        expect(User).toHaveBeenCalledWith(expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890'
        }));
        // Note: supertest doesn't easily persist session across redirects in a single call without a cookie jar
        // But we can check that User.prototype.save was called
        expect(User.prototype.save).toHaveBeenCalled();
    });

    test('Case 2: Edge Case (Missing required fields)', async () => {
        // Mock User.save to throw a validation error (if mongoose validation fails)
        User.prototype.save = jest.fn().mockRejectedValue(new Error('User validation failed: name: Path `name` is required.'));

        const response = await request(app)
            .post('/add')
            .send('email=missingname@example.com&phone=1234567890');

        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/');
        expect(User.prototype.save).toHaveBeenCalled();
    });

    test('Case 3: Edge Case (User already exists / Database error)', async () => {
        // Mock User.save to throw a duplicate key error
        User.prototype.save = jest.fn().mockRejectedValue(new Error('E11000 duplicate key error collection'));

        const response = await request(app)
            .post('/add')
            .send('name=Duplicate&email=duplicate@example.com&phone=1234567890');

        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/');
        expect(User.prototype.save).toHaveBeenCalled();
    });

    test('Case 4: No image provided (Defaults to user_unknown.png)', async () => {
        User.prototype.save = jest.fn().mockResolvedValue({});

        const response = await request(app)
            .post('/add')
            .send('name=NoImage&email=noimage@example.com&phone=0000000000');

        expect(response.status).toBe(302);
        expect(User).toHaveBeenCalledWith(expect.objectContaining({
            image: 'user_unknown.png'
        }));
    });
});
