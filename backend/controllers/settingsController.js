const { getPool, sql } = require('../config/db');

// Get all system settings
const getSettings = async (req, res) => {
  try {
    const pool = await getPool();

    // Ensure default settings exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = 'ENABLE_RESPONSABLE_APPROVAL')
      BEGIN
        INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, Description)
        VALUES ('ENABLE_RESPONSABLE_APPROVAL', '1', N'Activer la validation hiérarchique par le Responsable direct (N1)');
      END
      IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = 'ENABLE_DIRECTOR_AUTHORIZATION')
      BEGIN
        INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, Description)
        VALUES ('ENABLE_DIRECTOR_AUTHORIZATION', '0', N'Activer la validation budgétaire par la Direction (N2)');
      END
      IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = 'ENABLE_DEMANDE_APPROVAL')
      BEGIN
        INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, Description)
        VALUES ('ENABLE_DEMANDE_APPROVAL', '1', N'Activer le système global d''approbation des demandes');
      END
    `);

    const result = await pool.request().query(`
      SELECT SettingKey, SettingValue, Description, UpdatedAt FROM dbo.SystemSettings
    `);
    
    const settingsMap = {};
    result.recordset.forEach(row => {
      if (row.SettingValue === '1' || row.SettingValue === '0') {
        settingsMap[row.SettingKey] = row.SettingValue === '1';
      } else {
        settingsMap[row.SettingKey] = row.SettingValue;
      }
    });
    
    res.json(settingsMap);
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres système' });
  }
};

// Update system setting (Admin only)
const updateSetting = async (req, res) => {
  const userRole = req.user?.role || req.user?.Role;
  if (userRole !== 'Admin') {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const { settingKey, settingValue } = req.body;
  if (!settingKey) {
    return res.status(400).json({ error: 'Clé de paramètre requise' });
  }

  try {
    const pool = await getPool();
    const strVal = (settingValue === true || settingValue === 1 || settingValue === '1' || settingValue === 'true') ? '1' : '0';

    await pool.request()
      .input('SettingKey', sql.VarChar(100), settingKey)
      .input('SettingValue', sql.NVarChar(500), strVal)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = @SettingKey)
        BEGIN
          UPDATE dbo.SystemSettings SET SettingValue = @SettingValue, UpdatedAt = GETDATE() WHERE SettingKey = @SettingKey;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.SystemSettings (SettingKey, SettingValue) VALUES (@SettingKey, @SettingValue);
        END
      `);

    // If Responsable Approval was disabled ('0')
    if (settingKey === 'ENABLE_RESPONSABLE_APPROVAL' && strVal === '0') {
      const dirRes = await pool.request().query(`
        SELECT SettingValue FROM dbo.SystemSettings WHERE SettingKey = 'ENABLE_DIRECTOR_AUTHORIZATION'
      `);
      const isDirEnabled = dirRes.recordset.length > 0 && dirRes.recordset[0].SettingValue === '1';
      const nextStatus = isDirEnabled ? 'En Attente Validation Direction' : 'En Attente';

      await pool.request()
        .input('NextStatus', sql.NVarChar(100), nextStatus)
        .query(`
          UPDATE dbo.PurchaseRequests 
          SET CurrentStatus = @NextStatus, UpdatedAt = SYSDATETIME() 
          WHERE CurrentStatus = N'En Attente Validation Responsable'
        `);
    }

    // If Direction Authorization was disabled ('0'), auto-advance any pending Direction requests directly to 'En Attente' (Acheteurs)
    if (settingKey === 'ENABLE_DIRECTOR_AUTHORIZATION' && strVal === '0') {
      await pool.request().query(`
        UPDATE dbo.PurchaseRequests 
        SET CurrentStatus = 'En Attente', UpdatedAt = SYSDATETIME() 
        WHERE CurrentStatus = N'En Attente Validation Direction'
      `);
    }

    // If Demande Approval was disabled ('0'), auto-advance any pending validation requests directly to 'En Attente' (Acheteurs)
    if (settingKey === 'ENABLE_DEMANDE_APPROVAL' && strVal === '0') {
      await pool.request().query(`
        UPDATE dbo.PurchaseRequests 
        SET CurrentStatus = 'En Attente', UpdatedAt = SYSDATETIME() 
        WHERE CurrentStatus IN (N'En Attente Validation Responsable', N'En Attente Validation Direction')
      `);
    }

    res.json({ message: 'Paramètre mis à jour avec succès', settingKey, settingValue: strVal === '1' });
  } catch (err) {
    console.error('updateSetting error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du paramètre' });
  }
};

module.exports = { getSettings, updateSetting };
