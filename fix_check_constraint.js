const { getPool } = require('./backend/config/db');

async function fixConstraint() {
  try {
    const pool = await getPool();
    // Drop existing restrictive CHK_PR_Status constraint if exists
    await pool.request().query(`
      IF EXISTS (
        SELECT * FROM sys.check_constraints 
        WHERE name = 'CHK_PR_Status'
      )
      BEGIN
        ALTER TABLE dbo.PurchaseRequests DROP CONSTRAINT CHK_PR_Status;
      END
    `);
    console.log('✅ Dropped restrictive CHK_PR_Status constraint');

    // Add updated flexible constraint supporting both accented & unaccented values
    await pool.request().query(`
      ALTER TABLE dbo.PurchaseRequests ADD CONSTRAINT CHK_PR_Status 
      CHECK (CurrentStatus IN ('Brouillon', 'En Attente', 'En Cours', 'Commandee', N'Commandée', 'Finalisee', N'Finalisée', 'Annulee', N'Annulée'));
    `);
    console.log('✅ Added flexible CHK_PR_Status constraint');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

fixConstraint();
