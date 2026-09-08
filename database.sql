-- ==========================================================
-- POLICÍA DE ENTRE RÍOS - COMISARÍA DEL MENOR Y V. FAMILIAR
-- Base de Datos Oficial (MySQL / MariaDB para Hosting)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS per_medidas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE per_medidas_db;

-- ----------------------------------------------------------
-- 1. TABLA DE USUARIOS POLICIALES (Autenticación y Roles)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NULL,
  role ENUM('superadmin', 'admin', 'officer', 'viewer') NOT NULL DEFAULT 'officer',
  badge_number VARCHAR(64) NOT NULL,
  department VARCHAR(150) NOT NULL DEFAULT 'Comisaría del Menor y V. Familiar',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME NULL,
  INDEX idx_badge (badge_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuarios Iniciales con Acceso Maestro
INSERT INTO usuarios (id, username, password, name, email, role, badge_number, department, status, created_at)
VALUES 
  ('usr-30557', '30557', 'NAVONI30557', 'Sargento Navoni Leonel', 'leonel.navoni@gmail.com', 'superadmin', '30557', 'Comisaría del Menor y V. Familiar', 'active', NOW()),
  ('usr-admin', 'admin', 'almorial1', 'Leonel Navoni', 'leonel.navoni@gmail.com', 'superadmin', '30557', 'Comisaría del Menor y V. Familiar', 'active', NOW())
ON DUPLICATE KEY UPDATE 
  password = VALUES(password),
  role = VALUES(role),
  status = VALUES(status);

-- ----------------------------------------------------------
-- 2. TABLA DE MEDIDAS JUDICIALES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS medidas_judiciales (
  id VARCHAR(64) PRIMARY KEY,
  caratula VARCHAR(255) NOT NULL,
  expediente VARCHAR(100) NULL,
  juzgado VARCHAR(150) NULL,
  tipo_medida VARCHAR(100) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'vigente',
  fecha_inicio DATE NULL,
  fecha_vencimiento DATE NULL,
  notificados TEXT NULL,
  observaciones TEXT NULL,
  datos_extra LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado (estado),
  INDEX idx_expediente (expediente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. TABLA DE PERSONAS IDENTIFICADAS EN CONTROLES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas_identificadas (
  id VARCHAR(64) PRIMARY KEY,
  dni VARCHAR(30) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  alias VARCHAR(100) NULL,
  domicilio VARCHAR(255) NULL,
  fecha_control DATETIME NOT NULL,
  oficial_interviniente VARCHAR(150) NULL,
  observaciones TEXT NULL,
  tiene_pedido_captura TINYINT(1) NOT NULL DEFAULT 0,
  datos_extra LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dni (dni)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. TABLA DE DOCUMENTOS Y ARCHIVOS PDF ALOJADOS EN SERVIDOR
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos_pdf (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  size BIGINT DEFAULT 0,
  mime_type VARCHAR(100) DEFAULT 'application/pdf',
  original_name VARCHAR(255) NULL,
  uploaded_by VARCHAR(150) NULL,
  category VARCHAR(100) DEFAULT 'Oficio Judicial',
  status VARCHAR(50) DEFAULT 'processed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. TABLA DE REGISTRO DE AUDITORÍA LEGAL
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id VARCHAR(64) NULL,
  accion VARCHAR(100) NOT NULL,
  detalle TEXT NULL,
  ip VARCHAR(45) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

