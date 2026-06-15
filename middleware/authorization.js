// middleware/authorization.js
import { verifyAuth } from '@/lib/auth';
import { hasRole } from '@/utils/permissions';

/**
 * Reusable backend middleware to restrict access to API Route Handlers.
 * @param {Function} handler Route handler callback function
 * @param {string[]} allowedRoles Array of roles authorized to hit the endpoint
 * @returns {Function} Protected route handler
 */
export function authorizeApi(handler, allowedRoles = []) {
  return async (req, ...args) => {
    const auth = verifyAuth(req);
    if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), {
        status: auth.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (allowedRoles.length > 0 && !hasRole(auth.user, allowedRoles)) {
      return new Response(JSON.stringify({ message: 'Forbidden: Insufficient privileges' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Attach verified user payload to request
    req.user = auth.user;
    return handler(req, ...args);
  };
}
