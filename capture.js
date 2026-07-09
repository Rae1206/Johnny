const { chromium, devices } = require('playwright');
const path = require('path');

const CAPTURAS_DIR = path.join(__dirname, 'docs', 'entrega-academica', 'capturas');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  // Wait a bit to ensure frontend is fully loaded
  await wait(3000);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Capturando 02-inicio-sesion...');
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('load');
  await page.screenshot({ path: path.join(CAPTURAS_DIR, '02-inicio-sesion.png') });

  // Do login
  console.log('Haciendo login...');
  await page.fill('input[type="email"]', 'demo@taskless.com');
  await page.fill('input[type="password"]', 'Demo1234');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await wait(2000);

  console.log('Capturando 01-pantalla-principal...');
  // After login, it should be on Tasks page (/)
  await page.screenshot({ path: path.join(CAPTURAS_DIR, '01-pantalla-principal.png') });

  console.log('Capturando 03-nuevo-proyecto...');
  await page.goto('http://localhost:5173/proyectos');
  await page.waitForLoadState('networkidle');
  await page.click('text=Nuevo proyecto');
  await wait(1000);
  await page.screenshot({ path: path.join(CAPTURAS_DIR, '03-nuevo-proyecto.png') });
  
  // cancel modal
  await page.click('text=Cancelar');
  await wait(1000);

  console.log('Capturando 04-tablero-kanban...');
  // Click on the first project's "Abrir tablero"
  await page.click('text=Abrir tablero');
  await page.waitForLoadState('networkidle');
  await wait(2000);
  await page.screenshot({ path: path.join(CAPTURAS_DIR, '04-tablero-kanban.png') });
  
  console.log('Capturando 07-detalle-tarea...');
  // Click on the first task's title button
  const taskTitle = await page.$('button.text-left.text-sm');
  if (taskTitle) {
    await taskTitle.click();
    await wait(1000);
    await page.screenshot({ path: path.join(CAPTURAS_DIR, '07-detalle-tarea.png') });
    // Click outside to close TaskDetailModal since it uses bg-black/50 for overlay
    await page.mouse.click(10, 10);
    await wait(1000);
  }

  console.log('Capturando 05-administracion-equipo...');
  await page.goto('http://localhost:5173/equipos');
  await page.waitForLoadState('networkidle');
  await wait(2000);
  await page.screenshot({ path: path.join(CAPTURAS_DIR, '05-administracion-equipo.png') });

  console.log('Capturando 06-vista-movil...');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 12'],
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/');
  await mobilePage.waitForLoadState('networkidle');
  await wait(2000);
  await mobilePage.screenshot({ path: path.join(CAPTURAS_DIR, '06-vista-movil.png') });

  await browser.close();
  console.log('Capturas terminadas.');
})();
