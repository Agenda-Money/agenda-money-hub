import { Navigate, Outlet } from 'react-router-dom';
import { useReportingAuthStore } from '../store/reportingAuth.store';

export function ReportingGuard() {
  const { isAuthed, role } = useReportingAuthStore();

  if (!isAuthed) {
    return <Navigate to="/reporting/login" replace />;
  }

  if (role !== 'reporting_viewer') {
    return <Navigate to="/reporting/login" replace />;
  }

  return <Outlet />;
}
