import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/hooks/useLayout';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import NotificationContainer from './NotificationContainer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { sidebarOpen, isMobile, toggleSidebar, closeSidebar, sidebarCollapsed, toggleCollapseSidebar } = useLayout();

  // Allow other parts of the app to toggle the main sidebar by dispatching
  // a custom event 'qt:toggle-sidebar' on window. Also listen for a collapse
  // event 'qt:toggle-collapse-sidebar' which will collapse/expand the sidebar
  // (icon-only mode).
  useEffect(() => {
    const onToggle = () => toggleSidebar();
    const onCollapse = () => toggleCollapseSidebar();
    window.addEventListener('qt:toggle-sidebar', onToggle as EventListener);
    window.addEventListener('qt:toggle-collapse-sidebar', onCollapse as EventListener);
    return () => {
      window.removeEventListener('qt:toggle-sidebar', onToggle as EventListener);
      window.removeEventListener('qt:toggle-collapse-sidebar', onCollapse as EventListener);
    };
  }, [toggleSidebar, toggleCollapseSidebar]);

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar} 
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main content area */}
  <div className={`flex-1 flex flex-col ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} h-full`}>
        {/* Header */}
        <Header 
          user={user}
          onMenuClick={toggleSidebar}
        />

        {/* Main content */}
        <main className="flex-1 py-4 sm:py-6 pb-20 lg:pb-6 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Footer - Hidden on mobile */}
        <div className="hidden lg:block mt-auto">
          <Footer />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMenuClick={toggleSidebar} />

      {/* collapse control moved to the global Header (no floating button here) */}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Notifications */}
      <NotificationContainer />
    </div>
  );
};

export default Layout;