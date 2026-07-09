-- ============================================================
--  Taskless — Esquema + datos de prueba (seed)
--  Importar de un solo golpe:
--    mysql -u root -p < database.sql
--  o desde el cliente mysql:  SOURCE /ruta/database.sql;
-- ============================================================

DROP DATABASE IF EXISTS taskless;
CREATE DATABASE taskless
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE taskless;

-- ------------------------------------------------------------
-- Tabla: usuarios
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,           -- bcrypt, nunca texto plano
  rol            ENUM('admin','miembro') NOT NULL DEFAULT 'miembro',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: equipos
-- ------------------------------------------------------------
CREATE TABLE equipos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(120) NOT NULL,
  descripcion  VARCHAR(500) NULL,
  owner_id     INT NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_equipo_owner
    FOREIGN KEY (owner_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: equipo_miembros  (membresía = quién ve qué)
-- ------------------------------------------------------------
CREATE TABLE equipo_miembros (
  equipo_id    INT NOT NULL,
  usuario_id   INT NOT NULL,
  rol          ENUM('admin','miembro') NOT NULL DEFAULT 'miembro',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (equipo_id, usuario_id),
  CONSTRAINT fk_miembro_equipo
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
  CONSTRAINT fk_miembro_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: proyectos  (personal si equipo_id NULL; de equipo si no)
-- ------------------------------------------------------------
CREATE TABLE proyectos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  descripcion  TEXT NULL,
  usuario_id   INT NOT NULL,          -- creador/dueño
  equipo_id    INT NULL,              -- si pertenece a un equipo
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_proyecto_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_proyecto_equipo
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: columnas (columnas del tablero Kanban)
-- ------------------------------------------------------------
CREATE TABLE columnas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  orden        INT NOT NULL DEFAULT 0,
  proyecto_id  INT NOT NULL,
  CONSTRAINT fk_columna_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: tareas
-- ------------------------------------------------------------
CREATE TABLE tareas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  titulo       VARCHAR(200) NOT NULL,
  descripcion  TEXT NULL,
  prioridad    ENUM('baja','media','alta') NOT NULL DEFAULT 'media',
  completada   TINYINT(1) NOT NULL DEFAULT 0,
  orden        INT NOT NULL DEFAULT 0,
  columna_id   INT NULL,
  proyecto_id  INT NULL,
  usuario_id   INT NOT NULL,          -- creador
  asignado_a   INT NULL,              -- responsable (miembro del equipo)
  fecha_limite DATE NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tarea_columna
    FOREIGN KEY (columna_id) REFERENCES columnas(id) ON DELETE CASCADE,
  CONSTRAINT fk_tarea_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_tarea_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_tarea_asignado
    FOREIGN KEY (asignado_a) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: etiquetas + relacion N:M con tareas
-- ------------------------------------------------------------
CREATE TABLE etiquetas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(60) NOT NULL,
  color        VARCHAR(20) NOT NULL DEFAULT '#8dab7f',
  usuario_id   INT NOT NULL,
  CONSTRAINT fk_etiqueta_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tarea_etiquetas (
  tarea_id     INT NOT NULL,
  etiqueta_id  INT NOT NULL,
  PRIMARY KEY (tarea_id, etiqueta_id),
  CONSTRAINT fk_te_tarea
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
  CONSTRAINT fk_te_etiqueta
    FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: comentarios en tareas
-- ------------------------------------------------------------
CREATE TABLE comentarios (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  tarea_id     INT NOT NULL,
  usuario_id   INT NOT NULL,
  texto        TEXT NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comentario_tarea
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
  CONSTRAINT fk_comentario_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: actividad (registro de acciones por proyecto)
-- ------------------------------------------------------------
CREATE TABLE actividad (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id  INT NULL,
  usuario_id   INT NOT NULL,
  accion       VARCHAR(80) NOT NULL,
  detalle      VARCHAR(300) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_actividad_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_actividad_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: notificaciones (in-app)
-- ------------------------------------------------------------
CREATE TABLE notificaciones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  tipo         VARCHAR(40) NOT NULL,
  mensaje      VARCHAR(300) NOT NULL,
  enlace       VARCHAR(200) NULL,
  leida        TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indices utiles
CREATE INDEX idx_tareas_usuario ON tareas(usuario_id, created_at);
CREATE INDEX idx_tareas_asignado ON tareas(asignado_a);
CREATE INDEX idx_tareas_columna ON tareas(columna_id, orden);
CREATE INDEX idx_columnas_proyecto ON columnas(proyecto_id, orden);
CREATE INDEX idx_miembros_usuario ON equipo_miembros(usuario_id);
CREATE INDEX idx_notif_usuario ON notificaciones(usuario_id, leida);

-- ============================================================
--  SEED (datos de prueba)
-- ============================================================

-- Usuarios. Todos usan la contraseña "Demo1234" (mismo hash bcrypt).
INSERT INTO usuarios (id, nombre, email, password_hash, rol) VALUES
  (1, 'Usuario Demo', 'demo@taskless.com', '$2b$10$uQlj0qKZHp6.TqhAElxo0OtG1e1SAFUxjePqaSzcj0kmOAsIUdUWG', 'admin'),
  (2, 'Ana Torres',   'ana@taskless.com',  '$2b$10$uQlj0qKZHp6.TqhAElxo0OtG1e1SAFUxjePqaSzcj0kmOAsIUdUWG', 'miembro'),
  (3, 'Luis Pérez',   'luis@taskless.com', '$2b$10$uQlj0qKZHp6.TqhAElxo0OtG1e1SAFUxjePqaSzcj0kmOAsIUdUWG', 'miembro');

-- Equipo con demo (admin) + Ana y Luis (miembros)
INSERT INTO equipos (id, nombre, descripcion, owner_id) VALUES
  (1, 'Equipo Producto', 'Equipo que trabaja el producto principal.', 1);

INSERT INTO equipo_miembros (equipo_id, usuario_id, rol) VALUES
  (1, 1, 'admin'),
  (1, 2, 'miembro'),
  (1, 3, 'miembro');

-- Proyectos: el 1 es de equipo (todos lo ven); el 2 es personal de demo.
INSERT INTO proyectos (id, nombre, descripcion, usuario_id, equipo_id) VALUES
  (1, 'Rediseño del sitio web', 'Migracion a React + Tailwind y nueva identidad visual.', 1, 1),
  (2, 'App móvil MVP', 'Primera version del producto para validar con usuarios.', 1, NULL);

-- Columnas Kanban para cada proyecto
INSERT INTO columnas (id, nombre, orden, proyecto_id) VALUES
  (1, 'Por hacer',    0, 1),
  (2, 'En progreso',  1, 1),
  (3, 'Hecho',        2, 1),
  (4, 'Por hacer',    0, 2),
  (5, 'En progreso',  1, 2),
  (6, 'Hecho',        2, 2);

-- Tareas (algunas asignadas a miembros del equipo)
INSERT INTO tareas
  (id, titulo, descripcion, prioridad, completada, orden, columna_id, proyecto_id, usuario_id, asignado_a, fecha_limite) VALUES
  (1, 'Definir paleta de colores', 'Elegir colores primarios y de acento.', 'alta', 0, 0, 1, 1, 1, 2, '2026-07-20'),
  (2, 'Maquetar landing page',     'Hero, features y footer responsive.',   'media', 0, 1, 1, 1, 1, 3, '2026-07-25'),
  (3, 'Configurar Tailwind',       'Instalar y ajustar el tema base.',      'baja', 1, 0, 3, 1, 1, 1, NULL),
  (4, 'Integrar API de auth',      'Login y registro con JWT.',             'alta', 0, 0, 2, 1, 1, 2, '2026-07-18'),
  (5, 'Wireframes de pantallas',   'Bocetos de las 5 pantallas clave.',     'media', 0, 0, 4, 2, 1, NULL, '2026-07-22'),
  (6, 'Elegir stack móvil',        'React Native vs Flutter.',              'alta', 1, 0, 6, 2, 1, NULL, NULL),
  (7, 'Setup del repositorio',     'Monorepo con backend y app.',           'baja', 0, 1, 5, 2, 1, NULL, '2026-07-15');

-- Etiquetas del usuario demo
INSERT INTO etiquetas (id, nombre, color, usuario_id) VALUES
  (1, 'Bug',      '#d97066', 1),
  (2, 'Diseño',   '#8dab7f', 1),
  (3, 'Urgente',  '#587b7f', 1);

INSERT INTO tarea_etiquetas (tarea_id, etiqueta_id) VALUES
  (1, 2), (4, 1), (4, 3);

-- Comentarios de ejemplo (conversacion en varias tareas del proyecto de equipo)
INSERT INTO comentarios (tarea_id, usuario_id, texto) VALUES
  (1, 1, 'Arranquemos con tonos verdes tierra.'),
  (1, 2, 'Perfecto, subo una propuesta hoy a la tarde.'),
  (1, 3, 'Me sumo a la revisión cuando esté lista.'),
  (4, 2, '¿Usamos JWT con expiración de 7 días?'),
  (4, 1, 'Sí, y refresh manual desde el login. Dale.'),
  (2, 3, 'Empecé con el hero, mañana sigo con el footer.');

-- Actividad de ejemplo (registro visible en el tablero)
INSERT INTO actividad (proyecto_id, usuario_id, accion, detalle) VALUES
  (1, 1, 'creo_proyecto', 'Rediseño del sitio web'),
  (1, 1, 'creo_tarea', 'Definir paleta de colores'),
  (1, 1, 'asigno', 'Definir paleta de colores a Ana Torres'),
  (1, 2, 'comento', 'en "Definir paleta de colores"'),
  (1, 3, 'comento', 'en "Maquetar landing page"'),
  (1, 1, 'creo_tarea', 'Integrar API de auth');

-- Notificaciones de ejemplo (para que cada usuario vea la campana con actividad)
INSERT INTO notificaciones (usuario_id, tipo, mensaje, enlace, leida) VALUES
  (2, 'asignacion', 'Te asignaron: Definir paleta de colores', '/proyectos/1', 0),
  (2, 'asignacion', 'Te asignaron: Integrar API de auth', '/proyectos/1', 0),
  (2, 'comentario', 'Nuevo comentario en "Definir paleta de colores"', '/proyectos/1', 0),
  (3, 'asignacion', 'Te asignaron: Maquetar landing page', '/proyectos/1', 0),
  (3, 'equipo', 'Te sumaron al equipo "Equipo Producto"', '/equipos', 1),
  (1, 'comentario', 'Ana comentó en "Definir paleta de colores"', '/proyectos/1', 0),
  (1, 'comentario', 'Luis comentó en "Maquetar landing page"', '/proyectos/1', 0);
