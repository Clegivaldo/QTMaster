import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useResponsive } from '@/hooks/useResponsive';
import clsx from 'clsx';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}) => {
  const { isMobile } = useResponsive();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    full: 'sm:max-w-full sm:m-4',
  };

  const modalClasses = clsx(
    // Base classes
    'relative bg-white shadow-xl transform transition-all',
    // Mobile: full screen bottom sheet
    isMobile ? [
      'w-full h-auto max-h-[90vh]',
      'rounded-t-lg',
      'animate-mobile-slide-up'
    ] : [
      // Desktop: centered modal
      'rounded-lg',
      'w-full',
      sizeClasses[size],
      'animate-mobile-fade-in'
    ],
    className
  );

  const containerClasses = clsx(
    'fixed inset-0 z-50 overflow-y-auto min-h-screen',
    isMobile ? 'flex items-end' : 'flex items-center justify-center p-4 min-h-screen'
  );

  const modalMarkup = (
    <div className={containerClasses}>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* Modal */}
      <div className={modalClasses}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            {title && (
              <h3 className="text-lg font-medium text-gray-900 truncate pr-4">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={clsx(
          'overflow-y-auto',
          isMobile ? 'max-h-[calc(90vh-4rem)]' : 'max-h-[calc(100vh-8rem)]'
        )}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render modal into document.body to avoid clipping when used inside transformed parents
  if (typeof document !== 'undefined') {
    return createPortal(modalMarkup, document.body);
  }

  return modalMarkup;
};

export default ResponsiveModal;