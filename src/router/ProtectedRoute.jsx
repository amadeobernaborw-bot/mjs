import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner spinner--lg" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return children;
}
