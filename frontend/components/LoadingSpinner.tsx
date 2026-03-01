// components/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        xs: 'w-4 h-4',
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const borderSizes = {
        xs: 'border-2',
        sm: 'border-2',
        md: 'border-2',
        lg: 'border-3',
        xl: 'border-4'
    };

    return (
        <div className={`inline-block ${sizeClasses[size]} ${className}`}>
            <div className={`animate-spin rounded-full ${borderSizes[size]} border-solid border-current border-r-transparent h-full w-full`}>
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    );
};

export default LoadingSpinner;