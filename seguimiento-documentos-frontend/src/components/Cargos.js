import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, InputAdornment
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
        color === 'success' ? '#28a745' : '#0063cc', // Color verde para "success"
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
          color === 'success' ? '#218838' : '#0069d9', // Color verde más oscuro para hover
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

// Añade esto justo después de la definición de BootstrapButton
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

// Nuevo estilo para las filas de la tabla
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

const isEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

const Cargos = () => {
  const nombreInputRef = useRef(null);

  const [cargos, setCargos] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentCargo, setCurrentCargo] = useState({ nombre: '', descripcion: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [nombreError, setNombreError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filters, setFilters] = useState({
    filtro: '',
    nombre: '',
    descripcion: ''
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

  const fetchPaginatedCargos = useCallback(async (currentFilters, currentPagination) => {
    console.log('Fetching with filters:', currentFilters, 'and pagination:', currentPagination);
    setIsLoading(true);
    try {
      const response = await api.get('/cargos', {
        params: {
          page: currentPagination.pageIndex + 1,
          limit: currentPagination.pageSize,
          nombre: currentFilters.nombre,
          descripcion: currentFilters.descripcion,
          filtro: currentFilters.filtro,
        },
      });
      if (response.data && response.data.cargos) {
        setCargos(response.data.cargos);
        setTotalCount(response.data.totalCargos);
      } else {
        console.error('Unexpected response format:', response.data);
        showErrorAlert('Formato de respuesta inesperado del servidor.');
      }
    } catch (error) {
      console.error('Error fetching cargos:', error);
      showErrorAlert('Error al cargar los cargos. Por favor, intente de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [showErrorAlert]);

  const debouncedFetchCargos = useRef(
    debounce((newFilters, newPagination) => {
      fetchPaginatedCargos(newFilters, newPagination);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedFetchCargos(filters, pagination);
  }, [filters, pagination, debouncedFetchCargos]);

  useEffect(() => {
    if (open) {
      // Usamos setTimeout para asegurarnos de que el modal esté completamente renderizado
      setTimeout(() => {
        if (nombreInputRef.current) {
          nombreInputRef.current.focus();
        }
      }, 0);
    }
  }, [open]);

  useEffect(() => {
    // Aplicar estilos para SweetAlert
    const style = document.createElement('style');
    style.textContent = `
      .my-swal {
        z-index: 9999;
      }
    `;
    document.head.appendChild(style);

    // Limpiar el estilo cuando el componente se desmonte
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleOpen = () => {
    setCurrentCargo({ nombre: '', descripcion: '' });
    setIsEditing(false);
    setOpen(true);
    setNombreError(false);
  };

  const handleClose = () => {
    setOpen(false);
    setNombreError(false);
  };

  const handleInputChange = (e) => {
    setCurrentCargo({ ...currentCargo, [e.target.name]: e.target.value });
    if (e.target.name === 'nombre') {
      setNombreError(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentCargo.nombre.trim()) {
      setNombreError(true);
      nombreInputRef.current.focus();
      showErrorAlert('El nombre del cargo no puede estar vacío.');
      return;
    }

    const cargoEnMayusculas = {
      ...currentCargo,
      nombre: currentCargo.nombre.trim().toUpperCase(),
      // descripcion: currentCargo.descripcion.trim().toUpperCase()
    };

    if (isEditing) {
      const cargoOriginal = cargos.find(cargo => cargo.id === cargoEnMayusculas.id);
      if (isEqual(cargoOriginal, cargoEnMayusculas)) {
        showSweetAlert({
          icon: 'info',
          title: 'Sin cambios',
          text: 'No se han realizado cambios en el cargo.',
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
        response = await api.put(`/cargos/${cargoEnMayusculas.id}`, cargoEnMayusculas);
      } else {
        response = await api.post('/cargos', cargoEnMayusculas);
      }

      if (response.status === 200 || response.status === 201) {
        fetchPaginatedCargos(filters, pagination);
        handleClose();
        showSweetAlert({
          icon: 'success',
          title: 'Éxito',
          text: isEditing ? 'Cargo actualizado correctamente' : 'Cargo agregado correctamente',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        throw new Error(response.data.mensaje || 'Error al procesar la solicitud');
      }
    } catch (error) {
      console.error('Error submitting cargo:', error);
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

  const handleEdit = (cargo) => {
    setCurrentCargo(cargo);
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
        await api.delete(`/cargos/${id}`);
        fetchPaginatedCargos(filters, pagination);
       
        showSweetAlert({
          icon: 'success',
          title: 'Eliminado',
          text: 'El cargo ha sido eliminado.',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error deleting cargo:', error);
      showErrorAlert('Error al eliminar el cargo. Por favor, intente de nuevo más tarde.');
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
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page when filter changes
  };

  return (
    <div>
      <h2>Gestión de Cargos</h2>
      <BootstrapButton variant="contained" color="primary" onClick={handleOpen} style={{ marginBottom: '1rem' }}>
        Agregar Nuevo Cargo
      </BootstrapButton>
      
      {/* Filtro filtro */}
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
                Descripción
                <TextField
                  name="descripcion"
                  value={filters.descripcion}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por descripción"
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
                <TableCell colSpan={4} align="center">Cargando...</TableCell>
              </TableRow>
            ) : cargos.length > 0 ? (
              cargos.map((cargo, index) => (
                <StyledTableRow
                  key={cargo.id}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEdit(cargo);
                    }
                  }}
                >
                  <TableCell>{pagination.pageIndex * pagination.pageSize + index + 1}</TableCell>
                  <TableCell>{cargo.nombre || ''}</TableCell>
                  <TableCell>{cargo.descripcion || ''}</TableCell>
                  <TableCell align="right">
                    <BootstrapButton
                      color="success"
                      onClick={() => handleEdit(cargo)}
                      style={{ marginRight: '8px', padding: '4px 8px' }}
                      size="small"
                    >
                      Editar
                    </BootstrapButton>
                    <BootstrapButton
                      color="secondary"
                      onClick={() => handleDelete(cargo.id)}
                      style={{ padding: '4px 8px' }}
                      size="small"
                    >
                      Eliminar
                    </BootstrapButton>
                  </TableCell>
                </StyledTableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">No hay cargos disponibles</TableCell>
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
          <DialogTitle id="dialog-title">{isEditing ? 'Editar Cargo' : 'Agregar Nuevo Cargo'}</DialogTitle>
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
              value={currentCargo.nombre}
              onChange={handleInputChange}
              inputRef={nombreInputRef}
              error={nombreError}
              helperText={nombreError ? "El nombre es requerido" : ""}
            />
            <TextField
              margin="dense"
              name="descripcion"
              label="Descripción"
              type="text"
              fullWidth
              value={currentCargo.descripcion}
              onChange={handleInputChange}
            />
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

export default Cargos;