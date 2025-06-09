import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, InputAdornment, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../services/api';
import Swal from 'sweetalert2';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from 'lodash';

// Definimos estilos personalizados para los botones
const BootstrapButton = styled(Button)(({ theme, color }) => ({
  boxShadow: 'none',
  textTransform: 'none',
  fontSize: 16,
  padding: '6px 12px',
  border: '1px solid',
  lineHeight: 1.5,
  backgroundColor:
    color === 'primary' ? '#0063cc' :
      color === 'secondary' ? '#dc3545' :
        color === 'success' ? '#28a745' : '#0063cc',
  borderColor:
    color === 'primary' ? '#0063cc' :
      color === 'secondary' ? '#dc3545' :
        color === 'success' ? '#28a745' : '#0063cc',
  color: '#ffffff',
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  '&:hover': {
    backgroundColor:
      color === 'primary' ? '#0069d9' :
        color === 'secondary' ? '#c82333' :
          color === 'success' ? '#218838' : '#0069d9',
    borderColor:
      color === 'primary' ? '#0062cc' :
        color === 'secondary' ? '#bd2130' :
          color === 'success' ? '#1e7e34' : '#0062cc',
    boxShadow: 'none',
  },
  '&:active': {
    boxShadow: 'none',
    backgroundColor:
      color === 'primary' ? '#0062cc' :
        color === 'secondary' ? '#bd2130' :
          color === 'success' ? '#1e7e34' : '#0062cc',
    borderColor:
      color === 'primary' ? '#005cbf' :
        color === 'secondary' ? '#b21f2d' :
          color === 'success' ? '#1c7e30' : '#005cbf',
  },
  '&:focus': {
    boxShadow: `0 0 0 0.2rem ${color === 'primary' ? 'rgba(0,123,255,.5)' :
      color === 'secondary' ? 'rgba(220,53,69,.5)' :
        color === 'success' ? 'rgba(40,167,69,.5)' : 'rgba(0,123,255,.5)'
      }`,
  },
}));

const DialogButton = styled(Button)(({ theme, color }) => ({
  textTransform: 'none',
  padding: '6px 16px',
  borderRadius: '4px',
  fontWeight: 'bold',
  color: theme.palette.getContrastText(theme.palette.primary.main),
  backgroundColor: color === 'primary' ? theme.palette.primary.main : theme.palette.secondary.main,
  '&:hover': {
    backgroundColor: color === 'primary' ? theme.palette.primary.dark : theme.palette.secondary.dark,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    cursor: 'pointer',
  },
  '&:focus': {
    backgroundColor: theme.palette.action.selected,
    outline: 'none',
  },
}));

const Usuarios = () => {
  const nombreInputRef = useRef(null);

  const [usuarios, setUsuarios] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState({
    nombre: '', email: '', usuario: '', apellido: '', dni: '',
    id_cargo: '', id_area: '', telefono: '', direccion: '', fecha_nacimiento: '', estado: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [nombreError, setNombreError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [usuarioError, setUsuarioError] = useState(false);
  const [apellidoError, setApellidoError] = useState(false);
  const [dniError, setDniError] = useState(false);
  const [cargoError, setCargoError] = useState(false);
  const [areaError, setAreaError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filters, setFilters] = useState({
    filtro: '',
    nombre: '',
    email: '',
    cargo: '',
    area: ''
  });

  const showSweetAlert = (options) => {
    return Swal.fire({
      ...options,
      customClass: {
        container: 'my-swal'
      }
    });
  };

  const showErrorAlert = useCallback((message) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  }, []);

  const fetchPaginatedUsuarios = useCallback(async (currentFilters, currentPagination) => {
    setIsLoading(true);
    try {
      const response = await api.get('/usuarios', {
        params: {
          page: currentPagination.pageIndex + 1,
          limit: currentPagination.pageSize,
          nombre: currentFilters.nombre,
          email: currentFilters.email,
          cargo: currentFilters.cargo,
          area: currentFilters.area,
          filtro: currentFilters.filtro,
        },
      });
      if (response.data && response.data.usuarios) {
        setUsuarios(response.data.usuarios);
        setTotalCount(response.data.totalUsuarios);
      } else {
        console.error('Unexpected response format:', response.data);
        showErrorAlert('Formato de respuesta inesperado del servidor.');
      }
    } catch (error) {
      console.error('Error fetching usuarios:', error);
      showErrorAlert('Error al cargar los usuarios. Por favor, intente de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [showErrorAlert]);

  const fetchCargos = useCallback(async () => {
    try {
      const response = await api.get('/cargos');
      if (response.data && response.data.cargos) {
        setCargos(response.data.cargos);
      }
    } catch (error) {
      console.error('Error fetching cargos:', error);
    }
  }, []);

  const fetchAreas = useCallback(async () => {
    try {
      const response = await api.get('/areas');
      if (response.data && response.data.areas) {
        setAreas(response.data.areas);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  }, []);

  useEffect(() => {
    fetchCargos();
    fetchAreas();
  }, [fetchCargos, fetchAreas]);

  const debouncedFetchUsuarios = useRef(
    debounce((newFilters, newPagination) => {
      fetchPaginatedUsuarios(newFilters, newPagination);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedFetchUsuarios(filters, pagination);
  }, [filters, pagination, debouncedFetchUsuarios]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (nombreInputRef.current) {
          nombreInputRef.current.focus();
        }
      }, 0);
    }
  }, [open]);

  const handleOpen = () => {
    setCurrentUsuario({
      nombre: '', email: '', usuario: '', apellido: '', dni: '',
      id_cargo: '', id_area: '', telefono: '', direccion: '', fecha_nacimiento: '', estado: ''
    });
    setIsEditing(false);
    setOpen(true);
    setNombreError(false);
    setEmailError(false);
    setUsuarioError(false);
    setApellidoError(false);
    setDniError(false);
    setCargoError(false);
    setAreaError(false);
  };

  const handleClose = () => {
    setOpen(false);
    setNombreError(false);
    setEmailError(false);
    setUsuarioError(false);
    setApellidoError(false);
    setDniError(false);
    setCargoError(false);
    setAreaError(false);
  };

  const handleInputChange = (e) => {
    setCurrentUsuario({ ...currentUsuario, [e.target.name]: e.target.value });
    if (e.target.name === 'nombre') {
      setNombreError(false);
    }
    if (e.target.name === 'email') {
      setEmailError(false);
    }
    if (e.target.name === 'usuario') {
      setUsuarioError(false);
    }
    if (e.target.name === 'apellido') {
      setApellidoError(false);
    }
    if (e.target.name === 'dni') {
      setDniError(false);
    }
    if (e.target.name === 'id_cargo') {
      setCargoError(false);
    }
    if (e.target.name === 'id_area') {
      setAreaError(false);
    }
  };

  const verifyUsuario = async (usuario, email) => {
    try {
        // Use GET request with path parameters
        const response = await api.get(`/usuarios/verificar/${usuario}/${email}`);
        const { existe, tipo } = response.data; // Assuming the API returns 'existe' and 'tipo'
        return { existe, tipo };
    } catch (error) {
        console.error('Error verifying usuario:', error);
        showErrorAlert('Error al verificar el usuario. Por favor, intente de nuevo más tarde.');
        return { existe: true, tipo: null }; // Assume user exists if there's an error
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let hasError = false;

    // Ensure all fields are strings before trimming
    const usuarioData = {
        ...currentUsuario,
        nombre: currentUsuario.nombre || '',
        email: currentUsuario.email || '',
        usuario: currentUsuario.usuario || '',
        apellido: currentUsuario.apellido || '',
        dni: currentUsuario.dni || '',
        id_cargo: currentUsuario.id_cargo || '',
        id_area: currentUsuario.id_area || '',
    };

    if (!usuarioData.nombre.trim()) {
        setNombreError(true);
        hasError = true;
    }
    if (!usuarioData.email.trim()) {
        setEmailError(true);
        hasError = true;
    }
    if (!usuarioData.usuario.trim()) {
        setUsuarioError(true);
        hasError = true;
    }
    if (!usuarioData.apellido.trim()) {
        setApellidoError(true);
        hasError = true;
    }
    if (!usuarioData.dni.trim()) {
        setDniError(true);
        hasError = true;
    }
    if (!usuarioData.id_cargo) {
        setCargoError(true);
        hasError = true;
    }
    if (!usuarioData.id_area) {
        setAreaError(true);
        hasError = true;
    }

    if (hasError) {
        showErrorAlert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    // Only verify if the user or email already exists when creating a new user
    if (!isEditing) {
        const { existe, tipo } = await verifyUsuario(usuarioData.usuario, usuarioData.email);
        if (existe) {
            const errorMessage = tipo === 'usuario' ? 'El nombre de usuario ya está en uso.' : 'El correo electrónico ya está en uso.';
            showErrorAlert(errorMessage);
            return;
        }
    }

    const usuarioEnMayusculas = {
        ...usuarioData,
        nombre: usuarioData.nombre.trim().toUpperCase(),
        apellido: usuarioData.apellido.trim().toUpperCase(),
        direccion: usuarioData.direccion.trim().toUpperCase(),
    };

    // Check for changes when editing
    if (isEditing) {
        const originalUsuario = usuarios.find(u => u.id === usuarioEnMayusculas.id);
        if (JSON.stringify(originalUsuario) === JSON.stringify(usuarioEnMayusculas)) {
            showSweetAlert({
                icon: 'info',
                title: 'Sin cambios',
                text: 'No se han realizado cambios en el usuario.',
                timer: 2500,
                timerProgressBar: true,
                showConfirmButton: false
            });
            handleClose();
            return;
        }
    }

    try {
        let response;
        if (isEditing) {
            response = await api.put(`/usuarios/${usuarioEnMayusculas.id}`, usuarioEnMayusculas);
        } else {
            response = await api.post('/usuarios/registro', usuarioEnMayusculas);
        }

        if (response.status === 200 || response.status === 201) {
            fetchPaginatedUsuarios(filters, pagination);
            handleClose();
            showSweetAlert({
                icon: 'success',
                title: 'Éxito',
                text: isEditing ? 'Usuario actualizado correctamente' : 'Usuario agregado correctamente',
                timer: 2500,
                timerProgressBar: true,
                showConfirmButton: false
            });
        } else {
            throw new Error(response.data.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) {
        console.error('Error submitting usuario:', error);
        let errorMessage = 'Error al procesar la solicitud. Por favor, intente de nuevo.';
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
            errorMessage = error.response.data.mensaje || errorMessage;
        } else if (error.request) {
            console.error('Error request:', error.request);
            errorMessage = 'No se recibió respuesta del servidor. Por favor, verifique su conexión.';
        } else {
            console.error('Error message:', error.message);
        }
        showSweetAlert({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }
  };

  const handleEdit = (usuario) => {
    setCurrentUsuario(usuario);
    setIsEditing(true);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const result = await showSweetAlert({
        title: '¿Está seguro?',
        text: "No podrá revertir esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        await api.delete(`/usuarios/${id}`);
        fetchPaginatedUsuarios(filters, pagination);

        showSweetAlert({
          icon: 'success',
          title: 'Eliminado',
          text: 'El usuario ha sido eliminado.',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error deleting usuario:', error);
      let errorMessage = 'Error al procesar la solicitud. Por favor, intente de nuevo.';
      showSweetAlert({
        icon: 'error',
        title: 'Error',
        text: "No se pudo eliminar el usuario. " + errorMessage,
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
  };

  const handleResetPassword = async (id) => {
    try {
      const result = await showSweetAlert({
        title: '¿Restablecer contraseña?',
        text: "La contraseña será restablecida al valor por defecto.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, restablecer',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        await api.patch(`/usuarios/${id}/reset-password`);
        showSweetAlert({
          icon: 'success',
          title: 'Contraseña Restablecida',
          text: 'La contraseña ha sido restablecida al valor por defecto.',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      let errorMessage = 'Error al restablecer la contraseña. Por favor, intente de nuevo.';
      showSweetAlert({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPagination(old => ({ ...old, pageIndex: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPagination({ pageIndex: 0, pageSize: newPageSize });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div>
      <h2>Gestión de Usuarios</h2>
      <BootstrapButton variant="contained" color="primary" onClick={handleOpen} style={{ marginBottom: '1rem' }}>
        Agregar Nuevo Usuario
      </BootstrapButton>

      <TextField
        name="filtro"
        value={filters.filtro}
        onChange={handleFilterChange}
        placeholder="Buscar en todos los campos"
        variant="outlined"
        size="small"
        style={{ marginBottom: '1rem', marginRight: '1rem' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>
                Nombre
                <TextField
                  name="nombre"
                  value={filters.nombre}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por nombre"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Email
                <TextField
                  name="email"
                  value={filters.email}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por email"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Cargo
                <TextField
                  name="cargo"
                  value={filters.cargo}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por cargo"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Área
                <TextField
                  name="area"
                  value={filters.area}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por área"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Cargando...</TableCell>
              </TableRow>
            ) : usuarios.length > 0 ? (
              usuarios.map((usuario, index) => (
                <StyledTableRow
                  key={usuario.id}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEdit(usuario);
                    }
                  }}
                >
                  <TableCell>{pagination.pageIndex * pagination.pageSize + index + 1}</TableCell>
                  <TableCell>{usuario.nombre || ''}</TableCell>
                  <TableCell>{usuario.email || ''}</TableCell>
                  <TableCell>{cargos.find(cargo => cargo.id === usuario.id_cargo)?.nombre || ''}</TableCell>
                  <TableCell>{areas.find(area => area.id === usuario.id_area)?.nombre || ''}</TableCell>
                  <TableCell align="right">
                    <BootstrapButton
                      color="success"
                      onClick={() => handleEdit(usuario)}
                      style={{ marginRight: '8px', padding: '4px 8px' }}
                      size="small"
                    >
                      Editar
                    </BootstrapButton>
                    <BootstrapButton
                      color="secondary"
                      onClick={() => handleDelete(usuario.id)}
                      style={{ marginRight: '8px', padding: '4px 8px' }}
                      size="small"
                    >
                      Eliminar
                    </BootstrapButton>
                    <BootstrapButton
                      color="info"
                      onClick={() => handleResetPassword(usuario.id)}
                      style={{ padding: '4px 8px' }}
                      size="small"
                    >
                      Restablecer Contraseña
                    </BootstrapButton>
                  </TableCell>
                </StyledTableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay usuarios disponibles</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={pagination.pageIndex}
        onPageChange={handleChangePage}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
        labelRowsPerPage="Filas por página:"
      />

      <Dialog 
        open={open} 
        onClose={handleClose}
        aria-labelledby="dialog-title"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle id="dialog-title">{isEditing ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}</DialogTitle>
          <DialogContent>
            {errorMessage && (
              <div style={{ color: 'red', marginBottom: '10px' }}>
                {errorMessage}
              </div>
            )}
            <TextField
              autoFocus
              margin="dense"
              name="nombre"
              label="Nombre"
              type="text"
              fullWidth
              value={currentUsuario.nombre}
              onChange={handleInputChange}
              inputRef={nombreInputRef}
              error={nombreError}
              helperText={nombreError ? "El nombre es requerido" : ""}
            />
            <TextField
              margin="dense"
              name="email"
              label="Email"
              type="email"
              fullWidth
              value={currentUsuario.email}
              onChange={handleInputChange}
              error={emailError}
              helperText={emailError ? "El email es requerido" : ""}
              disabled={isEditing} // Disable when editing
            />
            <TextField
              margin="dense"
              name="apellido"
              label="Apellido"
              type="text"
              fullWidth
              value={currentUsuario.apellido}
              onChange={handleInputChange}
              error={apellidoError}
              helperText={apellidoError ? "El apellido es requerido" : ""}
            />
            <TextField
              margin="dense"
              name="dni"
              label="DNI"
              type="text"
              fullWidth
              value={currentUsuario.dni}
              onChange={handleInputChange}
              error={dniError}
              helperText={dniError ? "El DNI es requerido" : ""}
            />
            <FormControl fullWidth margin="dense" error={cargoError}>
              <InputLabel id="cargo-label">Cargo</InputLabel>
              <Select
                labelId="cargo-label"
                id="id_cargo"
                name="id_cargo"
                value={currentUsuario.id_cargo}
                onChange={handleInputChange}
                label="Cargo"
              >
                {cargos.map(cargo => (
                  <MenuItem key={cargo.id} value={cargo.id}>
                    {cargo.nombre}
                  </MenuItem>
                ))}
              </Select>
              {cargoError && <div style={{ color: 'red', marginTop: '4px' }}>El cargo es requerido</div>}
            </FormControl>
            <FormControl fullWidth margin="dense" error={areaError}>
              <InputLabel id="area-label">Área</InputLabel>
              <Select
                labelId="area-label"
                id="id_area"
                name="id_area"
                value={currentUsuario.id_area}
                onChange={handleInputChange}
                label="Área"
              >
                {areas.map(area => (
                  <MenuItem key={area.id} value={area.id}>
                    {area.nombre}
                  </MenuItem>
                ))}
              </Select>
              {areaError && <div style={{ color: 'red', marginTop: '4px' }}>El área es requerida</div>}
            </FormControl>
            <TextField
              margin="dense"
              name="telefono"
              label="Teléfono"
              type="text"
              fullWidth
              value={currentUsuario.telefono}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="direccion"
              label="Dirección"
              type="text"
              fullWidth
              value={currentUsuario.direccion}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="fecha_nacimiento"
              label="Fecha de Nacimiento"
              type="date"
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              value={currentUsuario.fecha_nacimiento}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="usuario"
              label="Usuario"
              type="text"
              fullWidth
              value={currentUsuario.usuario}
              onChange={handleInputChange}
              error={usuarioError}
              helperText={usuarioError ? "El usuario es requerido" : ""}
              disabled={isEditing} // Disable when editing
            />
            {/* Agrega más campos según sea necesario */}
          </DialogContent>
          <DialogActions>
            <DialogButton onClick={handleClose} color="secondary">
              Cancelar
            </DialogButton>
            <DialogButton type="submit" color="primary">
              {isEditing ? 'Actualizar' : 'Agregar'}
            </DialogButton>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export default Usuarios;