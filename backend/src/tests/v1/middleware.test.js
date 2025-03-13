import jwt from 'jsonwebtoken';
import authMiddleware from '../../middleware/authMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(() => {
  process.env.JWT_SECRET = 'your_secret_key';
});

describe('authMiddleware', () => {
  const validToken = jwt.sign({ userId: 123 }, 'your_secret_key', { expiresIn: '1h' });
  const expiredToken = jwt.sign({ userId: 123 }, 'your_secret_key', { expiresIn: '-1s' });
  const invalidToken = 'invalid.token.string';

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis(); // Allows chaining (e.g., res.status().json())
    res.json = jest.fn();
    return res;
  };

  test('should return 401 if token is missing', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401); // Check status
    expect(res.json).toHaveBeenCalledWith({ error: 'Token is required' }); // Check error message
    expect(next).not.toHaveBeenCalled(); // next() should not be called
  });

  test('should return decoded payload for a valid token', () => {
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(req.user).toHaveProperty('userId', 123); // User info should be attached
    expect(next).toHaveBeenCalledTimes(1); // next() should be called
    expect(res.status).not.toHaveBeenCalled(); // No error response
    expect(res.json).not.toHaveBeenCalled(); // No error message
  });

  test('should return 401 if token is expired', () => {
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401); // Check status
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' }); // Check error message
    expect(next).not.toHaveBeenCalled(); // next() should not be called
  });

  test('should return 401 if token is invalid', () => {
    const req = { headers: { authorization: `Bearer ${invalidToken}` } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401); // Check status
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' }); // Check error message
    expect(next).not.toHaveBeenCalled(); // next() should not be called
  });

  test('should return 401 for unexpected verification errors', () => {
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const res = mockRes();
    const next = jest.fn();

    jest.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('Unknown error'); });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401); // Check status
    expect(res.json).toHaveBeenCalledWith({ error: 'Token verification failed' }); // Check error message
    expect(next).not.toHaveBeenCalled(); // next() should not be called

    jwt.verify.mockRestore(); // Restore original implementation
  });
});
