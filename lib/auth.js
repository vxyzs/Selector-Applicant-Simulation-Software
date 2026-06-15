// lib/auth.js
import jwt from 'jsonwebtoken';
import { config } from './config';

export function verifyAuth(req, allowedRoles = []) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Unauthorized: Missing or invalid token format', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return { user: null, error: 'Unauthorized: Empty token provided', status: 401 };
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    if (!decoded || !decoded._id) {
      return { user: null, error: 'Unauthorized: Invalid token payload', status: 401 };
    }

    // Read-only enforcement for demo account (john@nexus.com)
    if (decoded.email && decoded.email.toLowerCase() === 'john@nexus.com') {
      const method = (req && typeof req.method === 'string') ? req.method.toUpperCase() : '';
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        return { user: null, error: 'Forbidden: Demo account is in read-only mode and cannot perform modifications.', status: 403 };
      }
    }

    // AI question generation restriction for demo expert account (test@nexus.com / text@nexus.com)
    if (decoded.email && (decoded.email.toLowerCase() === 'test@nexus.com' || decoded.email.toLowerCase() === 'text@nexus.com')) {
      const url = req && typeof req.url === 'string' ? req.url.toLowerCase() : '';
      if (url.includes('/api/generatequestion') || url.includes('/api/generatequestions')) {
        return { user: null, error: 'Forbidden: Demo expert account is restricted from generating AI questions.', status: 403 };
      }
    }

    // Role validation
    if (allowedRoles.length > 0) {
      const userRole = decoded.role ? decoded.role.toLowerCase() : '';
      const hasAllowedRole = allowedRoles.some(role => role.toLowerCase() === userRole);
      
      if (!hasAllowedRole) {
        return { user: null, error: 'Forbidden: Insufficient privileges', status: 403 };
      }
    }

    return { user: decoded, error: null };
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    const message = error.name === 'TokenExpiredError' ? 'Unauthorized: Token expired' : 'Unauthorized: Invalid token';
    return { user: null, error: message, status: 401 };
  }
}
