import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RegistrationForm from './components/RegistrationForm';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CheckInPage from './components/CheckInPage';
import StatisticsPage from './components/StatisticsPage';
import RankingPage from './components/RankingPage';
import './App.css';


// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    
    // Show loading while checking authentication
    if (isLoading) {
        return <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            fontSize: '18px',
            color: '#4A90E2'
        }}>Loading...</div>;
    }
    
    // Pass the intended destination in location state so Login can redirect back
    return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
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
            <Route
                path="/checkin"
                element={
                    <ProtectedRoute>
                        <CheckInPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/statistics"
                element={
                    <ProtectedRoute>
                        <StatisticsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/ranking"
                element={
                    <ProtectedRoute>
                        <RankingPage />
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
