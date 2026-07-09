# Taskless — Gestor de Proyectos y Tareas (Kanban)

**Repositorio:** [https://github.com/Rae1206/Johnny](https://github.com/Rae1206/Johnny)

Aplicación web full-stack para gestionar proyectos y tareas con tablero Kanban,
arrastre de tarjetas (drag & drop), autenticación con JWT y buenas prácticas de
seguridad.

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
3. Con eso ya tienes MySQL corriendo en `localhost:3306`, usuario `root` **sin contraseña**.

### Windows / macOS / Linux (instalador oficial)

- Descarga MySQL Community Server desde <https://dev.mysql.com/downloads/mysql/>.
- Durante la instalación te pedirá definir una contraseña para el usuario `root`.
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

## Paso 3 — Configurar los datos de tu MySQL

Toda la configuración vive en **un solo archivo**: `backend/config/local.js`
(no hay que crear ningún `.env`). Ábrelo y ajusta **solo** los datos de tu MySQL:

```js
module.exports = {
  PORT: 4000,
  CLIENT_ORIGIN: 'http://localhost:5173',

  DB_HOST: 'localhost',
  DB_PORT: 3306,
  DB_USER: 'root',        // <-- tu usuario de MySQL
  DB_PASSWORD: 'admin',   // <-- tu contraseña de MySQL (vacía '' si usas XAMPP)
  DB_NAME: 'taskless',

  JWT_SECRET: 'taskless_dev_secret_change_in_prod_0e3f9a1b7c',
  JWT_EXPIRES_IN: '7d',
};
```

- Si instalaste con **XAMPP**, deja `DB_USER: 'root'` y `DB_PASSWORD: ''` (vacío).
- Si usaste el **instalador oficial**, pon la contraseña que definiste.

> Este es el único paso que cambia de una computadora a otra.

---

## Paso 4 — Backend: instalar, crear la base y arrancar

En una terminal:

```bash
cd backend
npm install       # instala las dependencias
npm run setup     # crea la base 'taskless' con tablas y datos de ejemplo
npm start         # inicia la API en http://localhost:4000
```

Deja esta terminal abierta (el servidor tiene que seguir corriendo).

Si `npm run setup` falla, casi siempre es porque MySQL no está corriendo o
porque el usuario/contraseña del Paso 3 no coinciden. El propio comando te dice
qué revisar.

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

Una vez hecha la instalación, para volver a usar la app solo hay que tener MySQL
corriendo y ejecutar, en dos terminales:

```bash
cd backend  && npm start      # API
cd frontend && npm run dev    # App
```

> **Atajo en Windows:** el repositorio incluye `INICIAR.bat` y `PARAR.bat`.
> `INICIAR.bat` es idempotente: solo arranca lo que no esté ya corriendo, así que
> podés ejecutarlo varias veces sin crear instancias duplicadas (dos MySQL sobre
> el mismo data directory, o dos backends en el mismo puerto, se pisan y fallan).
> `PARAR.bat` apaga todo limpio para reiniciar sin procesos colgados.
> (Con XAMPP, inicia MySQL desde su panel y luego usa los dos comandos de arriba.)

---

## Funcionalidades

- **Autenticación:** registro y login con contraseñas hasheadas (bcrypt) y sesión JWT.
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

Respuestas JSON con códigos HTTP correctos (200, 201, 400, 401, 403, 404, 500).
La suite de tests (`npm test`) cubre 28 casos, incluido el aislamiento entre
usuarios y equipos.

---

## Seguridad implementada y vulnerabilidades mitigadas

| # | Medida | Dónde | Vulnerabilidad mitigada |
| - | ------ | ----- | ----------------------- |
| 1 | **Consultas parametrizadas** (placeholders `?` de mysql2) en TODAS las queries | `controllers/*` | **SQL Injection** |
| 2 | **Validación de formularios** — cliente (campos requeridos, email, longitud, feedback visual) y servidor (`express-validator` en cada POST/PUT) | `pages/*`, `routes/*` | Datos malformados, inyección de payloads |
| 3 | **CORS restringido** al origen del frontend (`http://localhost:5173`), nunca `*` | `server.js` | Acceso cross-origin no autorizado |
| 4 | **Hash de contraseñas** con bcrypt (10 salt rounds); nunca texto plano | `auth.controller.js` | **Exposición de credenciales** |
| 5 | **Autenticación + autorización** — JWT (`verifyToken`) protege todas las rutas de proyectos/tareas; cada query filtra por `usuario_id` del token | `middlewares/verifyToken.js`, `controllers/*` | **Acceso no autorizado** a recursos ajenos |
| 6 | **Configuración fuera del código de negocio** (`config/`), con `.env` real ignorado por git | `config/`, `.gitignore` | Secretos dispersos / hardcodeados |
| 7 | **Helmet** — cabeceras HTTP seguras | `server.js` | **Cabeceras inseguras**, clickjacking, sniffing |
| 8 | **Rate limiting** en `/api/auth/*` (20 intentos / 15 min por IP) | `server.js` | **Fuerza bruta** en login/registro |
| 9 | **Sanitización de entradas** (neutraliza `<` y `>`) en campos de texto | `middlewares/validate.js` | **XSS** (Cross-Site Scripting) |
| 10 | **Manejo centralizado de errores** — nunca se exponen stack traces al cliente | `middlewares/errorHandler.js` | Fuga de información interna |

> **Nota sobre la configuración:** en este proyecto de práctica, `backend/config/local.js`
> se incluye en el repositorio a propósito (credenciales de desarrollo, no
> sensibles) para que descargar y ejecutar sea inmediato. En un proyecto real,
> ese archivo iría en `.gitignore` y cada persona pondría sus propios secretos.
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
de `taskless`. Requieren un MySQL corriendo con las credenciales de `config/local.js`.

---

## Estructura del proyecto

```
.
├── INICIAR.bat                 # (Windows) arranque de un clic
├── backend/
│   ├── config/
│   │   ├── env.js              # configuración central (defaults + local.js + .env)
│   │   └── local.js            # datos de MySQL a editar
│   ├── controllers/            # lógica de auth, proyectos y tareas
│   ├── db/database.sql         # esquema + datos de ejemplo
│   ├── middlewares/            # verifyToken, validate, errorHandler
│   ├── routes/                 # endpoints + validación
│   ├── scripts/setup-db.js     # crea e importa la base (npm run setup)
│   ├── package.json
│   └── server.js               # Helmet, CORS, rate limit, arranque
└── frontend/
    ├── src/
    │   ├── components/          # Layout, TaskModal
    │   ├── context/            # AuthContext (JWT en localStorage)
    │   ├── lib/                # axios + helpers de UI
    │   ├── pages/              # Login, Register, Projects, Board, Tasks
    │   ├── App.jsx             # rutas + guardia de rutas protegidas
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```
