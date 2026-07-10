const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');
const { Afip } = require('afip.ts');
const forge = require('node-forge');
const QRCode = require('qrcode');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const userDataPath = app.getPath('userData');

let win;

let expressServer = null;
const SERVER_PORT = 3001;

// Configuración de Supabase global para compartir con clientes remotos
let globalSupabaseActive = false;
let globalSupabaseUrl = "";
let globalSupabaseAnonKey = "";

// Inicializar Express
const expressApp = express();
expressApp.use(express.json());

// Permitir CORS
expressApp.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Servir archivos estáticos en producción
const distPath = path.join(__dirname, '../dist');
expressApp.use(express.static(distPath));

// API de Información de Sincronización
expressApp.get('/api/sync-info', (req, res) => {
  res.json({
    supabaseActive: globalSupabaseActive,
    supabaseUrl: globalSupabaseUrl,
    supabaseAnonKey: globalSupabaseAnonKey
  });
});

// Express a IPC Bridge para redireccionar base de datos
const pendingRequests = new Map();

expressApp.all('/api/db/:table/:id?', (req, res) => {
  if (!win) {
    return res.status(503).json({ error: 'La ventana de Electron no está lista' });
  }

  const requestId = Math.random().toString(36).substring(7);
  pendingRequests.set(requestId, res);

  win.webContents.send('db-request', {
    requestId,
    table: req.params.table,
    id: req.params.id,
    method: req.method,
    body: req.body,
    query: req.query
  });

  // Timeout para evitar peticiones colgadas
  setTimeout(() => {
    if (pendingRequests.has(requestId)) {
      pendingRequests.delete(requestId);
      res.status(504).json({ error: 'Timeout esperando respuesta del proceso renderizado (Dexie)' });
    }
  }, 12000);
});

// Ruta fallback para el ruteo SPA en el cliente de producción
expressApp.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Responder a la petición de datos desde el Renderer
ipcMain.on('db-response', (event, { requestId, success, data, error }) => {
  const res = pendingRequests.get(requestId);
  if (res) {
    pendingRequests.delete(requestId);
    if (success) {
      res.json(data);
    } else {
      res.status(500).json({ error: error || 'Error interno del servidor de base de datos' });
    }
  }
});

// Servidor Express
function startExpressServer() {
  expressServer = expressApp.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`Servidor local Express corriendo en http://localhost:${SERVER_PORT}`);
  });
}

function createWindow() {
  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdatesAndNotify();
  
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  // En producción, cargamos el servidor local Express. En desarrollo, usamos Vite (puerto 3000)
  if (app.isPackaged) {
    win.loadURL(`http://localhost:${SERVER_PORT}`);
  } else {
    win.loadURL('http://localhost:3000');
  }

  // Eventos del actualizador
  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-not-available');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    win.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-downloaded');
  });

  autoUpdater.on('error', (err) => {
    win.webContents.send('update-error', err.message);
  });
}

// IPC Handlers para control de ngrok
let activeListener = null;
let currentTunnelUrl = null;

ipcMain.handle('start-ngrok', async (event, { token, port }) => {
  try {
    if (activeListener) {
      await activeListener.close();
      activeListener = null;
      currentTunnelUrl = null;
    }
    const ngrok = require('@ngrok/ngrok');
    // Si estamos en desarrollo, ngrok apunta a Vite (3000). En prod, a Express (3001).
    const targetPort = port || (app.isPackaged ? SERVER_PORT : 3000);
    activeListener = await ngrok.forward({ addr: targetPort, authtoken: token });
    currentTunnelUrl = activeListener.url();
    console.log(`Túnel ngrok activo en: ${currentTunnelUrl}`);
    return { success: true, url: currentTunnelUrl };
  } catch (err) {
    console.error('Error al iniciar túnel ngrok:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-ngrok', async () => {
  try {
    if (activeListener) {
      await activeListener.close();
      activeListener = null;
      currentTunnelUrl = null;
      console.log('Túnel ngrok cerrado');
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-ngrok-status', () => {
  return {
    active: !!activeListener,
    url: currentTunnelUrl
  };
});

// Guardar configuración de Supabase compartida
ipcMain.on('set-supabase-config', (event, config) => {
  globalSupabaseActive = config.active;
  globalSupabaseUrl = config.url;
  globalSupabaseAnonKey = config.anonKey;
  console.log(`Configuración de Supabase guardada. Activa: ${globalSupabaseActive}`);
});

// IPC auto-updater
ipcMain.on('check-update', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on('start-download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('apply-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion();
});

app.whenReady().then(() => {
  startExpressServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (expressServer) {
    expressServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- ARCA (AFIP) INTEGRATION ---

function getAfipInstance(arcaInfo) {
  const certDir = isDev 
    ? path.join(__dirname, '..', 'certs') 
    : path.join(process.resourcesPath, 'certs');
  
  let certPath = arcaInfo.certPath;
  let keyPath = arcaInfo.keyPath;

  // Auto-detect if not provided or doesn't exist
  if (!certPath || !fs.existsSync(certPath) || !keyPath || !fs.existsSync(keyPath)) {
    if (fs.existsSync(certDir)) {
      const files = fs.readdirSync(certDir);
      certPath = certPath || path.join(certDir, files.find(f => f.endsWith('.crt')) || '');
      keyPath = keyPath || path.join(certDir, files.find(f => f.endsWith('.key')) || '');
    }
  }

  if (!certPath || !keyPath || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error('No se encontraron los archivos de certificado (.crt) o llave (.key) requeridos.');
  }

  // Ensure tickets directory exists in APPDATA
  const ticketsDir = path.join(userDataPath, 'afip_tickets');
  if (!fs.existsSync(ticketsDir)) {
    fs.mkdirSync(ticketsDir, { recursive: true });
  }

  const cleanCuit = arcaInfo.cuit.replace(/[^0-9]/g, '');
  
  return new Afip({
    cuit: parseInt(cleanCuit),
    cert: fs.readFileSync(certPath, 'utf8'),
    key: fs.readFileSync(keyPath, 'utf8'),
    production: arcaInfo.productionMode === true,
    ticketPath: ticketsDir
  });
}

// PDF Generation Engine
async function generatePDF(templateData, savePath) {
  return new Promise((resolve, reject) => {
    let pdfWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    
    const s = templateData.settings || {};
    
    // Paleta de colores
    const palettes = {
      slate: { primary: '#1e293b', secondary: '#94a3b8', text: '#ffffff' },
      blue: { primary: '#1e3a8a', secondary: '#60a5fa', text: '#ffffff' },
      emerald: { primary: '#064e3b', secondary: '#34d299', text: '#ffffff' },
      amber: { primary: '#78350f', secondary: '#fbc124', text: '#ffffff' },
      monochrome: { primary: '#000000', secondary: '#71717a', text: '#ffffff' },
      soft_white: { primary: '#f1f5f9', secondary: '#cbd5e1', text: '#1e293b' }
    };
    const activePalette = palettes[s.pdfColorPalette || 'slate'] || palettes.slate;

    // Logo del Comercio
    const showLogo = s.pdfLogoPosition !== 'oculto' && s.invoiceLogo;
    const logoBase64 = s.invoiceLogo || '';
    const logoWidth = s.pdfLogoSizeWidth || 30;
    const logoX = s.pdfLogoX || 15;
    const logoY = s.pdfLogoY || 12;

    // Altura y márgenes
    const headerHeight = s.pdfHeaderHeight || 55;
    const companyNameSize = s.pdfCompanyNameSize || 16;
    const companyNameY = s.pdfCompanyNameY || 25;
    const leftColAlign = s.pdfLeftColAlign || 'centrado';
    const leftColX = s.pdfLeftColX || 15;
    const rightColX = s.pdfRightColX || 110;
    const rightColY = s.pdfRightColY || 15;
    const rightColTitleSize = s.pdfRightColTitleSize || 18;
    const rightColDetailsSize = s.pdfRightColDetailsSize || 9;
    const invoiceTypeX = s.pdfInvoiceTypeX || 95;
    const invoiceTypeY = s.pdfInvoiceTypeY || 10;

    // Emisor address and details
    const emisorName = s.nombreFantasia || templateData.emisorName;
    const emisorDom = s.domicilioComercial || templateData.emisorDom;
    const ingresosBrutos = s.ingresosBrutos || templateData.emisorCuit;
    const inicioActividades = s.monotributoStartDate ? new Date(s.monotributoStartDate).toLocaleDateString('es-AR') : templateData.inicioActividades;

    // Logo LYNX / Branding
    const showLynx = s.pdfLynxPosition !== 'oculto';
    const lynxPosition = s.pdfLynxPosition || 'abajo_derecha';
    const lynxSize = s.pdfLynxSize || 25;
    const lynxOpacity = s.pdfLynxOpacity || 0.08;
    const lynxLogoBase64 = s.pdfLynxLogo || '';

    const html = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            body { font-family: 'Roboto', sans-serif; padding: 20px; color: #000; font-size: 11px; margin: 0; }
            .container { border: 1px solid ${activePalette.primary}; padding: 15px; border-radius: 8px; position: relative; }
            
            /* Cabecera */
            .header { border: 1.5px solid ${activePalette.primary}; display: flex; align-items: stretch; height: ${headerHeight}mm; position: relative; box-sizing: border-box; }
            .header-left { width: 50%; padding: 10px; border-right: 1px solid ${activePalette.primary}; display: flex; flex-direction: column; justify-content: flex-start; align-items: ${leftColAlign === 'centrado' ? 'center' : 'flex-start'}; text-align: ${leftColAlign === 'centrado' ? 'center' : 'left'}; box-sizing: border-box; }
            .header-right { width: 50%; padding: 10px; box-sizing: border-box; position: relative; padding-left: 20px; }
            
            /* Tipo de Comprobante C */
            .letter-box { position: absolute; left: calc(50% - 10mm); top: -0.5px; border: 1.5px solid ${activePalette.primary}; background: ${activePalette.primary}; color: ${activePalette.text}; width: 20mm; height: 20mm; text-align: center; z-index: 10; font-size: 26px; font-weight: bold; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .letter-box span { display: block; font-size: 8px; font-weight: normal; margin-top: 2px; }
            
            .emisor-name { font-size: ${companyNameSize}px; font-weight: bold; margin-bottom: 5px; color: ${activePalette.primary}; text-transform: uppercase; }
            .emisor-info { line-height: 1.5; font-size: 9px; color: #334155; }
            
            .invoice-type { font-size: ${rightColTitleSize}px; font-weight: 700; color: ${activePalette.primary}; margin-bottom: 8px; text-transform: uppercase; }
            .invoice-details { line-height: 1.4; font-size: ${rightColDetailsSize}px; }

            /* Logo del comercio */
            .logo-img { max-width: ${logoWidth}mm; height: auto; margin-bottom: 8px; }

            /* Datos Receptor */
            .section-title { background: ${activePalette.primary}; color: ${activePalette.text}; padding: 6px 12px; font-weight: bold; border-radius: 4px; margin-top: 15px; margin-bottom: 0; font-size: 10px; letter-spacing: 0.05em; }
            .client-info { border: 1px solid ${activePalette.primary}; border-top: none; padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; }
            
            /* Tabla */
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1.5px solid ${activePalette.primary}; }
            th { border: 1px solid ${activePalette.primary}; background: ${activePalette.primary}; color: ${activePalette.text}; padding: 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { border: 1px solid ${activePalette.secondary}; padding: 8px; font-size: 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            
            /* Totales */
            .totals-container { display: flex; justify-content: flex-end; margin-top: 20px; }
            .totals-box { border: 1.5px solid ${activePalette.primary}; padding: 12px; min-width: 250px; border-radius: 6px; }
            .total-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: #475569; }
            .total-row.final { border-top: 1.5px solid ${activePalette.primary}; margin-top: 8px; padding-top: 8px; font-size: 15px; font-weight: bold; color: ${activePalette.primary}; }
            
            /* Marca de agua */
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${lynxSize}mm; opacity: ${lynxOpacity}; pointer-events: none; z-index: 0; }

            /* Footer */
            .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 15px; }
            .qr-container { display: flex; align-items: center; gap: 12px; }
            .qr-image { width: 75px; height: 75px; }
            .cae-info { text-align: right; line-height: 1.6; font-size: 11px; color: #334155; }
            .cae-label { font-weight: bold; color: #0f172a; }
            .branding { font-size: 8px; color: #94a3b8; margin-top: 4px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="container">
            ${lynxPosition === 'marca_agua' && lynxLogoBase64 ? `<img class="watermark" src="${lynxLogoBase64}">` : ''}

            <div class="header">
              <div class="header-left">
                <div class="letter-box">${templateData.tipoLetra}<span>Cod. ${templateData.tipoCod}</span></div>
                ${showLogo ? `<img class="logo-img" src="${logoBase64}">` : ''}
                <div class="emisor-name">${emisorName}</div>
                <div class="emisor-info">
                  Domicilio Comercial: <b>${emisorDom}</b><br>
                  Condición frente al IVA: <b>Monotributista</b>
                </div>
              </div>
              <div class="header-right">
                <div class="invoice-type">${templateData.tipoNombre}</div>
                <div class="invoice-details">
                  <b>Punto de Venta:</b> ${templateData.pv.toString().padStart(5, '0')}<br>
                  <b>Comp. Nro:</b> ${templateData.nro.toString().padStart(8, '0')}<br>
                  <b>Fecha de Emisión:</b> ${templateData.fecha}<br>
                  <b>Fecha de Vto. de Pago:</b> ${templateData.fecha}<br><br>
                  <b>CUIT:</b> ${templateData.emisorCuit}<br>
                  <b>Ingresos Brutos:</b> ${ingresosBrutos}<br>
                  <b>Inicio de Actividades:</b> ${inicioActividades}
                </div>
              </div>
            </div>

            <div class="section-title">DATOS DEL RECEPTOR</div>
            <div class="client-info">
              <div>
                CUIT/DNI: <b>${templateData.clienteCuit}</b><br>
                Nombre/Razón Social: <b>${templateData.clienteName}</b>
              </div>
              <div>
                Condición IVA: <b>Consumidor Final</b><br>
                Domicilio: <b>${templateData.clienteDom}</b>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 10%">Cod.</th>
                  <th style="width: 70%">Descripción / Producto / Servicio</th>
                  <th style="text-align: right; width: 20%">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>${templateData.concepto}</td>
                  <td style="text-align: right">$ ${templateData.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals-container">
              <div class="totals-box">
                <div class="total-row">
                  <span>Importe Neto No Gravado:</span>
                  <span>$ 0.00</span>
                </div>
                <div class="total-row">
                  <span>Importe Exento:</span>
                  <span>$ 0.00</span>
                </div>
                <div class="total-row final">
                  <span>TOTAL:</span>
                  <span>$ ${templateData.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <div class="qr-container">
                <img class="qr-image" src="${templateData.qrBase64}">
                <div style="font-size: 8px; color: #64748b;">
                  Comprobante Autorizado por AFIP (ARCA)<br>
                  Este PDF ha sido generado por Factureando / LYNX BarOS
                  ${showLynx && lynxPosition !== 'marca_agua' ? `<div class="branding">Powered by LYNX Consulting</div>` : ''}
                </div>
              </div>
              <div class="cae-info">
                <span class="cae-label">CAE:</span> ${templateData.cae}<br>
                <span class="cae-label">Fecha Vto. CAE:</span> ${templateData.caeVe}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    pdfWindow.webContents.on('did-finish-load', () => {
      pdfWindow.webContents.printToPDF({ marginsType: 1, printBackground: true, pageSize: 'A4' }).then(data => {
        fs.writeFileSync(savePath, data);
        pdfWindow.close();
        resolve(savePath);
      }).catch(err => {
        pdfWindow.close();
        reject(err);
      });
    });
  });
}

// IPC Handlers for ARCA

ipcMain.handle('arca-test-connection', async (event, settings) => {
  try {
    const afip = getAfipInstance(settings.arcaInfo);
    const status = await afip.electronicBillingService.getServerStatus();
    
    let certInfo = "No se pudo leer la info del certificado";
    try {
      const certPath = settings.arcaInfo.certPath;
      if (fs.existsSync(certPath)) {
        const certData = fs.readFileSync(certPath, 'utf8');
        const cert = forge.pki.certificateFromPem(certData);
        const subject = cert.subject.getField('CN') ? cert.subject.getField('CN').value : 'N/A';
        const expiry = cert.validity.notAfter;
        certInfo = `Certificado para: ${subject} | Vence: ${expiry.toLocaleDateString('es-AR')}`;
      }
    } catch (e) {
      certInfo = `Error leyendo cert: ${e.message}`;
    }
    
    const result = status.FEDummyResult || status;
    if (result && result.AppServer === 'OK') {
      return { 
        success: true, 
        status: result,
        certInfo
      };
    } else {
      return { 
        success: false, 
        error: 'El servidor de AFIP reporta problemas.', 
        status,
        detailed: JSON.stringify(status, null, 2),
        certInfo
      };
    }
  } catch (error) {
    console.error('ARCA Test Connection Error:', error);
    const detailedError = {
      message: error.message || 'Error desconocido',
      stack: error.stack,
      code: error.code,
      fault: error.fault
    };
    return { 
      success: false, 
      error: error.message || 'Error al conectar con ARCA/AFIP.',
      detailed: JSON.stringify(detailedError, null, 2)
    };
  }
});

ipcMain.handle('arca-generate-csr', async (event, { cuit, name }) => {
  try {
    if (!cuit) throw new Error('El CUIT es obligatorio para generar el pedido (CSR)');
    
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Selecciona carpeta para guardar los archivos (.key y .csr)',
      properties: ['openDirectory']
    });

    if (canceled) return { success: false, error: 'Cancelado por el usuario' };
    const folder = filePaths[0];

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([
      { name: 'commonName', value: name || 'LYNX BarOS' },
      { name: 'serialNumber', value: `CUIT ${cuit.replace(/-/g, '')}` },
      { name: 'organizationName', value: 'LYNX_BAR' }
    ]);
    csr.sign(keys.privateKey);
    const csrPem = forge.pki.certificationRequestToPem(csr);

    const keyPath = path.join(folder, 'privada.key');
    const csrPath = path.join(folder, 'pedido.csr');

    fs.writeFileSync(keyPath, privateKeyPem);
    fs.writeFileSync(csrPath, csrPem);

    return { 
      success: true, 
      folder,
      keyPath,
      csrPath
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('arca-generate-invoice', async (event, { settings, client, amount, concept }) => {
  try {
    const afip = getAfipInstance(settings.arcaInfo);
    const pv = settings.arcaInfo.puntoVenta || 2;
    const type = 11; // Factura C
    
    const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');

    const docType = client.isConsumidorFinal ? 99 : (client.cuit.length > 8 ? 80 : 96); // 99: Sin identificar, 80: CUIT, 96: DNI
    const docNro = client.isConsumidorFinal ? 0 : parseInt(client.cuit.replace(/-/g, ''));

    const payload = {
      PtoVta: parseInt(pv),
      CbteTipo: type,
      Concepto: 1, // 1: Productos (Bares y cafeterías venden productos y servicios de consumo inmediato)
      DocTipo: docType,
      DocNro: docNro,
      ImpTotConc: 0,
      ImpOpEx: 0,
      ImpIVA: 0,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
    };

    const finalPayload = {
      ...payload,
      CbteFch: parseInt(date),
      ImpTotal: parseFloat(amount.toFixed(2)),
      ImpNeto: parseFloat(amount.toFixed(2))
    };

    let res;
    try {
      res = await afip.electronicBillingService.createNextInvoice(finalPayload);
    } catch (err) {
      throw new Error(`Fallo en createNextInvoice: ${err.message}`);
    }
    
    if (res && res.cae) {
      let nro;
      try {
        nro = res.response ? res.response.FeDetResp.FECAEDetResponse[0].CbteHasta : res.nro;
      } catch (e) {
        nro = res.nro;
      }

      if (!nro) {
         throw new Error('AFIP aprobó el comprobante pero no se pudo determinar el número asignado.');
      }

      const qrData = {
        ver: 1,
        fecha: date.substring(0,4) + '-' + date.substring(4,6) + '-' + date.substring(6,8),
        cuit: parseInt(settings.arcaInfo.cuit.replace(/-/g, '')),
        ptoVta: parseInt(pv),
        tipoCmp: type,
        nroCmp: nro,
        importe: parseFloat(amount.toFixed(2)),
        moneda: "PES",
        ctz: 1,
        tipoDocRec: docType,
        nroDocRec: docNro,
        tipoCodAut: "E",
        codAut: parseInt(res.cae)
      };
      
      const qrUrl = 'https://www.afip.gob.ar/fe/qr/?p=' + Buffer.from(JSON.stringify(qrData)).toString('base64');
      const qrBase64 = await QRCode.toDataURL(qrUrl);

      const folder = settings.invoicePath || path.join(userDataPath, 'facturas');
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      
      const fileName = `Factura_${nro}_${date}.pdf`;
      const fullPath = path.join(folder, fileName);

      await generatePDF({
        tipoLetra: 'C', tipoCod: type.toString(), tipoNombre: 'FACTURA C',
        emisorName: settings.arcaInfo.nombreEmisor || 'LYNX BarOS Gastronomía', 
        emisorDom: settings.arcaInfo.domicilioComercial || 'Av. Corrientes 1234, CABA',
        emisorCuit: settings.arcaInfo.cuit,
        inicioActividades: settings.arcaInfo.monotributoStartDate ? new Date(settings.arcaInfo.monotributoStartDate).toLocaleDateString('es-AR') : '01/01/2020',
        clienteName: client.isConsumidorFinal ? 'Consumidor Final' : client.razonSocial, 
        clienteCuit: client.isConsumidorFinal ? '0' : client.cuit, 
        clienteDom: client.isConsumidorFinal ? 'Consumidor Final' : client.domicilio,
        pv, nro: nro, fecha: new Date().toLocaleDateString('es-AR'),
        concepto: concept || 'Consumo Gastronómico',
        monto: amount, cae: res.cae, caeVe: res.caeFchVto, qrBase64,
        settings: settings.arcaInfo
      }, fullPath);

      return {
        success: true,
        invoiceNumber: nro,
        cae: res.cae,
        caeVto: res.caeFchVto,
        filePath: fullPath,
        date: new Date().toISOString()
      };
    } else {
      let errorMsg = 'No se recibió el CAE de AFIP.';
      try {
        const detResp = res.response ? res.response.FeDetResp.FECAEDetResponse[0] : (res.FeDetResp ? res.FeDetResp.FECAEDetResponse[0] : null);
        if (detResp && detResp.Observaciones) {
           const obs = Array.isArray(detResp.Observaciones.Obs)
            ? detResp.Observaciones.Obs.map(o => `[${o.Code}] ${o.Msg}`).join('\n')
            : `[${detResp.Observaciones.Obs.Code}] ${detResp.Observaciones.Obs.Msg}`;
           errorMsg += '\nObservaciones:\n' + obs;
        }
      } catch(e) {}
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('ARCA Invoice Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('arca-regenerate-pdf', async (event, { draft, settings }) => {
  try {
    const folder = settings.invoicePath || path.join(userDataPath, 'facturas');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

    const date = draft.date.replace(/-/g, '').substring(0, 8);
    const fileName = `Factura_${draft.billingData.invoiceNumber}_${date}.pdf`;
    const fullPath = path.join(folder, fileName);

    const docType = draft.billingData.isConsumidorFinal ? 99 : (draft.billingData.identificador.length > 8 ? 80 : 96);
    const docNro = draft.billingData.isConsumidorFinal ? 0 : parseInt(draft.billingData.identificador.replace(/-/g, ''));
    const pv = settings.arcaInfo.puntoVenta || 2;
    const type = 11;

    const qrData = {
      ver: 1,
      fecha: draft.date.substring(0, 10),
      cuit: parseInt(settings.arcaInfo.cuit.replace(/-/g, '')),
      ptoVta: parseInt(pv),
      tipoCmp: type,
      nroCmp: draft.billingData.invoiceNumber,
      importe: parseFloat(draft.amount.toFixed(2)),
      moneda: "PES",
      ctz: 1,
      tipoDocRec: docType,
      nroDocRec: docNro,
      tipoCodAut: "E",
      codAut: parseInt(draft.billingData.cae)
    };
    
    const qrUrl = 'https://www.afip.gob.ar/fe/qr/?p=' + Buffer.from(JSON.stringify(qrData)).toString('base64');
    const qrBase64 = await QRCode.toDataURL(qrUrl);

    await generatePDF({
      tipoLetra: 'C', tipoCod: type.toString(), tipoNombre: 'FACTURA C',
      emisorName: settings.arcaInfo.nombreEmisor || 'LYNX BarOS Gastronomía', 
      emisorDom: settings.arcaInfo.domicilioComercial || 'Av. Corrientes 1234, CABA',
      emisorCuit: settings.arcaInfo.cuit,
      inicioActividades: settings.arcaInfo.monotributoStartDate ? new Date(settings.arcaInfo.monotributoStartDate).toLocaleDateString('es-AR') : '01/01/2020',
      clienteName: draft.billingData.isConsumidorFinal ? 'Consumidor Final' : draft.clientName, 
      clienteCuit: draft.billingData.isConsumidorFinal ? '0' : draft.billingData.identificador, 
      clienteDom: draft.billingData.isConsumidorFinal ? 'Consumidor Final' : draft.billingData.direccion,
      pv, nro: draft.billingData.invoiceNumber, fecha: new Date(draft.date).toLocaleDateString('es-AR'),
      concepto: draft.concept || 'Consumo Gastronómico',
      monto: draft.amount, cae: draft.billingData.cae, caeVe: draft.billingData.caeVto, qrBase64,
      settings: settings.arcaInfo
    }, fullPath);

    return { success: true, filePath: fullPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-file-path', async (event, filePath) => {
  shell.openPath(filePath);
});

