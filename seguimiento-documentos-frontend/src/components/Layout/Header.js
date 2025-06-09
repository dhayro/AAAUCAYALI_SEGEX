import React, { useEffect, useState, useRef } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { jwtDecode } from 'jwt-decode';
import api from '../../services/api';
import Swal from 'sweetalert2';

const Header = ({ handleDrawerToggle, onLogout }) => {
  const [userName, setUserName] = useState('');
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: ''
  });

  const currentPasswordRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUserName(decodedToken.nombre + ' ' + decodedToken.apellido || 'Usuario');
      } catch (error) {
        console.error('Error al decodificar el token:', error);
        setUserName('Usuario');
      }
    }
  }, []);

  useEffect(() => {
    // Aplicar estilos para SweetAlert
    const style = document.createElement('style');
    style.textContent = `
      .swal2-container {
        z-index: 2000 !important;
      }
    `;
    document.head.appendChild(style);

    // Limpiar el estilo cuando el componente se desmonte
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (openChangePassword) {
      setTimeout(() => {
        if (currentPasswordRef.current) {
          currentPasswordRef.current.focus();
        }
      }, 0);
    }
  }, [openChangePassword]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const response = await api.patch('/usuarios/cambiar-contrasena', passwordData);
      if (response.status === 200) {
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Contraseña cambiada correctamente',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false
        });
        setOpenChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '' }); // Limpiar el formulario
      } else {
        throw new Error(response.data.mensaje || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      let errorMessage = 'Error al cambiar la contraseña. Por favor, intente de nuevo.';
      if (error.response) {
        errorMessage = error.response.data.mensaje || errorMessage;
      }
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
  };

  const handleCloseChangePassword = () => {
    setOpenChangePassword(false);
    setPasswordData({ currentPassword: '', newPassword: '' }); // Limpiar el formulario
  };

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
        <Button color="inherit" onClick={() => setOpenChangePassword(true)}>
          Cambiar Contraseña
        </Button>
        <Button color="inherit" onClick={onLogout}>
          Cerrar Sesión
        </Button>
      </Toolbar>

      <Dialog
        open={openChangePassword}
        onClose={handleCloseChangePassword}
        aria-labelledby="change-password-dialog-title"
      >
        <form onSubmit={handleChangePassword}>
          <DialogTitle id="change-password-dialog-title">Cambiar Contraseña</DialogTitle>
          <DialogContent>
            <TextField
              inputRef={currentPasswordRef}
              margin="dense"
              name="currentPassword"
              label="Contraseña Actual"
              type="password"
              fullWidth
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
            <TextField
              margin="dense"
              name="newPassword"
              label="Nueva Contraseña"
              type="password"
              fullWidth
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseChangePassword} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" color="primary">
              Cambiar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </AppBar>
  );
};

export default Header;