import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

const Header: React.FC = () => {
    const { address, network, disconnectWallet } = useWallet();
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/transactions', label: 'Transactions' },
        { path: '/mint', label: 'Mint NFT' },
        { path: '/simulation', label: 'Simulation' },
    ];

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const getWalletLabel = () => {
        if (!address) return '';
        if (network?.chainId === 11155111) {
            return "Sepolia Wallet";
        }
        return "Connected Wallet";
    };

    return (
        <header className="bg-dark-card border-b border-dark-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">Q</span>
                        </div>
                        <span className="text-xl font-bold text-white">Q-Chain</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex space-x-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    location.pathname === item.path
                                        ? 'text-brand-primary bg-brand-primary/10'
                                        : 'text-slate-400 hover:text-white hover:bg-dark-bg'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Wallet Section */}
                    <div className="flex items-center space-x-4">
                        {address ? (
                            <div className="flex items-center space-x-3">
                                <div className="px-3 py-1.5 bg-dark-bg rounded-full border border-dark-border text-sm text-slate-300">
                                    <span className="mr-2 text-brand-primary">
                                        {getWalletLabel()}
                                    </span>
                                    {formatAddress(address)}
                                </div>

                                <button
                                    onClick={disconnectWallet}
                                    className="px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <span className="text-sm text-slate-400">
                                Connect Wallet to Begin
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
