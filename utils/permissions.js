// utils/permissions.js
import { ROLES } from '../lib/roles';

/**
 * Checks if a user possesses one of the allowed roles (case-insensitive).
 * @param {Object} user 
 * @param {string[]} allowedRoles 
 * @returns {boolean}
 */
export function hasRole(user, allowedRoles) {
  if (!user || !user.role) return false;
  const userRole = user.role.toLowerCase();
  return allowedRoles.map(r => r.toLowerCase()).includes(userRole);
}

/**
 * Higher-order helper for shared permissions validation.
 * @param {string[]} allowedRoles 
 * @returns {(user: Object) => boolean}
 */
export function requireRoles(allowedRoles) {
  return (user) => hasRole(user, allowedRoles);
}

// Named specific role validation functions
export const requireHR = () => requireRoles([ROLES.hr]);
export const requireExpert = () => requireRoles([ROLES.expert]);
export const requireCandidate = () => requireRoles([ROLES.candidate]);
export const requireAdmin = () => requireRoles([ROLES.admin]);
