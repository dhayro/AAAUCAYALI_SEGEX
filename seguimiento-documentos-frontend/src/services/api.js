import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

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
    if (error.response && error.response.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = (credentials) => api.post('/usuarios/login', credentials);
export const register = (userData) => api.post('/usuarios/registro', userData);

export const getDocumentos = () => api.get('/documentos');
export const createDocumento = (documentoData) => api.post('/documentos', documentoData);

export const getExpedientes = (params) => api.get('/expedientes', { params });
export const createExpediente = (expedienteData) => api.post('/expedientes', expedienteData);
export const getExpedienteById = (id) => api.get(`/expedientes/${id}`);
export const updateExpediente = (id, expedienteData) => api.put(`/expedientes/${id}`, expedienteData);
export const deleteExpediente = (id) => api.delete(`/expedientes/${id}`);

export const getUsuarios = () => api.get('/usuarios');
export const createUsuario = (usuarioData) => api.post('/usuarios', usuarioData);
export const getUsuarioById = (id) => api.get(`/usuarios/${id}`);
export const updateUsuario = (id, usuarioData) => api.put(`/usuarios/${id}`, usuarioData);
export const deleteUsuario = (id) => api.delete(`/usuarios/${id}`);

// Cambiar a PATCH para obtener tipos de procedimientos
export const getTiposProcedimientos = (params) => api.patch('/expedientes/procedimientos', { params });

// ... otras importaciones y configuraciones

export const getAreas = (params) => api.get('/areas', { params });
export const getAreasPrincipales = (params) => api.patch('/areas/principales', { params });
export const getAreasHijas = (parentId) => api.get(`/areas/${parentId}/hijas`);

// ... other exports

export const getTiposDocumentos = (params) => api.get('/tipoDocumentos', { params });
export const createTipoDocumento = (tipoDocumentoData) => api.post('/tipoDocumentos', tipoDocumentoData);
export const getTipoDocumentoById = (id) => api.get(`/tipoDocumentos/${id}`);
export const updateTipoDocumento = (id, tipoDocumentoData) => api.put(`/tipoDocumentos/${id}`, tipoDocumentoData);
export const deleteTipoDocumento = (id) => api.delete(`/tipoDocumentos/${id}`);

// Respuestas de Documentos API
export const getRespuestas = (params) => api.get('/respuestas', { params });
export const createRespuesta = (respuestaData) => api.post('/respuestas', respuestaData);
export const getRespuestaById = (id) => api.get(`/respuestas/${id}`);
export const updateRespuesta = (id, respuestaData) => api.put(`/respuestas/${id}`, respuestaData);
export const deleteRespuesta = (id) => api.delete(`/respuestas/${id}`);

// Agrega m&aacute;s funciones para otras rutas de la API seg&uacute;n sea necesario

export const getNombresUnicosTiposDocumentos = () => api.patch('/tipoDocumentos/nombres-unicos');

export default api;