// components/Card.tsx
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: React.ReactNode; // Can be string or ReactNode for icons
    subtitle?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle }) => {
    return (
        <div className={`bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg ${className}`}>
            {(title || subtitle) && (
                <div className="mb-6">
                    {title && (
                        typeof title === 'string' ? (
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                        ) : (
                            <div className="text-xl font-bold text-white">{title}</div>
                        )
                    )}
                    {subtitle && <p className="text-gray-400 mt-1 text-sm">{subtitle}</p>}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;