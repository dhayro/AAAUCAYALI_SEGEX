import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ user, children }) => {
  const location = useLocation();
  
  if (!user) {
    // Redirige al login si no hay usuario autenticado, guardando la ruta actual
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;