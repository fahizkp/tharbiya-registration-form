import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RegistrationForm from './components/RegistrationForm';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/register" replace />} />
            <Route path="/register" element={<RegistrationForm />} />
            <Route path="/login" element={<Login />} />
            <Route 
                path="/admin" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
