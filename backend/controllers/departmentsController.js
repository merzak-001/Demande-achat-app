const { getPool, sql } = require('../config/db');

// List all departments
const getAllDepartments = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DepartmentID, DepartmentName, DirectorCode, CreatedAt
      FROM dbo.Departments
      ORDER BY DepartmentName ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('getAllDepartments error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des départements' });
  }
};

// Create a new department
const createDepartment = async (req, res) => {
  const { departmentName, directorCode } = req.body;
  if (!departmentName || !departmentName.trim()) {
    return res.status(400).json({ error: 'Le nom du département est obligatoire' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('DepartmentName', sql.NVarChar(100), departmentName.trim())
      .input('DirectorCode', sql.NVarChar(10), directorCode ? directorCode.trim() : 'DP')
      .query(`
        INSERT INTO dbo.Departments (DepartmentName, DirectorCode)
        OUTPUT INSERTED.DepartmentID, INSERTED.DepartmentName, INSERTED.DirectorCode
        VALUES (@DepartmentName, @DirectorCode)
      `);

    res.status(201).json({
      message: 'Département créé avec succès',
      department: result.recordset[0]
    });
  } catch (err) {
    console.error('createDepartment error:', err);
    if (err.message?.includes('UNIQUE') || err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ error: 'Ce département existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du département' });
  }
};

// Update a department
const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { departmentName, directorCode } = req.body;

  try {
    const pool = await getPool();
    await pool.request()
      .input('DepartmentID', sql.Int, parseInt(id))
      .input('DepartmentName', sql.NVarChar(100), departmentName?.trim() || null)
      .input('DirectorCode', sql.NVarChar(10), directorCode ? directorCode.trim() : null)
      .query(`
        UPDATE dbo.Departments
        SET DepartmentName = COALESCE(@DepartmentName, DepartmentName),
            DirectorCode = COALESCE(@DirectorCode, DirectorCode)
        WHERE DepartmentID = @DepartmentID
      `);

    res.json({ message: 'Département mis à jour avec succès' });
  } catch (err) {
    console.error('updateDepartment error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du département' });
  }
};

// Delete a department
const deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    await pool.request()
      .input('DepartmentID', sql.Int, parseInt(id))
      .query(`DELETE FROM dbo.Departments WHERE DepartmentID = @DepartmentID`);

    res.json({ message: 'Département supprimé' });
  } catch (err) {
    console.error('deleteDepartment error:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = { getAllDepartments, createDepartment, updateDepartment, deleteDepartment };
