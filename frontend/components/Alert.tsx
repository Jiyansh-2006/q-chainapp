import React from 'react';

interface AlertProps {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
    const styles = {
        success: 'bg-green-500/10 border-green-500/30 text-green-400',
        error: 'bg-red-500/10 border-red-500/30 text-red-400',
        info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
    };

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    return (
        <div className={`${styles[type]} border rounded-lg p-4 flex items-center justify-between`}>
            <div className="flex items-center space-x-3">
                <span>{icons[type]}</span>
                <span>{message}</span>
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white ml-4"
                >
                    ✕
                </button>
            )}
        </div>
    );
};

export default Alert;