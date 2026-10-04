const { getPool, sql } = require('./config/db');

async function migrateUnitColumn() {
  console.log('Running migration: Add Unit column to dbo.RequestItems...');
  try {
    const pool = await getPool();
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'dbo' 
        AND TABLE_NAME = 'RequestItems' 
        AND COLUMN_NAME = 'Unit'
      )
      BEGIN
        ALTER TABLE dbo.RequestItems ADD Unit NVARCHAR(50) NULL DEFAULT 'U';
        PRINT 'Added Unit column to dbo.RequestItems';
      END
      ELSE
      BEGIN
        PRINT 'Unit column already exists in dbo.RequestItems';
      END
    `);
    console.log('✅ Unit column migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateUnitColumn();
