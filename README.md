# Taskless — Gestor de Proyectos y Tareas (Kanban)

**Repositorio:** [https://github.com/Rae1206/Johnny](https://github.com/Rae1206/Johnny)

Aplicación web full-stack para gestionar proyectos y tareas con tablero Kanban,
arrastre de tarjetas (drag & drop), autenticación con access token corto en
memoria + refresh cookie HttpOnly y buenas prácticas de seguridad.

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router + axios + `@hello-pangea/dnd`
- **Backend:** Node.js + Express (API REST)
- **Base de datos:** MySQL 8 (`mysql2/promise`, pool de conexiones)
- **Arquitectura:** cliente-servidor de 3 capas. Backend separado en
  `routes/`, `controllers/`, `middlewares/`, `config/`, `db/`.

---

## Requisitos previos

Antes de empezar necesitas tener instalado en tu computadora:

| Programa | Para qué | Cómo verificar |
| -------- | -------- | -------------- |
| **Node.js 18+** | Ejecuta el backend y el frontend | `node -v` |
| **MySQL 8+** | Base de datos | `mysql --version` |
| **Git** | Descargar el repositorio | `git --version` |

Si te falta alguno, en la siguiente sección se explica cómo instalar MySQL
(Node.js y Git se instalan desde <https://nodejs.org> y <https://git-scm.com>).

---

## Paso 1 — Instalar MySQL (si no lo tienes)

Elige **una** de estas opciones según tu sistema.

### Windows (opción recomendada para principiantes: XAMPP)

1. Descarga XAMPP desde <https://www.apachefriends.org> e instálalo.
2. Abre el **Panel de Control de XAMPP** y presiona **Start** en la fila de MySQL.
3. Con eso ya tienes MySQL corriendo en `localhost:3306`.

### Windows / macOS / Linux (instalador oficial)

- Descarga MySQL Community Server desde <https://dev.mysql.com/downloads/mysql/>.
- Durante la instalación te pedirá definir una contraseña para tu usuario MySQL.
  **Anótala**, la vas a necesitar en el Paso 3.

### Alternativa por línea de comandos

- Windows con [scoop](https://scoop.sh): `scoop install mysql` y luego `mysqld --console`
- macOS con Homebrew: `brew install mysql` y luego `brew services start mysql`
- Ubuntu/Debian: `sudo apt install mysql-server` (se inicia como servicio)

> Lo importante es que, al terminar este paso, tengas un **servidor MySQL
> corriendo** y sepas su **usuario, contraseña y puerto**.

---

## Paso 2 — Descargar el proyecto

```bash
git clone https://github.com/Rae1206/Johnny.git
cd Johnny
```

---

## Paso 3 — Arranque local de un clic (recomendado)

1. Doble clic en `INICIAR.bat`.
2. Si tu configuración apunta a MySQL local y está apagado, el script lo levanta solo.

No hay preguntas ni asistente interactivo: el arranque usa la configuración efectiva de `backend/config/env.js` (defaults locales + `.env`), genera un `JWT_SECRET` local en `backend/.env` si falta y levanta la base configurada solo si todavía no existe.

> `backend/config/local.js` es el archivo editable y trackeado para los valores de desarrollo locales.
> En producción, `.env` y las variables de entorno siguen teniendo prioridad.

---

## Paso 4 — Reset destructivo manual (opcional)

Si querés reconstruir `taskless` desde cero, ejecutá:

```bash
cd backend
npm run setup
```

Ese comando **sí** borra y recrea la base `taskless` usando `db/database.sql`.
Es el único flujo destructivo del proyecto y no forma parte del arranque normal.

---

## Paso 5 — Frontend: instalar y arrancar

Abre **otra** terminal (sin cerrar la del backend):

```bash
cd frontend
npm install
npm run dev       # inicia la app en http://localhost:5173
```

Abre <http://localhost:5173> en el navegador.

---

## Iniciar sesión

Usa cualquiera de las cuentas de demostración (todas comparten la contraseña
`Demo1234`). Las tres pertenecen al equipo **"Equipo Producto"**, así que podés
probar la colaboración: proyectos compartidos, asignación de tareas y comentarios.

| Email               | Contraseña | Rol en el equipo |
| ------------------- | ---------- | ---------------- |
| `demo@taskless.com` | `Demo1234` | Admin (dueño)    |
| `ana@taskless.com`  | `Demo1234` | Miembro          |
| `luis@taskless.com` | `Demo1234` | Miembro          |

Entrá con `demo` en una pestaña y con `ana` en otra (ventana de incógnito) para
ver cómo comparten el proyecto de equipo. También puedes crear una cuenta nueva
desde la pantalla de registro.

---

## Cómo iniciar la próxima vez

La forma normal es repetir `INICIAR.bat`. No pregunta nada y no depende de un bootstrap interactivo.

> `PARAR.bat` apaga todo limpio para reiniciar sin procesos colgados.
> Si preferís abrir los procesos a mano, primero dejá listo `backend/.env` o usá los defaults de `backend/config/local.js`.

---

## Funcionalidades

- **Autenticación:** registro/login con access JWT de 15 minutos en memoria y refresh token opaco en cookie HttpOnly.
- **Layout responsive:** sidebar (colapsable en móvil), header con notificaciones,
  tema claro/oscuro, avatar/perfil y cierre de sesión.
- **Equipos:** crear equipos, invitar miembros por email, asignar roles
  (admin/miembro) y quitarlos. **Acceso por membresía:** un proyecto de equipo lo
  ven todos sus miembros; quien no es miembro, no lo ve.
- **Proyectos:** cards con **barra de progreso** (% completadas) y badge de equipo.
  CRUD completo. Cada proyecto abre un **tablero Kanban** ("Por hacer", "En
  progreso", "Hecho").
- **Tablero Kanban:** CRUD de tareas + **drag & drop** (con `<select>` de columna
  como alternativa). Cada tarjeta muestra título, prioridad, fecha límite,
  **responsable** (avatar), **etiquetas** de color y resalte de **vencidas**.
- **Detalle de tarea:** descripción completa, responsable, etiquetas y
  **comentarios** en tiempo (conversación por tarea).
- **Tareas (pantalla principal):** lista reciente con **búsqueda**, filtros por
  prioridad/estado, atajo **"Mis tareas"** (asignadas a mí), y salto rápido al
  proyecto. Marcar completada y eliminar.
- **Asignación:** asigná tareas a miembros del equipo; el responsable recibe una
  **notificación** in-app.
- **Notificaciones:** campana con contador de no leídas (asignaciones, comentarios,
  invitaciones a equipos).
- **Perfil:** editar nombre y cambiar contraseña. **Tema oscuro** conmutable.

---

## API REST

| Método | Ruta                        | Descripción                          |
| ------ | --------------------------- | ------------------------------------ |
| POST   | `/api/auth/register`        | Registro                             |
| POST   | `/api/auth/login`           | Login                                |
| POST   | `/api/auth/refresh`         | Renovar access token con cookie      |
| POST   | `/api/auth/logout`          | Revocar refresh token y cerrar sesión |
| GET    | `/api/proyectos`            | Listar proyectos del usuario         |
| POST   | `/api/proyectos`            | Crear proyecto (+ columnas Kanban)   |
| PUT    | `/api/proyectos/:id`        | Editar proyecto                      |
| DELETE | `/api/proyectos/:id`        | Eliminar proyecto (cascade)          |
| GET    | `/api/proyectos/:id/tareas` | Tablero: columnas + tareas           |
| GET    | `/api/proyectos/:id/actividad` | Registro de actividad del proyecto |
| GET    | `/api/tareas`               | Tareas recientes (filtros, `q`, `mias`, paginación) |
| POST   | `/api/tareas`               | Crear tarea (con responsable)        |
| PUT    | `/api/tareas/:id`           | Editar tarea (mover, asignar, etc.)  |
| DELETE | `/api/tareas/:id`           | Eliminar tarea                       |
| GET/POST | `/api/tareas/:id/comentarios` | Comentarios de una tarea        |
| POST/DELETE | `/api/tareas/:id/etiquetas[/:etiquetaId]` | Etiquetas de una tarea |
| GET/POST/PUT/DELETE | `/api/equipos[...]`  | Equipos + miembros (roles)       |
| GET/POST/DELETE | `/api/etiquetas[/:id]`   | Etiquetas del usuario           |
| GET/PUT | `/api/notificaciones[...]` | Notificaciones (marcar leídas)     |
| GET/PUT | `/api/perfil[/password]`  | Perfil y cambio de contraseña        |

Respuestas JSON con códigos HTTP correctos (200, 201, 204, 400, 401, 403, 404, 429, 500).
La suite de tests (`npm test`) cubre autenticación, rotación de refresh,
logout, validaciones, rate limiting y aislamiento entre usuarios y equipos.

---

## Seguridad implementada y vulnerabilidades mitigadas

| Categoría | Riesgo previo | Mitigación aplicada |
| --- | --- | --- |
| Autenticación de sesión | Un JWT único y largo vivía en `localStorage`, así que podía robarse por XSS y duraba demasiado. | Access JWT de 15 minutos, devuelto solo en JSON y guardado solo en memoria React. |
| Cookies y refresh | No había cookie segura ni rotación formal del refresh token. | Cookie `taskless_refresh_token` con `HttpOnly`, `Secure`, `SameSite=Strict`, `path=/api/auth`, `maxAge=7d`; refresh token opaco con hash SHA-256 en DB, rotación y revocación en `/api/auth/refresh` y `/api/auth/logout`; si un refresh revocado/rotado/reutilizado aparece, se revoca toda su familia válida. El access token puede seguir vivo hasta sus 15 minutos de expiración aunque el usuario haga logout; el cierre real de sesión revoca la familia de refresh. |
| Abuso y brute force | Las rutas sensibles no tenían límites estrictos por operación. | `/api/auth/*`: 20 requests / 15 min. Rutas protegidas: 150 requests / min. |
| Contraseñas | El alta/cambio aceptaba claves débiles. | Mínimo 8 caracteres, al menos una mayúscula y un número; el frontend muestra el requisito y el backend valida igual. |
| JWT secret | El backend aceptaba un fallback conocido para firmar tokens. | `JWT_SECRET` se genera automáticamente en `backend/.env` con Node crypto; no se commitea. |

Además se mantienen las defensas base del proyecto: consultas parametrizadas, CORS restringido, Helmet, sanitización de entrada y manejo centralizado de errores.

> **Nota importante:** las cookies `Secure` del flujo de refresh requieren HTTPS en un navegador real. Si montás el frontend/backend fuera de `localhost`, usá TLS o un proxy HTTPS.

> **Nota sobre la configuración:** `backend/config/local.js` trae los defaults locales editables (incluida la DB `taskless`); `backend/.env` y las variables de entorno siguen sobreescribiendo esos valores. `INICIAR.bat` y `scripts/init-local-db.js` leen esa misma configuración efectiva, sin prompts.
>
> **Nota operativa:** si venís de una instalación anterior, borrá o regenerá `backend/.env` (al menos `JWT_SECRET`) una vez después de actualizar para que `INICIAR.bat` cree una clave nueva por instalación.
>
> Sobre bcrypt: se usa `bcryptjs` (implementación JS pura, compatible con los
> hashes de `bcrypt`) para evitar problemas de compilación de módulos nativos en
> Windows. Los hashes son intercambiables.

---

## Tests

El backend incluye una suite de tests de integración (Node test runner + supertest)
que ejercita **todos** los endpoints: autenticación, CRUD de proyectos y tareas,
filtros, validaciones y aislamiento entre usuarios.

```bash
cd backend
npm test
```

Los tests corren contra una base **separada** (`taskless_test`) que se crea y
siembra automáticamente desde `db/database.sql`, por lo que **no tocan tus datos**
de `taskless`.

---

## Estructura del proyecto

```
.
├── INICIAR.bat                 # (Windows) arranque de un clic
├── backend/
│   ├── config/
│   │   ├── env.js              # configuración central (backend/.env + local.js)
│   │   ├── local.js            # defaults locales editables para desarrollo
│   │   └── .env.example        # plantilla local sin credenciales reales
│   ├── controllers/            # lógica de auth, proyectos y tareas
│   ├── db/database.sql         # esquema + datos de ejemplo
│   ├── middlewares/            # verifyToken, validate, rateLimiters, errorHandler
│   ├── routes/                 # endpoints + validación
│   ├── scripts/ensure-local-env.js # genera JWT_SECRET local en backend/.env
│   ├── scripts/init-local-db.js # inicializador seguro: crea/importa solo si falta
│   ├── scripts/setup-db.js     # reset destructivo explícito (npm run setup)
│   ├── package.json
│   └── server.js               # Helmet, CORS, rate limit, arranque
└── frontend/
    ├── src/
    │   ├── components/          # Layout, TaskModal
    │   ├── context/            # AuthContext (access token en memoria)
    │   ├── lib/                # axios + helpers de UI
    │   ├── pages/              # Login, Register, Projects, Board, Tasks
    │   ├── App.jsx             # rutas + guardia de rutas protegidas
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```
