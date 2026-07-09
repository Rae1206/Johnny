// Suite de integracion de la API Taskless.
// Fijar entorno de test ANTES de requerir la app/config.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'taskless_test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const createApp = require('../app');
const { pool } = require('../config/db');
const { setupTestDb } = require('./helpers/db');

const app = createApp();

let tDemo; // demo (owner del equipo 1)
let tAna; // ana (miembro del equipo 1)
let tBob; // usuario externo (sin equipo)
let proyectoNuevoId;
let tareaDemoId;
let tareaEquipoId;

async function login(email, password = 'Demo1234') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

before(async () => {
  await setupTestDb();
  tDemo = await login('demo@taskless.com');
  tAna = await login('ana@taskless.com');
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ nombre: 'Bob', email: 'bob@test.com', password: 'Bob12345' });
  tBob = reg.body.token;
});

after(async () => {
  await pool.end();
});

// ---------------- Health + Auth ----------------
test('GET /api/health -> 200', async () => {
  const r = await request(app).get('/api/health');
  assert.equal(r.status, 200);
});

test('login demo -> 200 + token', async () => {
  const r = await request(app).post('/api/auth/login').send({ email: 'demo@taskless.com', password: 'Demo1234' });
  assert.equal(r.status, 200);
  assert.ok(r.body.token);
});

test('login password incorrecta -> 401', async () => {
  const r = await request(app).post('/api/auth/login').send({ email: 'demo@taskless.com', password: 'x' });
  assert.equal(r.status, 401);
});

test('register email duplicado -> 400', async () => {
  const r = await request(app).post('/api/auth/register').send({ nombre: 'X', email: 'bob@test.com', password: 'Bob12345' });
  assert.equal(r.status, 400);
});

test('GET /api/proyectos sin token -> 401', async () => {
  assert.equal((await request(app).get('/api/proyectos')).status, 401);
});

// ---------------- Proyectos ----------------
test('demo ve sus 2 proyectos (1 de equipo + 1 personal)', async () => {
  const r = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${tDemo}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 2);
  // el listado incluye progreso
  assert.ok('total_tareas' in r.body[0]);
});

test('POST /api/proyectos crea proyecto + columnas', async () => {
  const r = await request(app).post('/api/proyectos').set('Authorization', `Bearer ${tDemo}`).send({ nombre: 'Proyecto test' });
  assert.equal(r.status, 201);
  proyectoNuevoId = r.body.id;
  const b = await request(app).get(`/api/proyectos/${proyectoNuevoId}/tareas`).set('Authorization', `Bearer ${tDemo}`);
  assert.equal(b.body.columnas.length, 3);
});

// ---------------- EQUIPOS: acceso por membresia (seguridad) ----------------
test('demo lista sus equipos -> 1', async () => {
  const r = await request(app).get('/api/equipos').set('Authorization', `Bearer ${tDemo}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 1);
  assert.equal(r.body[0].mi_rol, 'admin');
});

test('Ana (miembro) VE el proyecto del equipo', async () => {
  const r = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${tAna}`);
  assert.equal(r.status, 200);
  assert.ok(r.body.some((p) => p.nombre === 'Rediseño del sitio web'));
});

test('Ana NO ve el proyecto PERSONAL de demo', async () => {
  const r = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${tAna}`);
  assert.ok(!r.body.some((p) => p.nombre === 'App móvil MVP'));
});

test('Ana (miembro) puede abrir el tablero del proyecto de equipo', async () => {
  const r = await request(app).get('/api/proyectos/1/tareas').set('Authorization', `Bearer ${tAna}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.miembros.length, 3);
});

test('Bob (externo) NO puede abrir el tablero del equipo -> 404', async () => {
  const r = await request(app).get('/api/proyectos/1/tareas').set('Authorization', `Bearer ${tBob}`);
  assert.equal(r.status, 404);
});

test('Bob NO puede editar un proyecto ajeno -> 404', async () => {
  const r = await request(app).put(`/api/proyectos/${proyectoNuevoId}`).set('Authorization', `Bearer ${tBob}`).send({ nombre: 'hack' });
  assert.equal(r.status, 404);
});

test('Ana (miembro no-admin) NO puede agregar miembros -> 403', async () => {
  const r = await request(app).post('/api/equipos/1/miembros').set('Authorization', `Bearer ${tAna}`).send({ email: 'bob@test.com' });
  assert.equal(r.status, 403);
});

test('demo (admin) agrega a Bob al equipo -> 201, y Bob pasa a ver el proyecto', async () => {
  const add = await request(app).post('/api/equipos/1/miembros').set('Authorization', `Bearer ${tDemo}`).send({ email: 'bob@test.com' });
  assert.equal(add.status, 201);
  const r = await request(app).get('/api/proyectos').set('Authorization', `Bearer ${tBob}`);
  assert.ok(r.body.some((p) => p.nombre === 'Rediseño del sitio web'));
});

// ---------------- Tareas: asignacion + filtros ----------------
test('GET /api/tareas (demo) incluye proyecto y responsable', async () => {
  const r = await request(app).get('/api/tareas').set('Authorization', `Bearer ${tDemo}`);
  assert.equal(r.status, 200);
  const conAsignado = r.body.find((t) => t.asignado_a);
  assert.ok(conAsignado.asignado_nombre);
});

test('Ana ve "mis tareas" (asignadas a ella)', async () => {
  const r = await request(app).get('/api/tareas?mias=1').set('Authorization', `Bearer ${tAna}`);
  assert.equal(r.status, 200);
  assert.ok(r.body.length >= 1);
  assert.ok(r.body.every((t) => t.asignado_a === 2));
});

test('demo crea tarea en el proyecto de equipo y la asigna a Ana -> 201 + notifica', async () => {
  const r = await request(app).post('/api/tareas').set('Authorization', `Bearer ${tDemo}`)
    .send({ titulo: 'Tarea asignada', proyecto_id: 1, columna_id: 1, asignado_a: 2 });
  assert.equal(r.status, 201);
  assert.equal(r.body.asignado_nombre, 'Ana Torres');
  tareaEquipoId = r.body.id;

  const notif = await request(app).get('/api/notificaciones').set('Authorization', `Bearer ${tAna}`);
  assert.ok(notif.body.sin_leer >= 1);
});

test('busqueda ?q= filtra por titulo', async () => {
  const r = await request(app).get('/api/tareas?q=asignada').set('Authorization', `Bearer ${tDemo}`);
  assert.ok(r.body.some((t) => t.titulo.includes('asignada')));
});

test('POST /api/tareas sin titulo -> 400', async () => {
  const r = await request(app).post('/api/tareas').set('Authorization', `Bearer ${tDemo}`).send({ prioridad: 'media' });
  assert.equal(r.status, 400);
});

test('crear tarea personal suelta -> 201', async () => {
  const r = await request(app).post('/api/tareas').set('Authorization', `Bearer ${tDemo}`).send({ titulo: 'Suelta', prioridad: 'alta' });
  assert.equal(r.status, 201);
  assert.equal(r.body.proyecto_id, null);
  tareaDemoId = r.body.id;
});

test('marcar completada', async () => {
  const r = await request(app).put(`/api/tareas/${tareaDemoId}`).set('Authorization', `Bearer ${tDemo}`).send({ completada: true });
  assert.equal(r.body.completada, 1);
});

// ---------------- Comentarios ----------------
test('Ana comenta en una tarea del equipo -> 201', async () => {
  const r = await request(app).post(`/api/tareas/${tareaEquipoId}/comentarios`).set('Authorization', `Bearer ${tAna}`).send({ texto: 'Voy con esto' });
  assert.equal(r.status, 201);
  assert.equal(r.body.usuario_nombre, 'Ana Torres');
  const list = await request(app).get(`/api/tareas/${tareaEquipoId}/comentarios`).set('Authorization', `Bearer ${tDemo}`);
  assert.ok(list.body.length >= 1);
});

// ---------------- Etiquetas ----------------
test('crear etiqueta y asignarla a una tarea', async () => {
  const et = await request(app).post('/api/etiquetas').set('Authorization', `Bearer ${tDemo}`).send({ nombre: 'QA', color: '#587b7f' });
  assert.equal(et.status, 201);
  const asg = await request(app).post(`/api/tareas/${tareaDemoId}/etiquetas`).set('Authorization', `Bearer ${tDemo}`).send({ etiqueta_id: et.body.id });
  assert.equal(asg.status, 201);
});

// ---------------- Perfil ----------------
test('cambiar contraseña con actual incorrecta -> 400', async () => {
  const r = await request(app).put('/api/perfil/password').set('Authorization', `Bearer ${tBob}`).send({ actual: 'mala', nueva: 'NuevaClave1' });
  assert.equal(r.status, 400);
});

test('editar nombre de perfil -> 200', async () => {
  const r = await request(app).put('/api/perfil').set('Authorization', `Bearer ${tBob}`).send({ nombre: 'Bob Editado' });
  assert.equal(r.status, 200);
  assert.equal(r.body.nombre, 'Bob Editado');
});

// ---------------- Limpieza / 404 ----------------
test('DELETE tarea propia -> 200', async () => {
  const r = await request(app).delete(`/api/tareas/${tareaDemoId}`).set('Authorization', `Bearer ${tDemo}`);
  assert.equal(r.status, 200);
});

test('ruta inexistente -> 404', async () => {
  const r = await request(app).get('/api/no-existe').set('Authorization', `Bearer ${tDemo}`);
  assert.equal(r.status, 404);
});
