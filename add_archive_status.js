const { getPool } = require('./backend/config/db');

async function addArchiveStatus() {
  try {
    const pool = await getPool();
    // Drop existing CHK_PR_Status constraint
    await pool.request().query(`
      IF EXISTS (
        SELECT * FROM sys.check_constraints 
        WHERE name = 'CHK_PR_Status'
      )
      BEGIN
        ALTER TABLE dbo.PurchaseRequests DROP CONSTRAINT CHK_PR_Status;
      END
    `);
    console.log('✅ Dropped existing CHK_PR_Status constraint');

    // Add updated CHK_PR_Status constraint including Archivee and Archivée
    await pool.request().query(`
      ALTER TABLE dbo.PurchaseRequests ADD CONSTRAINT CHK_PR_Status 
      CHECK (CurrentStatus IN ('Brouillon', 'En Attente', 'En Cours', 'Commandee', N'Commandée', 'Finalisee', N'Finalisée', 'Annulee', N'Annulée', 'Archivee', N'Archivée'));
    `);
    console.log('✅ Added CHK_PR_Status constraint with Archivee support');

    process.exit(0);
  } catch(e) {
    console.error('Migration error:', e);
    process.exit(1);
  }
}

addArchiveStatus();
