import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), 'tests', 'e2e', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const CHROME_PATH = process.env.CHROMIUM_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const routes = [
  { name: 'dashboard', path: '/' },
  { name: 'mapa', path: '/mapa' },
  { name: 'pos', path: '/pos' },
  { name: 'cocina', path: '/cocina' },
  { name: 'reservas', path: '/reservas' },
  { name: 'inventario', path: '/inventario' },
  { name: 'carta', path: '/carta' },
  { name: 'finanzas', path: '/finanzas' },
  { name: 'cierre', path: '/cierre' },
  { name: 'analitica', path: '/analitica' },
  { name: 'fidelizacion', path: '/fidelizacion' },
  { name: 'vasos', path: '/vasos' },
  { name: 'facturacion', path: '/facturacion' },
  { name: 'configuracion', path: '/configuracion' },
  { name: 'seguridad', path: '/seguridad' },
  { name: 'logs', path: '/logs' },
  { name: 'ayuda', path: '/ayuda' },
];

async function run() {
  console.log('Lanzando Chromium...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 820 }
  });

  const page = await context.newPage();

  // Iniciar sesión en el frontend web local (puerto 3000)
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);

  // Inyectar usuario Superadmin autenticado en localStorage
  await page.evaluate(() => {
    const user = {
      id: 1,
      name: 'Nacho',
      role: 'Superadmin',
      permissions: ['all', 'tables', 'admin', 'reports'],
      status: 'Active'
    };
    localStorage.setItem('bar_token', 'simulated_superadmin_token');
    localStorage.setItem('bar_user', JSON.stringify(user));
    localStorage.setItem('bar_allowed_tables', JSON.stringify(['all']));
    localStorage.setItem('sidebar_collapsed', 'false');
  });

  // Recargar para que tome la sesión
  await page.reload();
  await page.waitForTimeout(1500);

  console.log(`Generando capturas para ${routes.length} rutas...`);

  for (const r of routes) {
    console.log(`Ruta: ${r.name} (#${r.path})`);
    
    // Navegar a la ruta
    await page.evaluate((targetPath) => {
      window.location.hash = '#' + targetPath;
    }, r.path);
    await page.waitForTimeout(1200);

    // Modo Claro
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    });
    await page.waitForTimeout(400);
    const lightPath = path.join(OUT, `menu-${r.name}-light.png`);
    await page.screenshot({ path: lightPath });

    // Modo Oscuro
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    });
    await page.waitForTimeout(400);
    const darkPath = path.join(OUT, `menu-${r.name}-dark.png`);
    await page.screenshot({ path: darkPath });
  }

  await browser.close();
  console.log('Capturas generadas con éxito en', OUT);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
