const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authController = require('./controllers/authController');
const requestController = require('./controllers/requestController');
const uploadController = require('./controllers/uploadController');
const usersController = require('./controllers/usersController');
const departmentsController = require('./controllers/departmentsController');
const settingsController = require('./controllers/settingsController');

const app = express();
const PORT = process.env.PORT || 2101;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Authentication Routes ─────────────────────────────────────────────────────
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authController.authenticateToken, authController.getMe);
app.put('/api/auth/change-password', authController.authenticateToken, authController.changePassword);

// ── Purchase Request Routes ───────────────────────────────────────────────────
app.get('/api/dashboard',        authController.authenticateToken, requestController.getDashboardMetrics);
app.get('/api/requests',         authController.authenticateToken, requestController.getAllRequests);
app.get('/api/requests/:id',     authController.authenticateToken, requestController.getRequestById);
app.post('/api/requests',        authController.authenticateToken, requestController.createRequest);
app.put('/api/requests/:id',      authController.authenticateToken, requestController.updateRequest);
app.delete('/api/requests/:id',   authController.authenticateToken, requestController.deleteRequest);
app.put('/api/requests/:id/status', authController.authenticateToken, requestController.updateStatus);
app.put('/api/requests/:requestId/items/:itemId/status', authController.authenticateToken, requestController.updateItemStatus);

// ── File Upload & Download Routes ──────────────────────────────────────────────
app.post(
  '/api/requests/:requestId/attachments',
  authController.authenticateToken,
  uploadController.uploadDualMiddleware,
  uploadController.handleFileUpload
);
app.get('/api/attachments/:id/download', authController.authenticateToken, uploadController.downloadAttachment);

// ── User Management Routes (Admin) ────────────────────────────────────────────
app.get('/api/users',               authController.authenticateToken, usersController.getAllUsers);
app.post('/api/users',              authController.authenticateToken, usersController.createUser);
app.put('/api/users/me/interim',        authController.authenticateToken, usersController.setMyInterim);
app.put('/api/users/:id',           authController.authenticateToken, usersController.updateUser);
app.delete('/api/users/:id',        authController.authenticateToken, usersController.deleteUser);
app.patch('/api/users/:id/toggle',  authController.authenticateToken, usersController.toggleUser);

// ── System Settings Routes (Admin) ───────────────────────────────────────────
app.get('/api/settings',         authController.authenticateToken, settingsController.getSettings);
app.put('/api/settings',         authController.authenticateToken, settingsController.updateSetting);
app.post('/api/settings/test-email', authController.authenticateToken, async (req, res) => {
  const emailService = require('./services/emailService');
  const target = req.body.email || process.env.NOTIFICATION_EMAIL || 'merzak.sai@sensus-int.com';
  const result = await emailService.sendTestEmail(target);
  if (result.success) {
    res.json({ message: `Email de test envoyé avec succès à ${target}`, result });
  } else {
    res.status(500).json({ error: `Échec de l'envoi : ${result.error}` });
  }
});

// ── Department Management Routes (Admin) ──────────────────────────────────────
app.get('/api/departments',         authController.authenticateToken, departmentsController.getAllDepartments);
app.post('/api/departments',        authController.authenticateToken, departmentsController.createDepartment);
app.put('/api/departments/:id',     authController.authenticateToken, departmentsController.updateDepartment);
app.delete('/api/departments/:id',  authController.authenticateToken, departmentsController.deleteDepartment);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Demande Achat API', timestamp: new Date() });
});

// ── Serve React Frontend (production) ────────────────────────────────────────
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuildPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
      if (err) res.status(404).send("Frontend build not found. Run 'npm run build' in frontend directory.");
    });
  }
});

// ── Start Server & Run Data Cleanups ──────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Demande Achat API running on http://localhost:${PORT}`);
  
  // Auto-clean any duplicated name strings in Users and PurchaseRequests tables
  try {
    const { getPool, sql } = require('./config/db');
    const pool = await getPool();
    const res = await pool.request().query("SELECT UserID, FullName FROM dbo.Users WHERE FullName IS NOT NULL");
    for (const u of res.recordset) {
      if (u.FullName) {
        const trimmed = String(u.FullName).trim();
        const len = trimmed.length;
        if (len > 4 && len % 2 === 0) {
          const half = trimmed.substring(0, len / 2);
          if (half === trimmed.substring(len / 2)) {
            const cleanName = half.trim();
            await pool.request()
              .input('CleanName', sql.NVarChar(100), cleanName)
              .input('UserID', sql.Int, u.UserID)
              .query("UPDATE dbo.Users SET FullName = @CleanName WHERE UserID = @UserID");
            console.log(`[DB Auto-Clean] Updated User ID ${u.UserID}: '${u.FullName}' -> '${cleanName}'`);
          }
        }
      }
    }
  } catch (err) {
    console.error('DB Auto-Clean error:', err.message);
  }
});
