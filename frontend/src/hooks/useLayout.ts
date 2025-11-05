import { useState, useEffect } from 'react';
import { useResponsive } from './useResponsive';

export const useLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile, isDesktop } = useResponsive();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  // Auto-close sidebar on mobile when switching to mobile view
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      closeSidebar();
    }
  }, [isMobile, sidebarOpen]);

  // Auto-open sidebar on desktop
  useEffect(() => {
    if (isDesktop && !sidebarOpen) {
      // Don't auto-open on desktop to respect user preference
      // setSidebarOpen(true);
    }
  }, [isDesktop]);

  return {
    sidebarOpen,
    isMobile,
    isDesktop,
    toggleSidebar,
    closeSidebar,
    openSidebar,
  };
};