import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './context/authStore';
import { UserRole } from './types';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { PageLoader } from './components/ui/Loader';

// Auth pages
import LoginPage from './pages/LoginPage';
import TrackPage from './pages/TrackPage';
import CollectorDashboard from './pages/collector/Dashboard';
import OfficerLeaderboard from './pages/admin/Leaderboard';
import RegisterPage from './pages/RegisterPage';

// Citizen pages
import CitizenDashboard from './pages/citizen/Dashboard';
import SubmitComplaintPage from './pages/citizen/SubmitComplaint';
import GrievanceDetailCitizen from './pages/citizen/GrievanceDetail';

// Officer pages
import OfficerDashboard from './pages/officer/Dashboard';
import OfficerGrievanceDetail from './pages/officer/GrievanceDetail';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminGrievanceList from './pages/admin/GrievanceList';

// Lazy-load heavier admin pages
const AdminAnalytics   = React.lazy(() => import('./pages/admin/Analytics'));
const AdminDepartments = React.lazy(() => import('./pages/admin/Departments'));
const AdminUsers       = React.lazy(() => import('./pages/admin/Users'));
const AdminAuditLog    = React.lazy(() => import('./pages/admin/AuditLog'));
const OfficerPerformance = React.lazy(() => import('./pages/officer/Performance'));

const CITIZEN_ROLES  = [UserRole.CITIZEN];
const OFFICER_ROLES  = [UserRole.OFFICER, UserRole.DEPT_HEAD];
const ADMIN_ROLES    = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

export default function App() {
  const { hydrate, isLoading } = useAuthStore();

  // Hydrate auth from localStorage on mount
  useEffect(() => { hydrate(); }, [hydrate]);

  if (isLoading) return <PageLoader />;

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' },
        }}
      />
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Citizen */}
          <Route path="/citizen">
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={CITIZEN_ROLES}><CitizenDashboard /></ProtectedRoute>
            } />
            <Route path="submit" element={
              <ProtectedRoute allowedRoles={CITIZEN_ROLES}><SubmitComplaintPage /></ProtectedRoute>
            } />
            <Route path="grievances/:id" element={
              <ProtectedRoute allowedRoles={CITIZEN_ROLES}><GrievanceDetailCitizen /></ProtectedRoute>
            } />
          </Route>

          {/* Officer */}
          <Route path="/officer">
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={OFFICER_ROLES}><OfficerDashboard /></ProtectedRoute>
            } />
            <Route path="grievances/:id" element={
              <ProtectedRoute allowedRoles={OFFICER_ROLES}><OfficerGrievanceDetail /></ProtectedRoute>
            } />
            <Route path="performance" element={
              <ProtectedRoute allowedRoles={OFFICER_ROLES}><OfficerPerformance /></ProtectedRoute>
            } />
          </Route>

          {/* Admin */}
          <Route path="/admin">
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="grievances" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminGrievanceList /></ProtectedRoute>
            } />
            <Route path="analytics" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminAnalytics /></ProtectedRoute>
            } />
            <Route path="departments" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminDepartments /></ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminUsers /></ProtectedRoute>
            } />
            <Route path="audit" element={
              <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminAuditLog /></ProtectedRoute>
            } />
          </Route>

          <Route path="/admin/leaderboard" element={<ProtectedRoute allowedRoles={['ADMIN','SUPER_ADMIN']}><OfficerLeaderboard /></ProtectedRoute>} />

          {/* Collector / Commissioner */}
          <Route path="/collector/dashboard" element={<ProtectedRoute><CollectorDashboard /></ProtectedRoute>} />

          {/* Public tracking — no auth required */}
          <Route path="/track/:ticketNumber" element={<TrackPage />} />
          <Route path="/track" element={<TrackPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}