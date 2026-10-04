const { getPool, sql } = require('../config/db');

// List all users
const getAllUsers = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT u.UserID, u.FullName, u.Username, u.Department, u.Role, u.IsActive, u.CreatedAt,
             u.ManagerID, u.IsResponsable, u.InterimManagerID, u.DirectorCode,
             m.FullName AS ManagerName,
             im.FullName AS InterimManagerName
      FROM dbo.Users u
      LEFT JOIN dbo.Users m ON u.ManagerID = m.UserID
      LEFT JOIN dbo.Users im ON u.InterimManagerID = im.UserID
      ORDER BY u.CreatedAt DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};

// Create a new user
const createUser = async (req, res) => {
  const { fullName, username, password, department, role, managerId, isResponsable, interimManagerId, directorCode } = req.body;
  const validRoles = ['Admin', 'Acheteur', 'Demandeur'];

  if (!fullName || !username || !password || !department || !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Tous les champs sont requis avec un rôle valide (Admin, Acheteur, Demandeur)' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('FullName',         sql.NVarChar(100), fullName.trim())
      .input('Username',         sql.NVarChar(50),  username.trim())
      .input('Password',         sql.NVarChar(100), password)
      .input('Department',       sql.NVarChar(100), department.trim())
      .input('Role',             sql.NVarChar(50),  role)
      .input('ManagerID',        sql.Int,           managerId ? parseInt(managerId) : null)
      .input('IsResponsable',    sql.Bit,           isResponsable ? 1 : 0)
      .input('InterimManagerID', sql.Int,           interimManagerId ? parseInt(interimManagerId) : null)
      .input('DirectorCode',     sql.NVarChar(10),  directorCode ? directorCode.trim().toUpperCase() : null)
      .query(`
        INSERT INTO dbo.Users (FullName, Username, Password, Department, Role, ManagerID, IsResponsable, InterimManagerID, DirectorCode)
        OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Username, INSERTED.Role, INSERTED.ManagerID, INSERTED.IsResponsable, INSERTED.InterimManagerID, INSERTED.DirectorCode
        VALUES (@FullName, @Username, @Password, @Department, @Role, @ManagerID, @IsResponsable, @InterimManagerID, @DirectorCode)
      `);
    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: result.recordset[0]
    });
  } catch (err) {
    console.error('createUser error:', err);
    if (err.message?.includes('UNIQUE') || err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });
    }
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur" });
  }
};

// Update user details (FullName, Username, Password, Department, Role, Manager link & Responsable status & Interim & DirectorCode)
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, username, password, role, department, managerId, isResponsable, interimManagerId, directorCode } = req.body;
  const userId = parseInt(id);
  
  try {
    const pool = await getPool();

    // If user is losing Responsable status, unlink their team members so they show as "Sans Responsable"
    if (isResponsable === false || isResponsable === 0) {
      await pool.request()
        .input('UserID', sql.Int, userId)
        .query(`UPDATE dbo.Users SET ManagerID = NULL WHERE ManagerID = @UserID`);
    }

    const request = pool.request().input('UserID', sql.Int, userId);
    let setClauses = [];

    if (fullName !== undefined) {
      setClauses.push('FullName = @FullName');
      request.input('FullName', sql.NVarChar(100), fullName ? fullName.trim() : null);
    }
    if (username !== undefined) {
      setClauses.push('Username = @Username');
      request.input('Username', sql.NVarChar(50), username ? username.trim() : null);
    }
    if (role !== undefined) {
      setClauses.push('Role = @Role');
      request.input('Role', sql.NVarChar(50), role || null);
    }
    if (department !== undefined) {
      setClauses.push('Department = @Department');
      request.input('Department', sql.NVarChar(100), department || null);
    }
    if (managerId !== undefined) {
      setClauses.push('ManagerID = @ManagerID');
      request.input('ManagerID', sql.Int, managerId ? parseInt(managerId) : null);
    }
    if (isResponsable !== undefined) {
      setClauses.push('IsResponsable = @IsResponsable');
      request.input('IsResponsable', sql.Bit, isResponsable ? 1 : 0);
    }
    if (interimManagerId !== undefined) {
      setClauses.push('InterimManagerID = @InterimManagerID');
      request.input('InterimManagerID', sql.Int, interimManagerId ? parseInt(interimManagerId) : null);
    }
    if (directorCode !== undefined) {
      setClauses.push('DirectorCode = @DirectorCode');
      request.input('DirectorCode', sql.NVarChar(10), directorCode ? directorCode.trim().toUpperCase() : null);
    }
    if (password && password.trim()) {
      setClauses.push('Password = @Password');
      request.input('Password', sql.NVarChar(100), password.trim());
    }

    if (setClauses.length === 0) {
      return res.json({ message: 'Aucune modification' });
    }

    const query = `UPDATE dbo.Users SET ${setClauses.join(', ')} WHERE UserID = @UserID`;
    await request.query(query);

    res.json({ message: 'Utilisateur mis à jour avec succès' });
  } catch (err) {
    console.error('updateUser error:', err);
    if (err.message?.includes('UNIQUE') || err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
};

// Delete a user (safely unlinking team members & preserving purchase request records as text)
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  try {
    const pool = await getPool();

    // 1. Preserve user's full name as plain text on all purchase requests created by them
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        UPDATE pr
        SET pr.RequesterName = u.FullName
        FROM dbo.PurchaseRequests pr
        JOIN dbo.Users u ON pr.RequesterID = u.UserID
        WHERE pr.RequesterID = @UserID AND pr.RequesterName IS NULL;
      `);

    // 2. Set RequesterID, UploadedByID, and ChangedByID to NULL so foreign keys unlink cleanly
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        UPDATE dbo.PurchaseRequests SET RequesterID = NULL WHERE RequesterID = @UserID;
        UPDATE dbo.Attachments SET UploadedByID = NULL WHERE UploadedByID = @UserID;
        UPDATE dbo.StatusHistory SET ChangedByID = NULL WHERE ChangedByID = @UserID;
        UPDATE dbo.Users SET ManagerID = NULL WHERE ManagerID = @UserID;
      `);

    // 3. Delete user account from dbo.Users
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`DELETE FROM dbo.Users WHERE UserID = @UserID`);

    res.json({ message: 'Utilisateur supprimé. Ses demandes d\'achat sont conservées sous forme de texte historique.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur" });
  }
};

// Toggle user active/inactive
const toggleUser = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, parseInt(id))
      .query(`UPDATE dbo.Users SET IsActive = CASE IsActive WHEN 1 THEN 0 ELSE 1 END WHERE UserID = @UserID`);
    res.json({ message: 'Statut utilisateur mis à jour' });
  } catch (err) {
    console.error('toggleUser error:', err);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
};

// Set or clear interim delegate for logged-in Responsable
const setMyInterim = async (req, res) => {
  const currentUserId = req.user ? req.user.userId : null;
  const { interimManagerId } = req.body;

  if (!currentUserId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const pool = await getPool();

    const uRes = await pool.request()
      .input('UID', sql.Int, currentUserId)
      .query(`
        SELECT IsResponsable, Role,
               (SELECT COUNT(*) FROM dbo.Users WHERE ManagerID = @UID) as SubCount
        FROM dbo.Users WHERE UserID = @UID
      `);

    if (uRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const uInfo = uRes.recordset[0];
    if (!uInfo.IsResponsable && uInfo.Role !== 'Admin' && uInfo.SubCount === 0) {
      return res.status(403).json({ error: 'Seul un Responsable peut désigner un délégué intérimaire.' });
    }

    const targetInterimId = interimManagerId ? parseInt(interimManagerId) : null;
    if (targetInterimId === currentUserId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous désigner vous-même comme intérimaire.' });
    }

    await pool.request()
      .input('UID', sql.Int, currentUserId)
      .input('InterimID', sql.Int, targetInterimId)
      .query(`UPDATE dbo.Users SET InterimManagerID = @InterimID WHERE UserID = @UID`);

    res.json({ message: 'Délégué intérimaire mis à jour avec succès', interimManagerId: targetInterimId });
  } catch (err) {
    console.error('setMyInterim error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du délégué intérimaire' });
  }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser, toggleUser, setMyInterim };
