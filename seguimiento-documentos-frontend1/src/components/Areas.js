import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Breadcrumbs, Link, Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../services/api';
import Swal from 'sweetalert2';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from 'lodash';
import { getAreasHijas } from '../services/api';

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

const Areas = () => {
  const nombreInputRef = useRef(null);

  const [areas, setAreas] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentArea, setCurrentArea] = useState({ nombre: '', descripcion: '', id_padre: null });
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
  const [areasParaPadre, setAreasParaPadre] = useState([]);
  const [currentParentId, setCurrentParentId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Áreas Principales' }]);

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

  const fetchAreas = useCallback(async (parentId = null) => {
    setIsLoading(true);
    try {
      let response;
      if (parentId === null) {
        response = await api.get('/areas', {
          params: {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            nombre: filters.nombre,
            descripcion: filters.descripcion,
            filtro: filters.filtro,
            id_padre: 'null', // Añade este parámetro para obtener áreas principales
          },
        });
      } else {
        response = await getAreasHijas(parentId);
      }
      
      if (response.data && (response.data.areas || Array.isArray(response.data))) {
        setAreas(response.data.areas || response.data);
        setTotalCount(response.data.totalAreas || response.data.length);
      } else {
        console.error('Unexpected response format:', response.data);
        showErrorAlert('Formato de respuesta inesperado del servidor.');
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
      showErrorAlert('Error al cargar las áreas. Por favor, intente de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [pagination, filters, showErrorAlert]);

  const fetchAllAreas = useCallback(async () => {
    try {
      const response = await api.get('/areas', { params: { limit: 1000 } }); // Asumiendo que hay menos de 1000 áreas
      if (response.data && response.data.areas) {
        setAreasParaPadre(response.data.areas);
      }
    } catch (error) {
      console.error('Error fetching all areas:', error);
    }
  }, []);

  const debouncedFetchAreas = useRef(
    debounce((newFilters, newPagination) => {
      fetchAreas(newFilters, newPagination);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedFetchAreas(filters, pagination);
  }, [filters, pagination, debouncedFetchAreas]);

  useEffect(() => {
    fetchAllAreas();
  }, [fetchAllAreas]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (nombreInputRef.current) {
          nombreInputRef.current.focus();
        }
      }, 0);
    }
  }, [open]);

  useEffect(() => {
    fetchAreas(currentParentId);
  }, [fetchAreas, currentParentId]);

  const handleOpen = () => {
    setCurrentArea({ nombre: '', descripcion: '', id_padre: currentParentId });
    setIsEditing(false);
    setOpen(true);
    setNombreError(false);
  };

  const handleClose = () => {
    setOpen(false);
    setNombreError(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentArea(prevArea => ({
      ...prevArea,
      [name]: name === 'id_padre' ? (value === '' ? null : value) : value
    }));
    if (name === 'nombre') {
      setNombreError(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentArea.nombre.trim()) {
      setNombreError(true);
      nombreInputRef.current.focus();
      showErrorAlert('El nombre del área no puede estar vacío.');
      return;
    }

    const areaEnMayusculas = {
      ...currentArea,
      nombre: currentArea.nombre.trim().toUpperCase(),
    //   descripcion: currentArea.descripcion.trim().toUpperCase()
    };

    if (isEditing) {
      const areaOriginal = areas.find(area => area.id === areaEnMayusculas.id);
      if (isEqual(areaOriginal, areaEnMayusculas)) {
        showSweetAlert({
          icon: 'info',
          title: 'Sin cambios',
          text: 'No se han realizado cambios en el área.',
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
        response = await api.put(`/areas/${areaEnMayusculas.id}`, areaEnMayusculas);
      } else {
        response = await api.post('/areas', areaEnMayusculas);
      }

      if (response.status === 200 || response.status === 201) {
        fetchAreas(currentParentId);
        fetchAllAreas(); // Actualizar la lista de áreas para el selector de área padre
        handleClose();
        showSweetAlert({
          icon: 'success',
          title: 'Éxito',
          text: isEditing ? 'Área actualizada correctamente' : 'Área agregada correctamente',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        throw new Error(response.data.mensaje || 'Error al procesar la solicitud');
      }
    } catch (error) {
      console.error('Error submitting area:', error);
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

  const handleEdit = (area) => {
    setCurrentArea(area);
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
        await api.delete(`/areas/${id}`);
        fetchAreas(currentParentId);
        fetchAllAreas(); // Actualizar la lista de áreas para el selector de área padre
       
        showSweetAlert({
          icon: 'success',
          title: 'Eliminado',
          text: 'El área ha sido eliminada.',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error deleting area:', error);
      showErrorAlert('Error al eliminar el área. Por favor, intente de nuevo más tarde.');
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

  const handleShowSubAreas = (area) => {
    setCurrentParentId(area.id);
    setBreadcrumbs(prev => [...prev, { id: area.id, name: area.nombre }]);
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const handleBreadcrumbClick = (id, index) => {
    setCurrentParentId(id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  return (
    <div>
      <h2>Gestión de Áreas</h2>
      
      <Breadcrumbs aria-label="breadcrumb" style={{ marginBottom: '1rem' }}>
        {breadcrumbs.map((crumb, index) => (
          index === breadcrumbs.length - 1 ? (
            <Typography key={crumb.id} color="text.primary">
              {crumb.name}
            </Typography>
          ) : (
            <Link
              key={crumb.id}
              color="inherit"
              href="#"
              onClick={() => handleBreadcrumbClick(crumb.id, index)}
            >
              {crumb.name}
            </Link>
          )
        ))}
      </Breadcrumbs>

      <BootstrapButton variant="contained" color="primary" onClick={handleOpen} style={{ marginBottom: '1rem', marginRight: '1rem' }}>
        Agregar Nueva Área
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
              <TableCell>Área Padre</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Cargando...</TableCell>
              </TableRow>
            ) : areas.length > 0 ? (
              areas.map((area, index) => (
                <StyledTableRow
                  key={area.id}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEdit(area);
                    }
                  }}
                >
                  <TableCell>{pagination.pageIndex * pagination.pageSize + index + 1}</TableCell>
                  <TableCell>{area.nombre || ''}</TableCell>
                  <TableCell>{area.descripcion || ''}</TableCell>
                  <TableCell>{areasParaPadre.find(a => a.id === area.id_padre)?.nombre || ''}</TableCell>
                  <TableCell align="right">
                    <BootstrapButton
                      color="info"
                      onClick={() => handleShowSubAreas(area)}
                      style={{ marginRight: '8px', padding: '4px 8px' }}
                      size="small"
                    >
                      Sub-áreas
                    </BootstrapButton>
                    <BootstrapButton
                      color="success"
                      onClick={() => handleEdit(area)}
                      style={{ marginRight: '8px', padding: '4px 8px' }}
                      size="small"
                    >
                      Editar
                    </BootstrapButton>
                    <BootstrapButton
                      color="secondary"
                      onClick={() => handleDelete(area.id)}
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
                <TableCell colSpan={6} align="center">No hay áreas disponibles</TableCell>
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
          <DialogTitle id="dialog-title">{isEditing ? 'Editar Área' : 'Agregar Nueva Área'}</DialogTitle>
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
              required
              inputRef={nombreInputRef}
              value={currentArea.nombre}
              onChange={handleInputChange}
              error={nombreError}
              helperText={nombreError ? 'El nombre del área no puede estar vacío.' : ''}
            />
            <TextField
              margin="dense"
              name="descripcion"
              label="Descripción"
              type="text"
              fullWidth
              multiline
              rows={4}
              value={currentArea.descripcion}
              onChange={handleInputChange}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="id_padre-label">Área Padre</InputLabel>
              <Select
                labelId="id_padre-label"
                id="id_padre"
                name="id_padre"
                value={currentArea.id_padre || ''}
                onChange={handleInputChange}
                label="Área Padre"
              >
                <MenuItem value="">
                  <em>Ninguna</em>
                </MenuItem>
                {areasParaPadre.map(area => (
                  <MenuItem key={area.id} value={area.id}>
                    {area.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <DialogButton onClick={handleClose} color="primary">
              Cancelar
            </DialogButton>
            <DialogButton type="submit" color="primary">
              Guardar
            </DialogButton>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export default Areas;