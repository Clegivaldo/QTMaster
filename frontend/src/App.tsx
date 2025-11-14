import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AvatarProvider } from '@/contexts/AvatarContext';
import { QueryProvider } from '@/contexts/QueryProvider';
import '@/styles/mobile.css';
import Layout from '@/components/Layout/Layout';
import LoginForm from '@/components/LoginForm';
import PrivateRoute from '@/components/PrivateRoute';
import LoadingSpinner from '@/components/LoadingSpinner';

// Lazy load pages for code splitting
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Clients = React.lazy(() => import('@/pages/Clients'));
const Sensors = React.lazy(() => import('@/pages/Sensors'));
const Suitcases = React.lazy(() => import('@/pages/Suitcases'));
const ImportData = React.lazy(() => import('@/pages/ImportData'));
const Validations = React.lazy(() => import('@/pages/Validations'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const Templates = React.lazy(() => import('@/pages/Templates'));
const EditorLayout = React.lazy(() => import('@/pages/EditorLayout'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const Unauthorized = React.lazy(() => import('@/pages/Unauthorized'));
const SharedReport = React.lazy(() => import('@/pages/SharedReport'));
const ReportDetails = React.lazy(() => import('@/pages/ReportDetails'));

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />} 
      />
      <Route 
        path="/unauthorized" 
        element={<Unauthorized />} 
      />
      
      {/* Public Routes */}
      <Route 
        path="/shared/:token" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <SharedReport />
          </Suspense>
        } 
      />
      
      {/* Editor Layout - Full screen, no sidebar/header */}
      <Route 
        path="/editor-layout" 
        element={
          <PrivateRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <EditorLayout />
            </Suspense>
          </PrivateRoute>
        } 
      />
      <Route 
        path="/editor-layout/:templateId" 
        element={
          <PrivateRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <EditorLayout />
            </Suspense>
          </PrivateRoute>
        } 
      />
      
      {/* Protected Routes - All wrapped with Layout */}
      <Route 
        path="/*" 
        element={
          <PrivateRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/sensors" element={<Sensors />} />
                  <Route path="/suitcases" element={<Suitcases />} />
                  <Route path="/import" element={<ImportData />} />
                  <Route path="/validations" element={<Validations />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/reports/:id" element={<ReportDetails />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route 
                    path="/settings" 
                    element={
                      <PrivateRoute requireAdmin>
                        <Settings />
                      </PrivateRoute>
                    } 
                  />
                </Routes>
              </Suspense>
            </Layout>
          </PrivateRoute>
        } 
      />
      
      <Route 
        path="*" 
        element={<Navigate to="/" replace />} 
      />
    </Routes>
  );
};

function App() {
  return (
    <QueryProvider>
      <Router>
        <AuthProvider>
          <AvatarProvider>
            <AppRoutes />
          </AvatarProvider>
        </AuthProvider>
      </Router>
    </QueryProvider>
  );
}

export default App;