import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import Login from './components/Auth/Login';
import Cargos from './components/Cargos';
import Areas from './components/Areas';
import ProtectedRoute from './components/ProtectedRoute';
import api from './services/api';
import './globalStyles.css';

const drawerWidth = 240;

const App = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Hacer una llamada a la API para verificar el token
          const response = await api.get('/usuarios/verify-token');
          setUser(response.data); // Asumiendo que la API devuelve los datos del usuario
        } catch (error) {
          console.error('Token inválido o expirado:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogin = (userData) => {
    localStorage.setItem('token', userData.token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      {user && (
        <Header 
          handleDrawerToggle={handleDrawerToggle}
          onLogout={handleLogout}
        />
      )}
      <Box sx={{ display: 'flex', flex: 1 }}>
        {user && (
          <Sidebar
            mobileOpen={mobileOpen}
            handleDrawerToggle={handleDrawerToggle}
            drawerWidth={drawerWidth}
          />
        )}
        <Box
          component="main"
          sx={{ 
            flexGrow: 1, 
            p: 3, 
            width: user ? { sm: `calc(100% - ${drawerWidth}px)` } : '100%',
            marginTop: user ? '64px' : 0
          }}
        >
          <Routes>
            <Route path="/login" element={
              user ? <Navigate to={location.state?.from || "/dashboard"} replace /> : <Login onLogin={handleLogin} />
            } />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cargos"
              element={
                <ProtectedRoute user={user}>
                  <Cargos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/areas"
              element={
                <ProtectedRoute user={user}>
                  <Areas />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={
              user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            } />
            <Route path="*" element={
              user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            } />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

const AppWrapper = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default AppWrapper;