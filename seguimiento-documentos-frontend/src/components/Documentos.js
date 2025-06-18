import React, { useState, useEffect, useCallback, useRef } from "react";
import { debounce } from "lodash";
import {
  formatDate,
  parseISOToLimaDate,
  formatDateWithTime,
  toLimaTimezone,
} from "../utils/dateUtils";
import {
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  styled,
  FormControl,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  getAsignaciones,
  createRespuesta,
  updateDocumentoEstado,
  updateAsignacionEstado,
  solicitarProrroga, // Import the function
} from "../services/api"; // Import the function

import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";

// Styled components
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  margin: theme.spacing(0.5),
  minWidth: "80px",
}));

const Documentos = () => {
  // State variables
  const [asignaciones, setAsignaciones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    filtro: "",
    cut: "",
    remitente: "",
    documento: "",
    usuario: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedAsignacion, setSelectedAsignacion] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openResponseDialog, setOpenResponseDialog] = useState(false);
  const [responseObservations, setResponseObservations] = useState("");

  const [openProrrogaDialog, setOpenProrrogaDialog] = useState(false);
  const [plazoProrroga, setPlazoProrroga] = useState(5); // Valor por defecto

  const handleOpenProrrogaDialog = (asignacion) => {
    setSelectedAsignacion(asignacion); // Establece la asignación seleccionada
    setOpenProrrogaDialog(true); // Abre el diálogo
  };

  const handleCloseProrrogaDialog = () => {
    setOpenProrrogaDialog(false);
  };

  // Function to show error alerts
  const showErrorAlert = useCallback((message) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage("");
    }, 3000);
  }, []);

  // Function to fetch paginated asignaciones
  const fetchPaginatedAsignaciones = useCallback(
    async (currentFilters, currentPagination) => {
      setIsLoading(true);
      try {
        const response = await getAsignaciones({
          page: currentPagination.pageIndex + 1,
          limit: currentPagination.pageSize,
          cut: currentFilters.cut,
          remitente: currentFilters.remitente,
          documento: currentFilters.documento,
          usuario: currentFilters.usuario,
          filtro: currentFilters.filtro,
        });

        if (response.data && response.data.asignaciones) {
          setAsignaciones(response.data.asignaciones);
          setTotalCount(response.data.totalAsignaciones);
        } else {
          console.error("Unexpected response format:", response.data);
          showErrorAlert("Formato de respuesta inesperado del servidor.");
        }
      } catch (error) {
        console.error("Error fetching asignaciones:", error);
        showErrorAlert(
          "Error al cargar las asignaciones. Por favor, intente de nuevo más tarde."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [showErrorAlert]
  );

  // Debounce the fetch function to avoid too many API calls
  const debouncedFetchAsignaciones = useRef(
    debounce((newFilters, newPagination) => {
      fetchPaginatedAsignaciones(newFilters, newPagination);
    }, 300)
  ).current;

  // Effect to fetch data when filters or pagination change
  useEffect(() => {
    debouncedFetchAsignaciones(filters, pagination);
  }, [filters, pagination, debouncedFetchAsignaciones]);

  // Effect to add custom styles for SweetAlert
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .my-swal {
        z-index: 9999;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle filter changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle pagination changes
  const handleChangePage = (event, newPage) => {
    setPagination((old) => ({ ...old, pageIndex: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPagination({ pageIndex: 0, pageSize: newPageSize });
  };

  // Calculate days remaining
  const calculateDaysRemaining = (asignacion) => {
    const dueDate = asignacion.fecha_prorroga_limite || asignacion.fecha_limite;
    if (!dueDate) return null;

    // Convert today's date and due date to Lima timezone
    let today = toLimaTimezone(new Date());
    const due = parseISOToLimaDate(dueDate);

    // If today is Saturday, move to next Monday
    if (today.getDay() === 6) {
      today.setDate(today.getDate() + 2);
    }
    // If today is Sunday, move to next Monday
    else if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }

    // Calculate the total number of days between today and the due date
    let workingDaysRemaining = 0;
    let currentDate = new Date(today);

    while (currentDate < due) {
      // Use < to exclude the due date
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 6 && dayOfWeek !== 0) {
        workingDaysRemaining++; // Count only weekdays
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // If today is the due date, return 0
    if (today.toDateString() === due.toDateString()) {
      return 0;
    }

    return workingDaysRemaining;
  };

  const handleUpdateAsignacionEstado = async (asignacionId, nuevoEstado) => {
    try {
      const response = await updateAsignacionEstado(asignacionId, nuevoEstado);

      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Éxito",
          text: "Estado de la asignación actualizado correctamente",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        fetchPaginatedAsignaciones(filters, pagination);

        // Aquí puedes actualizar el estado local o volver a cargar los datos si es necesario
      } else {
        throw new Error("Error al actualizar el estado de la asignación");
      }
    } catch (error) {
      console.error("Error updating assignment state:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al actualizar el estado de la asignación. Por favor, intente de nuevo.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  };

  // Get status color based on days remaining
  const getStatusColor = (daysRemaining) => {
    if (daysRemaining === null) return "default";
    if (daysRemaining < 0) return "error";
    if (daysRemaining === 0) return "warning";
    if (daysRemaining <= 2) return "warning";
    return "success";
  };

  let token = localStorage.getItem("token");
  let currentUserId = null;

  if (token) {
    try {
      let decodedToken = jwtDecode(token);
      currentUserId = decodedToken.id;
    } catch (error) {
      console.error("Error al decodificar el token:", error);
    }
  }

  // Handle opening details dialog
  const handleOpenDetails = async (asignacion) => {
    setSelectedAsignacion(asignacion);
    setOpenDetailsDialog(true);

    // Retrieve and decode the token to get the current user's ID


    // Check if the current user is the one assigned to the task
    if (asignacion.Documento.estado === "ASIGNADO" && asignacion.asignado.id === currentUserId) {
      try {
        const docResponse = await updateDocumentoEstado(
          asignacion.Documento.id,
          "EN_REVISION"
        );

        if (docResponse.status === 200) {
          asignacion.Documento.estado = "EN_REVISION";
          Swal.fire({
            icon: "success",
            title: "Éxito",
            text: "Estado del documento actualizado a EN_REVISION",
            timer: 2500,
            timerProgressBar: true,
            showConfirmButton: false,
          });
        } else {
          console.error(
            "Error al actualizar el estado del documento:",
            docResponse
          );
          throw new Error("Error al actualizar el estado del documento");
        }
      } catch (error) {
        console.error("Error updating document state:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Error al actualizar el estado del documento. Por favor, intente de nuevo.",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
    }
  };

  // Handle closing details dialog
  const handleCloseDetails = () => {
    setOpenDetailsDialog(false);
    setSelectedAsignacion(null);
  };

  // Handle opening response dialog
  const handleOpenResponseDialog = async (asignacion) => {
    setSelectedAsignacion(asignacion);
    setOpenResponseDialog(true);
  };

  // Handle closing response dialog
  const handleCloseResponseDialog = () => {
    setOpenResponseDialog(false);
    setSelectedAsignacion(null);
    setResponseObservations("");
  };

  // Function to handle the API call for creating a new response
  const handleCreateResponse = async () => {
    if (!selectedAsignacion) return;

    try {
      const response = await createRespuesta({
        id_asignacion: selectedAsignacion.id,
        fecha_respuesta: new Date().toISOString(),
        observaciones: responseObservations,
        id_usuario_creador: 1, // Replace with actual user ID
        estado: true,
      });

      if (response.status === 200 || response.status === 201) {
        // Update the document state to "RESPUESTA"
        const docResponse = await updateDocumentoEstado(
          selectedAsignacion.Documento.id,
          "RESPUESTA"
        );
        handleUpdateAsignacionEstado(selectedAsignacion.id, false);

        if (docResponse.status === 200) {
          // Optionally update the local state or UI to reflect the change

          Swal.fire({
            icon: "success",
            title: "Éxito",
            text: "Respuesta creada correctamente y estado del documento actualizado a RESPUESTA",
            timer: 2500,
            timerProgressBar: true,
            showConfirmButton: false,
          });
          handleCloseResponseDialog();
        } else {
          throw new Error("Error al actualizar el estado del documento");
        }
      } else {
        throw new Error("Error al crear la respuesta");
      }
    } catch (error) {
      console.error(
        "Error creating response or updating document state:",
        error
      );
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al crear la respuesta o actualizar el estado del documento. Por favor, intente de nuevo.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  };

  const handleSolicitarProrroga = async () => {
    if (!selectedAsignacion || !selectedAsignacion.id) {
      console.error("Asignación no seleccionada o inválida");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se ha seleccionado una asignación válida.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }

    try {
      const response = await solicitarProrroga(
        selectedAsignacion.id,
        plazoProrroga
      );

      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Éxito",
          text: "Prórroga solicitada correctamente",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });

        // Actualiza la tabla de asignaciones
        fetchPaginatedAsignaciones(filters, pagination);
      } else {
        throw new Error("Error al solicitar la prórroga");
      }
    } catch (error) {
      console.error("Error requesting extension:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al solicitar la prórroga. Por favor, intente de nuevo.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } finally {
      handleCloseProrrogaDialog();
    }
  };

  return (
    <div>
      <h2>Documentos Asignados</h2>

      {/* Search and filter section */}
      <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
        <TextField
          name="filtro"
          value={filters.filtro}
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

      {/* Error message display */}
      {errorMessage && (
        <Box
          sx={{
            mb: 2,
            p: 1,
            bgcolor: "error.light",
            color: "error.contrastText",
            borderRadius: 1,
          }}>
          {errorMessage}
        </Box>
      )}

      {/* Table of asignaciones */}
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
                Remitente
                <TextField
                  name="remitente"
                  value={filters.remitente}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por remitente"
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
                  placeholder="Filtrar por documento"
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
                  name="usuario"
                  value={filters.usuario}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por usuario"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Prórroga</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Cargando...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : asignaciones.length > 0 ? (
              asignaciones.map((asignacion, index) => {
                const daysRemaining = calculateDaysRemaining(asignacion);
                const statusColor = getStatusColor(daysRemaining);

                return (
                  <StyledTableRow
                    key={asignacion.id}
                    hover
                    onClick={() => handleOpenDetails(asignacion)}
                    style={{ cursor: "pointer" }}>
                    <TableCell>
                      {pagination.pageIndex * pagination.pageSize + index + 1}
                    </TableCell>
                    <TableCell>
                      {asignacion.Documento.Expediente?.cut || "N/A"}
                    </TableCell>
                    <TableCell>
                      {asignacion.Documento.Expediente?.remitente || "N/A"}
                    </TableCell>
                    <TableCell>
                      {asignacion.Documento?.TipoDocumento?.nombre || "N/A"}{" "}
                      {asignacion.Documento?.numero_documento || ""}
                    </TableCell>
                    <TableCell>
                      {formatDate(
                        parseISOToLimaDate(
                          asignacion.Documento?.fecha_documento
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDateWithTime(
                        parseISOToLimaDate(asignacion.fecha_asignacion)
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDateWithTime(
                        parseISOToLimaDate(
                          asignacion.fecha_prorroga_limite ||
                          asignacion.fecha_limite
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      {asignacion.asignado?.nombre || ""}{" "}
                      {asignacion.asignado?.apellido || ""}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          daysRemaining === null
                            ? "Sin fecha"
                            : daysRemaining < 0
                              ? "Vencido"
                              : daysRemaining === 0
                                ? "Hoy"
                                : `${daysRemaining} día(s)`
                        }
                        color={statusColor}
                        onClick={() => console.log("Estado:", statusColor)}
                        clickable={true}
                      />
                    </TableCell>
                    <TableCell>
                      {asignacion.fecha_prorroga_limite ? (
                        <Chip
                          size="small"
                          label="Prórroga Aceptada"
                          color="success"
                          onClick={() =>
                            console.log("Estado: Prórroga Aceptada")
                          }
                          clickable={true}
                        />
                      ) : asignacion.fecha_prorroga ? (
                        <Chip
                          size="small"
                          label="Prórroga Solicitada"
                          color="info"
                          onClick={() =>
                            console.log("Estado: Prórroga Solicitada")
                          }
                          clickable={true}
                        />
                      ) : (
                        "No"
                      )}
                    </TableCell>
                    <TableCell>
                      {asignacion.Documento.estado === 'EN_REVISION' && (
                        <StyledButton
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenResponseDialog(asignacion);
                          }}>
                          Dar Respuesta
                        </StyledButton>
                      )}
                      {daysRemaining <= 2 &&
                        asignacion.fecha_prorroga === null && asignacion.Documento.estado === 'EN_REVISION' && (
                          <StyledButton
                            variant="contained"
                            color="secondary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProrrogaDialog(asignacion);
                            }}>
                            Solicitar Prórroga
                          </StyledButton>
                        )}
                    </TableCell>
                  </StyledTableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No hay documentos asignados disponibles
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
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
        labelRowsPerPage="Filas por página:"
      />

      {/* Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth>
        <DialogTitle>Detalles del Documento</DialogTitle>
        <DialogContent dividers>
          {selectedAsignacion && (
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Typography variant="subtitle2">CUT:</Typography>
              <Typography>
                {selectedAsignacion.Documento.Expediente?.cut || "N/A"}
              </Typography>

              <Typography variant="subtitle2">Remitente:</Typography>
              <Typography>
                {selectedAsignacion.Documento.Expediente?.remitente || "N/A"}
              </Typography>

              <Typography variant="subtitle2">Documento:</Typography>
              <Typography>
                {selectedAsignacion.Documento?.TipoDocumento?.nombre || "N/A"}{" "}
                {selectedAsignacion.Documento?.numero_documento || ""}
              </Typography>

              <Typography variant="subtitle2">Asunto:</Typography>
              <Typography>
                {selectedAsignacion.Documento?.asunto || "N/A"}
              </Typography>

              <Typography variant="subtitle2">Fecha del Documento:</Typography>
              <Typography>
                {formatDate(
                  parseISOToLimaDate(
                    selectedAsignacion.Documento?.fecha_documento
                  )
                )}
              </Typography>

              <Typography variant="subtitle2">Fecha de Asignación:</Typography>
              <Typography>
                {formatDateWithTime(
                  parseISOToLimaDate(selectedAsignacion.fecha_asignacion)
                )}
              </Typography>

              <Typography variant="subtitle2">Fecha de Vencimiento:</Typography>
              <Typography>
                {formatDateWithTime(
                  parseISOToLimaDate(
                    selectedAsignacion.fecha_prorroga_limite ||
                    selectedAsignacion.fecha_limite
                  )
                )}
              </Typography>

              <Typography variant="subtitle2">Fecha Prórroga:</Typography>
              <Typography>
                {selectedAsignacion.fecha_prorroga
                  ? formatDateWithTime(
                    parseISOToLimaDate(selectedAsignacion.fecha_prorroga)
                  )
                  : "N/A"}
              </Typography>

              <Typography variant="subtitle2">Plazo Prórroga:</Typography>
              <Typography>
                {selectedAsignacion.plazo_prorroga
                  ? `${selectedAsignacion.plazo_prorroga} día(s)`
                  : "N/A"}
              </Typography>

              <Typography variant="subtitle2">
                Fecha Prórroga Límite:
              </Typography>
              <Typography>
                {selectedAsignacion.fecha_prorroga_limite
                  ? formatDateWithTime(
                    parseISOToLimaDate(
                      selectedAsignacion.fecha_prorroga_limite
                    )
                  )
                  : "N/A"}
              </Typography>

              <Typography variant="subtitle2">Persona Asignada:</Typography>
              <Typography>
                {selectedAsignacion.asignado?.nombre || ""}{" "}
                {selectedAsignacion.asignado?.apellido || ""}
              </Typography>

              <Typography variant="subtitle2">Instrucciones:</Typography>
              <Typography>
                {selectedAsignacion.observaciones || "Sin instrucciones"}
              </Typography>

              <Typography variant="subtitle2">Estado:</Typography>
              <Chip
                size="small"
                label={
                  calculateDaysRemaining(selectedAsignacion) === null
                    ? "Sin fecha"
                    : calculateDaysRemaining(selectedAsignacion) < 0
                      ? "Vencido"
                      : calculateDaysRemaining(selectedAsignacion) === 0
                        ? "Hoy"
                        : `${calculateDaysRemaining(selectedAsignacion)} día(s)`
                }
                color={getStatusColor(
                  calculateDaysRemaining(selectedAsignacion)
                )}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog
        open={openResponseDialog}
        onClose={handleCloseResponseDialog}
        maxWidth="sm"
        fullWidth>
        <DialogTitle>Dar Respuesta</DialogTitle>
        <DialogContent dividers>
          {selectedAsignacion && selectedAsignacion.asignado && selectedAsignacion.asignado.id === currentUserId ? (
            <TextField
              label="Observaciones"
              multiline
              rows={4}
              fullWidth
              value={responseObservations}
              onChange={(e) => setResponseObservations(e.target.value)}
            />
          ) : (
            <Typography variant="body2" color="textSecondary">
              No tiene permiso para responder a esta asignación.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResponseDialog} color="secondary">
            Cancelar
          </Button>
          {selectedAsignacion && selectedAsignacion.asignado && selectedAsignacion.asignado.id === currentUserId && (
            <Button
              onClick={handleCreateResponse}
              color="primary"
              disabled={!(selectedAsignacion && selectedAsignacion.asignado && selectedAsignacion.asignado.id === currentUserId)}
            >
              Enviar Respuesta
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Dialog
        open={openProrrogaDialog}
        onClose={handleCloseProrrogaDialog}
        maxWidth="sm"
        fullWidth>
        <DialogTitle>Solicitar Prórroga</DialogTitle>
        <DialogContent>
          {selectedAsignacion && selectedAsignacion.asignado && selectedAsignacion.asignado.id === currentUserId ? (
            <FormControl fullWidth margin="dense">
              <InputLabel id="plazo-select-label">
                Plazo de prórroga (días)
              </InputLabel>
              <Select
                labelId="plazo-select-label"
                id="plazo-select"
                value={plazoProrroga}
                onChange={(e) => setPlazoProrroga(e.target.value)}
                label="Plazo de prórroga (días)"
                fullWidth>
                {[1, 2, 3, 5, 7, 10, 15, 30].map((dias) => (
                  <MenuItem key={dias} value={dias}>
                    {dias} {dias === 1 ? "día" : "días"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No tiene permiso para solicitar una prórroga para esta asignación.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProrrogaDialog} color="secondary">
            Cancelar
          </Button>
          {selectedAsignacion && selectedAsignacion.asignado && selectedAsignacion.asignado.id === currentUserId && (
            <Button
              onClick={() => handleSolicitarProrroga(selectedAsignacion.id)}
              color="primary">
              Solicitar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Documentos;