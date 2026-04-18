import { Navigate } from 'react-router-dom';

/**
 * Decodes a JWT payload without verifying the signature.
 * Used client-side only to check expiry.
 */
const decodeJwtExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp; // Unix timestamp in seconds
  } catch {
    return null;
  }
};

/**
 * Returns true if a valid, non-expired token exists in localStorage.
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('auth_token');
  if (!token) return false;

  const exp = decodeJwtExpiry(token);
  if (!exp) return false;

  // exp is in seconds, Date.now() is in ms
  return Date.now() / 1000 < exp;
};

/**
 * ProtectedRoute — wraps workspace pages.
 * Redirects to /auth if the user is not authenticated.
 */
export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}
