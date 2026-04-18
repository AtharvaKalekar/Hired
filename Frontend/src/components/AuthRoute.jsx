import { Navigate } from 'react-router-dom';
import { isAuthenticated } from './ProtectedRoute';

/**
 * AuthRoute — wraps public pages (like Auth, Landing).
 * Redirects to /home if the user is ALREADY authenticated.
 */
export default function AuthRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }
  return children;
}
