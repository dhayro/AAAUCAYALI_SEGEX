import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { jwtDecode } from 'jwt-decode';

const Header = ({ handleDrawerToggle, onLogout }) => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        // console.log('Decoded token:', decodedToken);
        setUserName(decodedToken.nombre +' '+ decodedToken.apellido || 'Usuario');
      } catch (error) {
        console.error('Error al decodificar el token:', error);
        setUserName('Usuario');
      }
    }
  }, []);

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Sistema de Seguimiento de Documentos AAA HUALLAGA
        </Typography>
        <Typography variant="subtitle1" sx={{ mr: 2 }}>
          Bienvenido, {userName}
        </Typography>
        <Button color="inherit" onClick={onLogout}>
          Cerrar Sesión
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;