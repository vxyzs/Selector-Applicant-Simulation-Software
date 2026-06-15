// lib/roles.js

/**
 * @typedef {'candidate' | 'expert' | 'hr'} UserRole
 */

/**
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {UserRole} role
 * @property {string} [organization]
 * @property {Date} [createdAt]
 */

/**
 * @typedef {Object} JWTPayload
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {UserRole} role
 * @property {string} [organization]
 */

export const ROLES = {
  candidate: 'candidate',
  expert: 'expert',
  hr: 'hr',
  admin: 'admin'
};
