-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS seguimiento_documentos;

-- Usar la base de datos
USE seguimiento_documentos;

-- Crear tabla de áreas (incluyendo sub-áreas)
CREATE TABLE IF NOT EXISTS areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    id_padre INT DEFAULT NULL,
    FOREIGN KEY (id_padre) REFERENCES areas(id)
);

-- Crear tabla de cargos
CREATE TABLE IF NOT EXISTS cargos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Crear tabla de usuarios (personas)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
    id_cargo INT,
    id_area INT,
    perfil ENUM('admin', 'personal', 'jefe', 'secretaria') DEFAULT 'personal' NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    fecha_nacimiento DATE,
    estado BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_cargo) REFERENCES cargos(id),
    FOREIGN KEY (id_area) REFERENCES areas(id)
);

-- Crear tabla de tipo de documentos
CREATE TABLE IF NOT EXISTS tipo_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Crear tabla de expedientes
CREATE TABLE IF NOT EXISTS expedientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cut VARCHAR(50) UNIQUE NOT NULL,
    estupa VARCHAR(50),
    tipo_procedimiento VARCHAR(100),
    periodo INT,
    id_tipo_documento INT,
    numero_documento VARCHAR(100),
    asunto TEXT,
    remitente VARCHAR(100),
    fecha_cierre DATETIME,
    fecha_ultima_respuesta DATETIME,
    estado BOOLEAN DEFAULT TRUE,
    id_usuario_creador INT,
    id_usuario_modificador INT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario_creador) REFERENCES usuarios(id),
    FOREIGN KEY (id_usuario_modificador) REFERENCES usuarios(id),
    FOREIGN KEY (id_tipo_documento) REFERENCES tipo_documentos(id),
    UNIQUE (cut, periodo)   -- Asegurar que el CUT y el periodo sean únicos
);

-- Crear tabla de documentos
CREATE TABLE IF NOT EXISTS documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_expediente INT NOT NULL,
    id_tipo_documento INT ,
    numero_documento VARCHAR(100) NOT NULL,
    asunto TEXT,
    fecha_documento DATE ,
    ultimo_escritorio VARCHAR(100),
    ultima_oficina_area VARCHAR(100),
    fecha_ingreso_ultimo_escritorio DATETIME,
    bandeja VARCHAR(255),
    estado VARCHAR(50) NOT NULL COMMENT 'Estado del documento (pendiente, asignado, en_revision, cerrado,anulado,prorrogado,respuesta)',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    id_usuario_creador INT,
    id_usuario_modificador INT,
    brecha DATE ,
    FOREIGN KEY (id_usuario_creador) REFERENCES usuarios(id),
    FOREIGN KEY (id_usuario_modificador) REFERENCES usuarios(id),
    FOREIGN KEY (id_expediente) REFERENCES expedientes(id),
    FOREIGN KEY (id_tipo_documento) REFERENCES tipo_documentos(id)
);

-- Crear tabla de asignaciones de documentos
CREATE TABLE IF NOT EXISTS asignaciones_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_documento INT NOT NULL,
    id_asignado INT NOT NULL,
    fecha_asignacion DATETIME NOT NULL,
    plazo_respuesta INT NOT NULL,
    fecha_limite DATETIME NOT NULL,
    fecha_prorroga DATETIME,
    plazo_prorroga INT,
    fecha_prorroga_limite DATETIME,
    -- fecha_respuesta DATETIME,
    observaciones TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    id_usuario_creador INT,
    id_usuario_modificador INT,
    estado BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_documento) REFERENCES documentos(id),
    FOREIGN KEY (id_asignado) REFERENCES usuarios(id)   ,
    FOREIGN KEY (id_usuario_creador) REFERENCES usuarios(id),
    FOREIGN KEY (id_usuario_modificador) REFERENCES usuarios(id)
);

-- Crear tabla de respuestas a documentos
CREATE TABLE IF NOT EXISTS respuestas_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_asignacion INT NOT NULL,
    fecha_respuesta DATETIME NOT NULL,
    observaciones TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    id_usuario_creador INT,
    id_usuario_modificador INT,
    estado BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_asignacion) REFERENCES asignaciones_documentos(id),
    FOREIGN KEY (id_usuario_creador) REFERENCES usuarios(id),
    FOREIGN KEY (id_usuario_modificador) REFERENCES usuarios(id)
);

-- Índices para la tabla documentos
CREATE INDEX idx_documentos_id_expediente ON documentos(id_expediente);
CREATE INDEX idx_documentos_id_tipo_documento ON documentos(id_tipo_documento);
CREATE INDEX idx_documentos_numero_fecha ON documentos(numero_documento, fecha_documento);

-- Índices para la tabla asignaciones_documentos
CREATE INDEX idx_asignaciones_id_documento ON asignaciones_documentos(id_documento);
CREATE INDEX idx_asignaciones_id_asignado ON asignaciones_documentos(id_asignado);
CREATE INDEX idx_asignaciones_fecha_limite ON asignaciones_documentos(fecha_limite);

-- Índice para la tabla respuestas_documentos
CREATE INDEX idx_respuestas_id_asignacion ON respuestas_documentos(id_asignacion);

-- Índices para la tabla expedientes
CREATE INDEX idx_expedientes_id_tipo_documento ON expedientes(id_tipo_documento);
CREATE INDEX idx_expedientes_id_usuario_creador ON expedientes(id_usuario_creador);
CREATE INDEX idx_expedientes_id_usuario_modificador ON expedientes(id_usuario_modificador);

-- Índices para la tabla usuarios
CREATE INDEX idx_usuarios_id_cargo ON usuarios(id_cargo);
CREATE INDEX idx_usuarios_id_area ON usuarios(id_area);