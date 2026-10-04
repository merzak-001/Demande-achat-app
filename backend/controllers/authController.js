const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'sensus_demande_achat_secret_key_2026';

function formatCleanName(name) {
  if (!name) return name;
  let str = String(name).trim();
  for (let i = Math.floor(str.length / 2); i >= 2; i--) {
    const candidate = str.substring(0, i).trim();
    if (candidate.length < 2) continue;
    try {
      const regex = new RegExp(`^(${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*)+$`, 'i');
      if (regex.test(str)) return candidate;
    } catch (e) {}
  }
  const words = str.split(/\s+/);
  if (words.length >= 2) {
    const half = Math.floor(words.length / 2);
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half, half * 2).join(' ');
    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) return firstHalf;
  }
  return str;
}

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Jeton d\'authentification requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Jeton invalide ou expiré' });
    }
    req.user = user;
    next();
  });
};

// Login Route Controller (Username + Plain Text Password, No Email, No Hashing)
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Le nom d\'utilisateur et le mot de passe sont requis' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Username', sql.NVarChar(50), username)
      .query(`
        SELECT u.UserID, u.FullName, u.Username, u.Password, u.Department, u.Role, u.IsActive,
               u.ManagerID, u.IsResponsable, u.InterimManagerID, u.DirectorCode,
               (SELECT COUNT(*) FROM dbo.Users sub WHERE sub.ManagerID = u.UserID OR sub.ManagerID IN (SELECT m2.UserID FROM dbo.Users m2 WHERE m2.InterimManagerID = u.UserID)) AS SubordinatesCount
        FROM dbo.Users u
        WHERE u.Username = @Username
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }

    const user = result.recordset[0];

    if (!user.IsActive) {
      return res.status(403).json({ error: 'Le compte utilisateur est désactivé' });
    }

    // Direct password comparison (with trim for SQL NCHAR padding)
    if (user.Password?.toString().trim() !== password.toString().trim()) {
      return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { 
        userId: user.UserID, 
        username: user.Username, 
        fullName: user.FullName,
        name: user.FullName,
        department: user.Department,
        role: user.Role,
        isResponsable: Boolean(user.IsResponsable) || user.SubordinatesCount > 0,
        managerId: user.ManagerID,
        interimManagerId: user.InterimManagerID,
        directorCode: user.DirectorCode,
        subordinatesCount: user.SubordinatesCount || 0
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const cleanName = formatCleanName(user.FullName);
    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        userId: user.UserID,
        fullName: cleanName,
        name: cleanName,
        username: user.Username,
        department: user.Department,
        role: user.Role,
        isResponsable: Boolean(user.IsResponsable) || user.SubordinatesCount > 0,
        managerId: user.ManagerID,
        interimManagerId: user.InterimManagerID,
        directorCode: user.DirectorCode,
        subordinatesCount: user.SubordinatesCount || 0
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors de l\'authentification' });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.userId || req.user.UserID)
      .query(`
        SELECT u.UserID, u.FullName, u.Username, u.Department, u.Role, u.IsActive,
               u.ManagerID, u.IsResponsable, u.InterimManagerID, u.DirectorCode,
               (SELECT COUNT(*) FROM dbo.Users sub WHERE sub.ManagerID = u.UserID OR sub.ManagerID IN (SELECT m2.UserID FROM dbo.Users m2 WHERE m2.InterimManagerID = u.UserID)) AS SubordinatesCount
        FROM dbo.Users u
        WHERE u.UserID = @UserID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const u = result.recordset[0];
    const cleanName = formatCleanName(u.FullName);
    res.json({
      user: {
        userId: u.UserID,
        fullName: cleanName,
        name: cleanName,
        username: u.Username,
        department: u.Department,
        role: u.Role,
        isResponsable: Boolean(u.IsResponsable) || u.SubordinatesCount > 0,
        managerId: u.ManagerID,
        interimManagerId: u.InterimManagerID,
        directorCode: u.DirectorCode,
        subordinatesCount: u.SubordinatesCount || 0
      }
    });
  } catch (err) {
    console.error('getMe error:', err);
    res.json({ user: req.user });
  }
};

// Change user password (requires old password)
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user ? (req.user.userId || req.user.UserID || req.user.id) : null;

  if (!userId) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'L\'ancien et le nouveau mot de passe sont requis' });
  }

  if (newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 4 caractères' });
  }

  try {
    const pool = await getPool();
    const userResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query('SELECT UserID, Password FROM dbo.Users WHERE UserID = @UserID');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const user = userResult.recordset[0];
    const dbPassword = user.Password ? user.Password.toString().trim() : '';

    if (dbPassword !== oldPassword.toString().trim()) {
      return res.status(400).json({ error: 'L\'ancien mot de passe est incorrect' });
    }

    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('NewPassword', sql.NVarChar(100), newPassword.trim())
      .query('UPDATE dbo.Users SET Password = @NewPassword WHERE UserID = @UserID');

    res.json({ message: 'Mot de passe modifié avec succès' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du mot de passe' });
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
  authenticateToken
};
