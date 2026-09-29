import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly }) => {
    const { user } = useAuth();

    if (adminOnly && user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
