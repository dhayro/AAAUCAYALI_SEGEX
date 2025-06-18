import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from "lodash";
import { getRespuestas, getAreas, getUsersForSelect, getUsersByAreaId, createAsignacion, updateDocumentoEstado,updateRespuestaEstado,getPendingAsignacionesByDocumentoId, updateExpedienteEstado } from '../services/api';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, CircularProgress, Typography, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Box, Chip, InputAdornment
} from '@mui/material';
import {
  formatDate,
  parseISOToLimaDate,
  formatDateWithTime,
} from "../utils/dateUtils";
import Swal from 'sweetalert2'; // Import SweetAlert2 for displaying alerts
import SearchIcon from "@mui/icons-material/Search";

const DocumentosRespuestas = () => {
  const [respuestas, setRespuestas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRespuesta, setSelectedRespuesta] = useState(null);

  // State for Asignar Dialog
  const [openAsignarDialog, setOpenAsignarDialog] = useState(false);
  const [currentDocumentoForAsignar, setCurrentDocumentoForAsignar] = useState(null);
  const [areas, setAreas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedUsuarios, setSelectedUsuarios] = useState([]);
  const [plazoRespuesta, setPlazoRespuesta] = useState(3);
  const [observacion, setObservacion] = useState('');
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(false);

  // State for filters
  const [filters, setFilters] = useState({
    general: '',
    cut: '',
    documento: '',
    personaAsignada: '',
  });

  const debouncedFetchAsignaciones = useRef(
    debounce((newPagination) => {
        fetchRespuestas(newPagination);
    }, 300)
  ).current;
  
  useEffect(() => {
    debouncedFetchAsignaciones(pagination);
  }, [pagination, debouncedFetchAsignaciones]);

  const fetchRespuestas = useCallback(async () => {
    console.log('Fetching respuestas with pagination:', pagination); // Debugging line

    setIsLoading(true);
    try {
      const response = await getRespuestas({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      });
      if (response.data) {
        console.log('Fetched respuestas:', response.data.respuestas); // Debugging line
        setRespuestas(response.data.respuestas); 
        setTotalCount(response.data.totalRespuestas);
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Acceso Denegado',
          text: 'No tiene permiso para acceder a estos datos.',
        });
      } else {
        console.error('Error fetching respuestas:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [pagination]); // Ensure pagination is included as a dependency

  const handleChangePage = (event, newPage) => {
    setPagination(old => ({ ...old, pageIndex: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPagination({ pageIndex: 0, pageSize: newPageSize });
  };

  const handleOpenDialog = (respuesta) => {
    setSelectedRespuesta(respuesta);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRespuesta(null); // Ensure this is intentional
  };

  const handleAsignar = () => {
    handleOpenAsignarDialog(selectedRespuesta.AsignacionDocumento.Documento);
  };

  const handleTerminar = async () => {
    if (!selectedRespuesta) return;

    const result = await Swal.fire({
        title: '¿Está seguro?',
        text: "¿Desea terminar la asignación de este documento?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, terminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        let rollbackActions = [];

        try {
            // Update the response state to completed
            const estadoOriginal = selectedRespuesta.AsignacionDocumento.Documento.estado;
            await handleUpdateRespuestaEstado(selectedRespuesta.id, false);
            rollbackActions.push(() => handleUpdateRespuestaEstado(selectedRespuesta.id, true));

            // Check for pending assignments
            const response = await getPendingAsignacionesByDocumentoId(selectedRespuesta.AsignacionDocumento.Documento.id);
            if (response.data && response.data.pendientes === 0) {
                // If no pending assignments, update the document state to "TERMINADO"
                await updateDocumentoEstado(selectedRespuesta.AsignacionDocumento.Documento.id, 'TERMINADO');
                rollbackActions.push(() => updateDocumentoEstado(selectedRespuesta.AsignacionDocumento.Documento.id, estadoOriginal ));

                // Update the expediente state
                await updateExpedienteEstado(selectedRespuesta.AsignacionDocumento.Documento.Expediente.id,false);
                rollbackActions.push(() => updateExpedienteEstado(selectedRespuesta.AsignacionDocumento.Documento.Expediente.id, true));

                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'El documento y el expediente han sido marcados como TERMINADOS.',
                    timer: 2500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'Asignaciones Pendientes',
                    text: 'El documento aún tiene asignaciones pendientes.',
                    timer: 2500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error updating document or expediente state:', error);

            // Rollback changes
            for (const rollback of rollbackActions.reverse()) {
                try {
                    await rollback();
                } catch (rollbackError) {
                    console.error('Error during rollback:', rollbackError);
                }
            }

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo completar la acción. Por favor, intente nuevamente.',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false
            });
        } finally {
            handleCloseDialog();
        }
    }
};

  const handleOpenAsignarDialog = (documento) => {
    setCurrentDocumentoForAsignar(documento);
    setSelectedArea('');
    setSelectedUsuarios([]);
    setPlazoRespuesta(3);
    setObservacion('');
    setOpenAsignarDialog(true);
    fetchAreas();
    fetchAllUsers();
  };

  const handleCloseAsignarDialog = () => {
    setOpenAsignarDialog(false);
    setCurrentDocumentoForAsignar(null);
    setSelectedArea('');
    setSelectedUsuarios([]);
    setPlazoRespuesta(3);
    setObservacion('');
  };

  const handleUpdateRespuestaEstado = async (asignacionId, nuevoEstado) => {
    try {
      const response = await updateRespuestaEstado(asignacionId, nuevoEstado);

      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Éxito",
          text: "Estado de la respuesta se a actualizado correctamente",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        console.log('Updating respuestas after state change'); // Debugging line
        fetchRespuestas(); // Ensure this is called without parameters if it's a useCallback
        handleCloseDialog();
      } else {
        throw new Error("Error al actualizar el estado de la respuesta");
      }
    } catch (error) {
      console.error("Error updating assignment state:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al actualizar el estado de la respuesta. Por favor, intente de nuevo.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await getAreas();
      if (response.data && response.data.areas) {
        setAreas(response.data.areas);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las áreas',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
  };

  const fetchAllUsers = async () => {
    setIsLoadingUsuarios(true);
    try {
      const response = await getUsersForSelect();
      if (response.data) {
        setUsuarios(response.data);
      } else {
        console.error('Formato de respuesta inesperado:', response.data);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al cargar los usuarios',
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los usuarios',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    } finally {
      setIsLoadingUsuarios(false);
    }
  };

  const handleAreaChange = async (e) => {
    const areaId = e.target.value;
    setSelectedArea(areaId);
    setSelectedUsuarios([]); // Clear selected users when area changes
    setIsLoadingUsuarios(true); // Set loading state to true

    try {
        if (!areaId) {
            // If no area is selected, fetch all users
            await fetchAllUsers();
        } else {
            // Fetch users by selected area
            const response = await getUsersByAreaId(areaId);
            if (response.data && response.data.usuarios) {
                setUsuarios(response.data.usuarios);
            } else if (Array.isArray(response.data)) {
                setUsuarios(response.data);
            } else {
                console.error('Unexpected response format:', response.data);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al filtrar usuarios por área',
                    timer: 3000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            }
        }
    } catch (error) {
        console.error('Error fetching users by area:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los usuarios para el área seleccionada',
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false
        });
        // In case of error, try to fetch all users
        await fetchAllUsers();
    } finally {
        setIsLoadingUsuarios(false); // Set loading state to false
    }
  };

  const handleSubmitAsignar = async (e) => {
    e.preventDefault();

    if (!selectedUsuarios || (Array.isArray(selectedUsuarios) && selectedUsuarios.length === 0)) {
        Swal.fire({
            icon: 'warning',
            title: 'Advertencia',
            text: 'Debe seleccionar al menos un usuario para asignar el documento',
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false
        });
        return;
    }

    try {
        // Mostrar indicador de carga
        Swal.fire({
            title: 'Procesando asignación...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        let success = true;

        // Si selectedUsuarios es un array, crear múltiples asignaciones
        if (Array.isArray(selectedUsuarios)) {
            // Crear asignaciones para cada usuario seleccionado
            for (const userId of selectedUsuarios) {
                const asignacionData = {
                    id_documento: currentDocumentoForAsignar.id,
                    id_asignado: userId,
                    plazo_respuesta: plazoRespuesta,
                    observaciones: observacion.trim()
                };

                try {
                    await createAsignacion(asignacionData);
                } catch (error) {
                    console.error(`Error asignando documento al usuario ${userId}:`, error);
                    success = false;
                }
            }
        } else {
            // Si no es un array, tratar como un solo ID (compatibilidad con versión anterior)
            const asignacionData = {
                id_documento: currentDocumentoForAsignar.id,
                id_asignado: selectedUsuarios,
                plazo_respuesta: plazoRespuesta,
                observaciones: observacion.trim()
            };

            await createAsignacion(asignacionData);
        }

        if (success) {
            // Actualizar el estado del documento a "ASIGNADO"
            const docResponse = await updateDocumentoEstado(currentDocumentoForAsignar.id, 'ASIGNADO');

            if (docResponse.status === 200) {
                Swal.close(); // Cerrar el indicador de carga

                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Documento asignado correctamente',
                    timer: 2500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });

                if (selectedRespuesta) {
                    handleUpdateRespuestaEstado(selectedRespuesta.id, false);
                } 
                handleCloseAsignarDialog();
            }
        } else {
            throw new Error('Hubo errores al asignar el documento a algunos usuarios');
        }
    } catch (error) {
        console.error('Error asignando documento:', error);
        Swal.close(); // Cerrar el indicador de carga en caso de error

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo asignar el documento. Por favor, intente nuevamente.',
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }
  };

  // Handle filter changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Apply filters to the respuestas list
  const filteredRespuestas = respuestas.filter((respuesta) => {
    const generalFilter = filters.general.toLowerCase();
    const cutFilter = filters.cut.toLowerCase();
    const documentoFilter = filters.documento.toLowerCase();
    const personaAsignadaFilter = filters.personaAsignada.toLowerCase();

    const cut = respuesta.AsignacionDocumento.Documento.Expediente?.cut.toLowerCase() || "";
    const documento = `${respuesta.AsignacionDocumento.Documento?.TipoDocumento?.nombre || ""} ${respuesta.AsignacionDocumento.Documento?.numero_documento || ""}`.toLowerCase();
    const personaAsignada = `${respuesta.AsignacionDocumento.asignado?.nombre || ""} ${respuesta.AsignacionDocumento.asignado?.apellido || ""}`.toLowerCase();

    return (
      (cut.includes(cutFilter) || cutFilter === "") &&
      (documento.includes(documentoFilter) || documentoFilter === "") &&
      (personaAsignada.includes(personaAsignadaFilter) || personaAsignadaFilter === "") &&
      (cut.includes(generalFilter) || documento.includes(generalFilter) || personaAsignada.includes(generalFilter) || generalFilter === "")
    );
  });

  return (
    <div>
      <h2>Respuestas de Documentos</h2>

      {/* Search and filter section */}
      <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
        <TextField
          name="general"
          value={filters.general}
          onChange={handleFilterChange}
          placeholder="Buscar en todos los campos"
          variant="outlined"
          size="small"
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

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
                Documento
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
              <TableCell>Fecha Documento</TableCell>
              <TableCell>Fecha Asignación</TableCell>
              <TableCell>Fecha Vencimiento</TableCell>
              <TableCell>
                Persona Asignada
                <TextField
                  name="personaAsignada"
                  value={filters.personaAsignada}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por Persona Asignada"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>Fecha Respuesta</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Cargando...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredRespuestas.length > 0 ? (
              filteredRespuestas.map((respuesta, index) => {
                const asignacion = respuesta.AsignacionDocumento;
                const documento = asignacion.Documento;
                const expediente = documento.Expediente;
                const asignado = asignacion.asignado;

                return (
                  <TableRow key={respuesta.id}>
                    <TableCell>{pagination.pageIndex * pagination.pageSize + index + 1}</TableCell>
                    <TableCell>{expediente.cut || 'N/A'}</TableCell>
                    <TableCell>{documento.TipoDocumento.nombre || 'N/A'} {documento.numero_documento || ''}</TableCell>
                    <TableCell>{documento.fecha_documento ? formatDate(
                        parseISOToLimaDate(documento.fecha_documento)) : 'N/A'}</TableCell>
                    <TableCell>{asignacion.fecha_asignacion ? formatDateWithTime(
                        parseISOToLimaDate(asignacion.fecha_asignacion)) : 'N/A'}</TableCell>
                    <TableCell>{asignacion.fecha_limite ? formatDateWithTime(
                        parseISOToLimaDate(asignacion.fecha_limite)) : 'N/A'}</TableCell>
                    <TableCell>{asignado.nombre} {asignado.apellido}</TableCell>
                    <TableCell>{respuesta.fecha_respuesta ? formatDateWithTime(
                        parseISOToLimaDate(respuesta.fecha_respuesta)) : 'N/A'}</TableCell>
                    <TableCell>
                      <Button variant="contained" color="primary" size="small" onClick={() => handleOpenDialog(respuesta)}>
                        Ver Respuesta
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay respuestas disponibles
                </TableCell>
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

      {/* Dialog for viewing response details */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Detalles de la Respuesta</DialogTitle>
        <DialogContent dividers>
          {selectedRespuesta && (
            <div>
              <Typography variant="subtitle2">CUT:</Typography>
              <Typography>{selectedRespuesta.AsignacionDocumento.Documento.Expediente.cut || 'N/A'}</Typography>

              <Typography variant="subtitle2">Documento:</Typography>
              <Typography>{selectedRespuesta.AsignacionDocumento.Documento.TipoDocumento.nombre || 'N/A'} {selectedRespuesta.AsignacionDocumento.Documento.numero_documento || ''}</Typography>

              <Typography variant="subtitle2">Fecha Documento:</Typography>
              <Typography>{selectedRespuesta.AsignacionDocumento.Documento.fecha_documento ? formatDate(parseISOToLimaDate(selectedRespuesta.AsignacionDocumento.Documento.fecha_documento)) : 'N/A'}</Typography>

              <Typography variant="subtitle2">Fecha Respuesta:</Typography>
              <Typography>{selectedRespuesta.fecha_respuesta ? formatDateWithTime(parseISOToLimaDate(selectedRespuesta.fecha_respuesta)) : 'N/A'}</Typography>

              <Typography variant="subtitle2">Respuesta:</Typography>
              <Typography>{selectedRespuesta.observaciones || 'Sin observaciones'}</Typography>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAsignar} color="secondary">
            Asignar
          </Button>
          <Button onClick={handleTerminar} color="default">
            Terminar
          </Button>
          <Button onClick={handleCloseDialog} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for assigning document */}
      <Dialog
        open={openAsignarDialog}
        onClose={handleCloseAsignarDialog}
        aria-labelledby="asignar-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="asignar-dialog-title">
          Asignar Documento
        </DialogTitle>
        <DialogContent>
          {currentDocumentoForAsignar && (
            <div style={{ marginBottom: '16px' }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Documento:</strong> {currentDocumentoForAsignar.numero_documento}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Tipo:</strong> {currentDocumentoForAsignar.TipoDocumento?.nombre || 'No especificado'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Asunto:</strong> {currentDocumentoForAsignar.asunto || 'No especificado'}
              </Typography>
            </div>
          )}

          <FormControl fullWidth margin="dense">
            <InputLabel id="area-select-label">Área</InputLabel>
            <Select
              labelId="area-select-label"
              id="area-select"
              value={selectedArea}
              onChange={handleAreaChange} // Use the adapted function here
              label="Área"
            >
              <MenuItem value="">
                <em>Todas las áreas</em>
              </MenuItem>
              {areas.map((area) => (
                <MenuItem key={area.id} value={area.id}>
                  {area.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel id="usuario-select-label">Usuario</InputLabel>
            <Select
              labelId="usuario-select-label"
              id="usuario-select"
              multiple
              value={selectedUsuarios}
              onChange={(e) => setSelectedUsuarios(e.target.value)}
              label="Usuarios"
              disabled={isLoadingUsuarios}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const usuario = usuarios.find(u => u.id === value);
                    return (
                      <Chip
                        key={value}
                        label={`${usuario?.nombre || ''} ${usuario?.apellido || ''}`}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            >
              <MenuItem value="">
                <em>Seleccione usuarios</em>
              </MenuItem>
              {usuarios.map((usuario) => (
                <MenuItem key={usuario.id} value={usuario.id}>
                  {usuario.nombre} {usuario.apellido} - {usuario.cargo || 'Sin cargo'}
                </MenuItem>
              ))}
            </Select>
            {isLoadingUsuarios && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
                <CircularProgress size={24} />
              </div>
            )}
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel id="plazo-select-label">Plazo de respuesta (días)</InputLabel>
            <Select
              labelId="plazo-select-label"
              id="plazo-select"
              value={plazoRespuesta}
              onChange={(e) => setPlazoRespuesta(e.target.value)}
              label="Plazo de respuesta (días)"
            >
              {[1, 2, 3, 5, 7, 10, 15, 30].map((dias) => (
                <MenuItem key={dias} value={dias}>
                  {dias} {dias === 1 ? 'día' : 'días'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            id="observacion"
            label="Observaciones"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAsignarDialog} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleSubmitAsignar} color="primary">
            Asignar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DocumentosRespuestas;