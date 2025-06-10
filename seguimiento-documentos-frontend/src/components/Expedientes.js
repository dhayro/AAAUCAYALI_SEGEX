import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, InputAdornment, CircularProgress, Autocomplete
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getExpedientes, createExpediente, updateExpediente, deleteExpediente, createDocumento, getTiposProcedimientos, getExpedienteById, getNombresUnicosTiposDocumentos } from '../services/api';
import Swal from 'sweetalert2';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from 'lodash';
import { readExcelFile } from '../utils/excelUtils';
// import jwtDecode from 'jwt-decode';
import { jwtDecode } from 'jwt-decode';

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
    color === 'success' ? '#28a745' :
    color === 'celeste' ? '#00bfff' : '#0063cc', // Add celeste color
  borderColor:
    color === 'primary' ? '#0063cc' :
    color === 'secondary' ? '#dc3545' :
    color === 'success' ? '#28a745' :
    color === 'celeste' ? '#00bfff' : '#0063cc',
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
      color === 'success' ? '#218838' :
      color === 'celeste' ? '#00a3cc' : '#0069d9', // Add hover color for celeste
    borderColor:
      color === 'primary' ? '#0062cc' :
      color === 'secondary' ? '#bd2130' :
      color === 'success' ? '#1e7e34' :
      color === 'celeste' ? '#00a3cc' : '#0062cc',
    boxShadow: 'none',
  },
  '&:active': {
    boxShadow: 'none',
    backgroundColor:
      color === 'primary' ? '#0062cc' :
      color === 'secondary' ? '#bd2130' :
      color === 'success' ? '#1e7e34' :
      color === 'celeste' ? '#0099cc' : '#0062cc', // Add active color for celeste
    borderColor:
      color === 'primary' ? '#005cbf' :
      color === 'secondary' ? '#b21f2d' :
      color === 'success' ? '#1c7e30' :
      color === 'celeste' ? '#0099cc' : '#005cbf',
  },
  '&:focus': {
    boxShadow: `0 0 0 0.2rem ${color === 'primary' ? 'rgba(0,123,255,.5)' :
      color === 'secondary' ? 'rgba(220,53,69,.5)' :
      color === 'success' ? 'rgba(40,167,69,.5)' :
      color === 'celeste' ? 'rgba(0,191,255,.5)' : 'rgba(0,123,255,.5)'
    }`,
  },
}));

const Expedientes = () => {
  const [expedientes, setExpedientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentExpediente, setCurrentExpediente] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ filtro: '', cut: '', asunto: '', remitente: '', documento: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tiposProcedimientos, setTiposProcedimientos] = useState([]);
  const [procedimientoInputValue, setProcedimientoInputValue] = useState('');
  const [nombresUnicosTiposDocumentos, setNombresUnicosTiposDocumentos] = useState([]);
  const [tipoDocumentoInputValue, setTipoDocumentoInputValue] = useState('');

  const fileInputRef = useRef();

  const showSweetAlert = useCallback((options) => {
    return Swal.fire({
      ...options,
      customClass: { container: 'my-swal' }
    });
  }, []);

  const fetchPaginatedExpedientes = useCallback(async (currentFilters, currentPagination) => {
    setIsLoading(true);
    try {
      const response = await getExpedientes({
        page: currentPagination.pageIndex + 1,
        limit: currentPagination.pageSize,
        cut: currentFilters.cut,
        asunto: currentFilters.asunto,
        filtro: currentFilters.filtro,
        remitente: currentFilters.remitente,
        documento: currentFilters.documento,
      });
      if (response.data && response.data.expedientes) {
        setExpedientes(response.data.expedientes);
        setTotalCount(response.data.totalExpedientes);
      } else {
        console.error('Unexpected response format:', response.data);
        showSweetAlert({ icon: 'error', title: 'Error', text: 'Formato de respuesta inesperado del servidor.' });
      }
    } catch (error) {
      console.error('Error fetching expedientes:', error);
      showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al cargar los expedientes. Por favor, intente de nuevo más tarde.' });
    } finally {
      setIsLoading(false);
    }
  }, [showSweetAlert]);

  const debouncedFetchExpedientes = useRef(
    debounce((newFilters, newPagination) => {
      fetchPaginatedExpedientes(newFilters, newPagination);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedFetchExpedientes(filters, pagination);
  }, [filters, pagination, debouncedFetchExpedientes]);

  const fetchTiposProcedimientos = useCallback(
    debounce(async (inputValue) => {
      try {
        const response = await getTiposProcedimientos({ search: inputValue });
        if (response.data) {
          setTiposProcedimientos(response.data);
        }
      } catch (error) {
        console.error('Error fetching tipos de procedimientos:', error);
      }
    }, 300),
    [] // Ensure all dependencies are listed here
  );

  useEffect(() => {
    if (procedimientoInputValue) {
      fetchTiposProcedimientos(procedimientoInputValue);
    }
  }, [procedimientoInputValue, fetchTiposProcedimientos]);

  const fetchNombresUnicosTiposDocumentos = useCallback(
    debounce(async (inputValue) => {
      try {
        const response = await getNombresUnicosTiposDocumentos({ search: inputValue });
        if (response.data) {
          setNombresUnicosTiposDocumentos(response.data);
        }
      } catch (error) {
        console.error('Error fetching nombres únicos de tipos de documentos:', error);
      }
    }, 300),
    [] // Ensure all dependencies are listed here
  );

  useEffect(() => {
    if (tipoDocumentoInputValue) {
      fetchNombresUnicosTiposDocumentos(tipoDocumentoInputValue);
    }
  }, [tipoDocumentoInputValue, fetchNombresUnicosTiposDocumentos]);

  const handleOpen = () => {
    setCurrentExpediente({
      cut: '',
      estupa: '',
      tipo_procedimiento: '',
      tipo_documento: '',
      numero_documento: '',
      periodo: '',
      fecha_creacion: new Date().toISOString().split('T')[0], // Establecer la fecha de creación a hoy
      asunto: '',
      remitente: '',
      id_usuario_creador: '',
    });
    setIsEditing(false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setCurrentExpediente({ ...currentExpediente, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos obligatorios y enfocar el primero que esté vacío
    if (!currentExpediente.cut || currentExpediente.cut.trim() === '') {
      showSweetAlert({ icon: 'error', title: 'Error', text: 'El campo CUT es obligatorio.' });
      cutRef.current.focus();
      return;
    }
    if (!currentExpediente.tipo_procedimiento || currentExpediente.tipo_procedimiento.trim() === '') {
      showSweetAlert({ icon: 'error', title: 'Error', text: 'El campo Tipo de Procedimiento es obligatorio.' });
      tipoProcedimientoRef.current.focus();
      return;
    }
    if (!currentExpediente.id_tipo_documento ) {
  showSweetAlert({ icon: 'error', title: 'Error', text: 'El campo Tipo de Documento es obligatorio.' });
  tipoDocumentoRef.current.focus();
  return;
}
    if (!currentExpediente.numero_documento || currentExpediente.numero_documento.trim() === '') {
      showSweetAlert({ icon: 'error', title: 'Error', text: 'El campo Número de Documento es obligatorio.' });
      numeroDocumentoRef.current.focus();
      return;
    }
    if (!currentExpediente.periodo || (typeof currentExpediente.periodo === 'string' && currentExpediente.periodo.trim() === '')) {
      showSweetAlert({ icon: 'error', title: 'Error', text: 'El campo Periodo es obligatorio.' });
      periodoRef.current.focus();
      return;
    }
    if (!currentExpediente.asunto || currentExpediente.asunto.trim() === '') {
      showSweetAlert({ icon: 'error', title: 'Error', text: 'El campo Asunto es obligatorio.' });
      asuntoRef.current.focus();
      return;
    }
    if (!currentExpediente.remitente || currentExpediente.remitente.trim() === '') {
      showSweetAlert({ icon: 'error', title: 'Error', text: 'El campo Remitente es obligatorio.' });
      remitenteRef.current.focus();
      return;
    }

    try {
      // Obtener el token del almacenamiento local
      const token = localStorage.getItem('token');
      // Decodificar el token para obtener el ID del usuario
      const decodedToken = jwtDecode(token);
      const id_usuario_creador = decodedToken.id; // Asegúrate de que 'id' es la clave correcta

      const expediente = {
        ...currentExpediente,
        id_tipo_documento: currentExpediente.id_tipo_documento.id || '', // Extract ID from tipo_documento object
        id_usuario_creador, // Usar el ID del usuario obtenido del token
      };

      if (isEditing) {
        expediente.id_usuario_modificador = id_usuario_creador; // Actualizar el usuario modificador
        await updateExpediente(currentExpediente.id, expediente);
      } else {
        await createExpediente(expediente);
      }
      fetchPaginatedExpedientes(filters, pagination);
      handleClose();
      showSweetAlert({ icon: 'success', title: 'Éxito', text: isEditing ? 'Expediente actualizado correctamente' : 'Expediente agregado correctamente' });
    } catch (error) {
      console.error('Error submitting expediente:', error);
      showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al procesar la solicitud. Por favor, intente de nuevo.' });
    }
  };

  const handleEdit = async (expediente) => {
    try {
      await fetchNombresUnicosTiposDocumentos('');

      const response = await getExpedienteById(expediente.id);
      console.log('API response:', response.data); // Log the response to verify
      if (response.data) {
        const expedienteData = response.data;
        
        // Convertir la fecha de creación al formato deseado
        if (expedienteData.fecha_creacion) {
          expedienteData.fecha_creacion = formatDate(expedienteData.fecha_creacion);
        }
  
        // Ensure tipo_documento is an object with the expected structure
        if (expedienteData.tipo_documento && typeof expedienteData.tipo_documento === 'object') {
          expedienteData.tipo_documento = {
            id: expedienteData.tipo_documento.id,
            nombre: expedienteData.tipo_documento.nombre
          };
        } else {
          expedienteData.tipo_documento = null;
        }
  
        setCurrentExpediente(expedienteData);
        setIsEditing(true);
        setOpen(true);
      } else {
        showSweetAlert({ icon: 'error', title: 'Error', text: 'No se pudo obtener los datos completos del expediente.' });
      }
    } catch (error) {
      console.error('Error fetching expediente by ID:', error);
      showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al obtener los datos del expediente. Por favor, intente de nuevo.' });
    }
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
        await deleteExpediente(id);
        fetchPaginatedExpedientes(filters, pagination);
        showSweetAlert({ icon: 'success', title: 'Eliminado', text: 'El expediente ha sido eliminado.' });
      }
    } catch (error) {
      console.error('Error deleting expediente:', error);
      showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al eliminar el expediente. Por favor, intente de nuevo.' });
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const parseDate = (dateString) => {
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  };

  const handleImport = async () => {
    if (selectedFile) {
      setIsProcessing(true);
      try {
        const data = await readExcelFile(selectedFile);

        const token = localStorage.getItem('token');
        const decodedToken = jwtDecode(token);
        const id_usuario_creador = decodedToken.id;

        for (const row of data.slice(2)) {
          const expediente = {
            cut: row[1] ? row[1].trim() : '',
            estupa: row[4] || '',
            tipo_procedimiento: row[5] || '',
            tipo_documento: row[10] || '',
            numero_documento: row[8] ? row[8].toString().toUpperCase() : '',
            periodo: row[7] || '',
            fecha_creacion: row[6] ? parseDate(row[6]) : null,
            asunto: row[9] || '',
            remitente: row[11] || '',
            id_usuario_creador,
          };

          if (!expediente.cut) {
            console.warn('CUT is blank, skipping:', expediente);
            continue;
          }

          try {
            const response = await createExpediente(expediente);
            const expedienteId = response.data.id;

            if (response.data.alert) {
              console.log('Expediente with CUT already exists:', expediente);
            } else {
              console.log('Expediente created:', expediente);
            }

            const documento = {
              id_expediente: expedienteId,
              numero_documento: row[12] ? row[12].toString().toUpperCase() : '',
              asunto: row[9] || '',
              ultimo_escritorio: row[13] || '',
              ultima_oficina_area: row[15] || '',
              fecha_ingreso_ultimo_escritorio: row[17] ? parseDate(row[17]) : null,
              bandeja: row[18] || '',
              estado: 'pendiente',
            };

            await createDocumento(documento);
            console.log('Documento created:', documento);

          } catch (error) {
            console.error('Error creating expediente or documento:', error);
            const errorMessage = error.response?.data?.message || 'Error al crear el expediente o documento.';
            showSweetAlert({ icon: 'error', title: 'Error', text: errorMessage });
          }
        }

        showSweetAlert({ icon: 'success', title: 'Éxito', text: 'Expedientes y documentos importados correctamente.' });
        
        fetchPaginatedExpedientes(filters, pagination);
        
      } catch (error) {
        console.error('Error reading Excel file:', error);
        showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al leer el archivo Excel.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Crear referencias para los campos de entrada
  const cutRef = useRef();
  const tipoProcedimientoRef = useRef();
  const tipoDocumentoRef = useRef();
  const numeroDocumentoRef = useRef();
  const periodoRef = useRef();
  const asuntoRef = useRef();
  const remitenteRef = useRef();

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Añadir cero si es necesario
    const day = String(date.getDate()).padStart(2, '0'); // Añadir cero si es necesario
    return `${year}-${month}-${day}`;
  };

  return (
    <div>
      <h2>Gestión de Expedientes</h2>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      <div style={{ marginBottom: '1rem' }}>
        <BootstrapButton
          variant="contained"
          color="celeste"
          onClick={triggerFileInput}
          style={{ marginRight: '1rem' }}
        >
          Seleccionar Archivo
        </BootstrapButton>
        
        {selectedFile && (
          <BootstrapButton
            variant="contained"
            color="primary"
            onClick={handleImport}
            style={{ marginRight: '1rem' }}
          >
            Importar
          </BootstrapButton>
        )}
      </div>

      {isProcessing && (
        <div style={{ marginBottom: '1rem' }}>
          <CircularProgress />
          <span style={{ marginLeft: '10px' }}>Procesando archivo...</span>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <BootstrapButton variant="contained" color="primary" onClick={handleOpen} style={{ marginRight: '1rem' }}>
          Agregar Nuevo Expediente
        </BootstrapButton>
        
        <TextField
          name="filtro"
          value={filters.filtro}
          onChange={handleFilterChange}
          placeholder="Buscar en todos los campos"
          variant="outlined"
          size="small"
          style={{ marginRight: '1rem' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </div>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>
                CUT
                <TextField
                  name="cut"
                  value={filters.cut}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por CUT"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Asunto
                <TextField
                  name="asunto"
                  value={filters.asunto}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por Asunto"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Remitente
                <TextField
                  name="remitente"
                  value={filters.remitente}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por Remitente"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Documento Origen
                <TextField
                  name="documento"
                  value={filters.documento}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por Documento"
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
            ) : expedientes.length > 0 ? (
              expedientes.map((expediente, index) => (
                <TableRow
                  key={expediente.id}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEdit(expediente);
                    }
                  }}
                >
                  <TableCell>{pagination.pageIndex * pagination.pageSize + index + 1}</TableCell>
                  <TableCell>{expediente.cut || ''}</TableCell>
                  <TableCell>{expediente.asunto || ''}</TableCell>
                  <TableCell>{expediente.remitente || ''}</TableCell>
                  <TableCell>{`${expediente.TipoDocumento?.nombre || ''} ${expediente.numero_documento || ''}`.trim()}</TableCell>
                  <TableCell align="right">
                    <BootstrapButton
                      color="info"
                      onClick={() => handleEdit(expediente)}
                      style={{ marginRight: '8px', padding: '4px 8px' }}
                      size="small"
                    >
                      Editar
                    </BootstrapButton>
                    <BootstrapButton
                      color="secondary"
                      onClick={() => handleDelete(expediente.id)}
                      style={{ padding: '4px 8px' }}
                      size="small"
                    >
                      Eliminar
                    </BootstrapButton>
                    <BootstrapButton
                      color="primary"
                      onClick={() => alert(`Listar documentos para expediente ${expediente.id}`)}
                      style={{ padding: '4px 8px' }}
                      size="small"
                    >
                      Listar Documentos
                    </BootstrapButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay expedientes disponibles</TableCell>
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
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : 'más de ' + to}`}
        labelRowsPerPage="Filas por página:"
      />

      <Dialog 
        open={open} 
        onClose={handleClose}
        aria-labelledby="dialog-title"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle id="dialog-title">{isEditing ? 'Editar Expediente' : 'Agregar Nuevo Expediente'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="cut"
              label="CUT *"
              type="text"
              fullWidth
              value={currentExpediente.cut || ''}
              onChange={handleInputChange}
              inputRef={cutRef}
            />
            <TextField
              margin="dense"
              name="estupa"
              label="Estupa"
              type="text"
              fullWidth
              value={currentExpediente.estupa || ''}
              onChange={handleInputChange}
            />
            <Autocomplete
              options={tiposProcedimientos}
              getOptionLabel={(option) => option}
              value={currentExpediente.tipo_procedimiento || null}
              onInputChange={(event, newInputValue) => {
                setProcedimientoInputValue(newInputValue);
              }}
              onChange={(event, newValue) => {
                setCurrentExpediente({
                  ...currentExpediente,
                  tipo_procedimiento: newValue || ''
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tipo de Procedimiento *"
                  margin="dense"
                  fullWidth
                  inputRef={tipoProcedimientoRef}
                />
              )}
            />
            <Autocomplete
              options={nombresUnicosTiposDocumentos}
              getOptionLabel={(option) => option.nombre || currentExpediente.TipoDocumento.nombre || ''}
              value={currentExpediente.id_tipo_documento || null}
              onInputChange={(event, newInputValue) => {
                setTipoDocumentoInputValue(newInputValue);
              }}
              onChange={(event, newValue) => {
                setCurrentExpediente({
                  ...currentExpediente,
                  id_tipo_documento: newValue || null // Store the entire object
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tipo de Documento"
                  margin="dense"
                  fullWidth
                  inputRef={tipoDocumentoRef}
                />
              )}
            />
            <TextField
              margin="dense"
              name="numero_documento"
              label="Número de Documento *"
              type="text"
              fullWidth
              value={currentExpediente.numero_documento || ''}
              onChange={handleInputChange}
              inputRef={numeroDocumentoRef}
            />
            <TextField
              margin="dense"
              name="periodo"
              label="Periodo *"
              type="text"
              fullWidth
              value={currentExpediente.periodo || ''}
              onChange={handleInputChange}
              inputRef={periodoRef}
            />
            <TextField
              margin="dense"
              name="fecha_creacion"
              label="Fecha de Creación"
              type="date"
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              value={currentExpediente.fecha_creacion || new Date().toISOString().split('T')[0]}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="asunto"
              label="Asunto *"
              type="text"
              fullWidth
              value={currentExpediente.asunto || ''}
              onChange={handleInputChange}
              inputRef={asuntoRef}
            />
            <TextField
              margin="dense"
              name="remitente"
              label="Remitente *"
              type="text"
              fullWidth
              value={currentExpediente.remitente || ''}
              onChange={handleInputChange}
              inputRef={remitenteRef}
            />
            
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" color="primary">
              {isEditing ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export default Expedientes;