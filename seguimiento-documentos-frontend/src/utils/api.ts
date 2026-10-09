import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const shouldLogout =
      (error.response && error.response.status === 401) ||
      (error.response?.data?.mensaje?.includes('Token inválido') ||
       error.response?.data?.mensaje?.includes('Token expirado') ||
       error.response?.data?.error?.includes('Token inválido') ||
       error.response?.data?.error?.includes('Token expirado'));

    if (shouldLogout) {
      localStorage.removeItem('token');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (credentials: { usuario: string; password: string }) =>
  api.post('/usuarios/login', credentials);
export const register = (userData: any) => api.post('/usuarios/registro', userData);
export const verifyToken = () => api.patch('/usuarios/verify-token');

// Documentos
export const getDocumentos = () => api.get('/documentos');
export const createDocumento = (documentoData: any) => api.post('/documentos', documentoData);
export const updateDocumento = (id: number, documentoData: any) =>
  api.put(`/documentos/${id}`, documentoData);
export const deleteDocumento = (id: number) => api.delete(`/documentos/${id}`);
export const getDocumentoById = (id: number) => api.get(`/documentos/${id}`);
export const updateDocumentoEstado = (id: number, estado: string) =>
  api.patch(`/documentos/${id}/estado`, { estado });

// Expedientes
export const getExpedientes = (params?: any) => api.get('/expedientes', { params });
export const createExpediente = (expedienteData: any) => api.post('/expedientes', expedienteData);
export const updateExpediente = (id: number, expedienteData: any) =>
  api.put(`/expedientes/${id}`, expedienteData);
export const deleteExpediente = (id: number) => api.delete(`/expedientes/${id}`);
export const getExpedienteById = (id: number) => api.get(`/expedientes/${id}`);

// Usuarios
export const getUsuarios = () => api.get('/usuarios');
export const createUsuario = (usuarioData: any) => api.post('/usuarios', usuarioData);
export const getUsuarioById = (id: number) => api.get(`/usuarios/${id}`);
export const updateUsuario = (id: number, usuarioData: any) =>
  api.put(`/usuarios/${id}`, usuarioData);
export const deleteUsuario = (id: number) => api.delete(`/usuarios/${id}`);
export const getUsersForSelect = () => api.get('/usuarios/select');

// Areas
export const getAreas = (params?: any) => api.get('/areas', { params });

// Tipos Documentos
export const getTiposDocumentos = (params?: any) => api.get('/tipoDocumentos', { params });

// Asignaciones
export const getAsignaciones = (params?: any) => api.get('/asignaciones', { params });
export const createAsignacion = (asignacionData: any) => api.post('/asignaciones', asignacionData);
export const getAsignacionesConProrrogaPendiente = () => api.get('/asignaciones/con-prorroga-pendiente');
export const updateAsignacionEstado = (id: number, estado: string) =>
  api.patch(`/asignaciones/${id}/estado`, { estado });
export const solicitarProrroga = (id: number, plazoProrroga: number) =>
  api.patch(`/asignaciones/${id}/solicitar-prorroga`, { plazo_prorroga: plazoProrroga });

// Respuestas
export const getRespuestas = (params?: any) => api.get('/respuestas', { params });
export const createRespuesta = (respuestaData: any) => api.post('/respuestas', respuestaData);

// Antecedentes
export const getAntecedentesByExpedienteId = (expedienteId: number) =>
  api.get('/antecedentes', { params: { id_expediente: expedienteId } });
export const createAntecedente = (antecedenteData: any) =>
  api.post('/antecedentes', antecedenteData);

export default api;
