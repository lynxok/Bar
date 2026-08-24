import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Afip } from 'afip.ts';
import forge from 'node-forge';
import QRCode from 'qrcode';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  app.use(express.json());

  // CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mocked Sync Info
  let globalSupabaseActive = false;
  let globalSupabaseUrl = "";
  let globalSupabaseAnonKey = "";

  app.get('/api/sync-info', (req, res) => {
    res.json({
      supabaseActive: globalSupabaseActive,
      supabaseUrl: globalSupabaseUrl,
      supabaseAnonKey: globalSupabaseAnonKey
    });
  });

  // DB Bridge Mock
  app.all('/api/db/:table/:id?', (req, res) => {
    res.status(501).json({ 
      error: 'Remote synchronization via local server is only available in the Desktop version. Please use Supabase mode for cloud sync.' 
    });
  });

  // ARCA (AFIP) Integration
  app.post('/api/arca/test-connection', async (req, res) => {
    try {
      const { arcaInfo } = req.body;
      const afip = new Afip({
        cuit: parseInt(arcaInfo.cuit.replace(/[^0-9]/g, '')),
        cert: arcaInfo.certData || '', 
        key: arcaInfo.keyData || '',
        production: arcaInfo.productionMode === true
      });
      const status = await afip.electronicBillingService.getServerStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/arca/generate-invoice', async (req, res) => {
    try {
      const { settings, client, amount, concept } = req.body;
      const simulatedInvoiceNumber = Math.floor(Math.random() * 90000) + 10000;
      const simulatedCae = Math.floor(Math.random() * 90000000000000) + 10000000000000;
      
      res.json({
        success: true,
        invoiceNumber: simulatedInvoiceNumber,
        cae: simulatedCae.toString(),
        caeVto: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/arca/generate-csr', async (req, res) => {
    try {
      const { cuit, name } = req.body;
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

      res.json({ 
        success: true, 
        privateKey: privateKeyPem,
        csr: csrPem
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite Middleware
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
