import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken } from '../utils/auth';

export default function PrivateRouter({ redirectTo = '/login' }) {
  return getAccessToken() ? <Outlet /> : <Navigate to={redirectTo} replace />;
}
