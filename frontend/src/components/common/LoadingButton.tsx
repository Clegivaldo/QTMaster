import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
    loading: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
    loadingText?: string;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger';
}

export const LoadingButton: React.FC<Props> = ({
    loading,
    onClick,
    children,
    disabled,
    className = '',
    loadingText,
    type = 'button',
    variant = 'primary'
}) => {
    const baseClasses = 'flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600',
        secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white',
        danger: 'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={loading || disabled}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading && loadingText ? loadingText : children}
        </button>
    );
};

export default LoadingButton;
