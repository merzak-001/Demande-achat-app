const { getPool } = require('./backend/config/db');

async function migrate() {
  try {
    const pool = await getPool();
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'RequestItems' AND COLUMN_NAME = 'ItemStatus'
      )
      BEGIN
        ALTER TABLE dbo.RequestItems ADD ItemStatus NVARCHAR(50) NOT NULL DEFAULT 'En Attente';
      END
    `);
    console.log('✅ ItemStatus column added/verified in dbo.RequestItems');

    await pool.request().query(`
      UPDATE ri
      SET ri.ItemStatus = CASE 
        WHEN pr.CurrentStatus = 'Finalisee' THEN 'Livré Totalement'
        WHEN pr.CurrentStatus = 'Commandee' THEN 'En Cours'
        WHEN pr.CurrentStatus = 'Annulee' THEN 'Annulé'
        ELSE 'En Attente'
      END
      FROM dbo.RequestItems ri
      JOIN dbo.PurchaseRequests pr ON ri.RequestID = pr.RequestID
    `);
    console.log('✅ Updated initial item statuses');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

migrate();
