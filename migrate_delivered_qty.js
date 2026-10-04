const { getPool } = require('./backend/config/db');

async function migrateDeliveredQty() {
  try {
    const pool = await getPool();
    // Add DeliveredQuantity column if not exists
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('dbo.RequestItems') AND name = 'DeliveredQuantity'
      )
      BEGIN
        ALTER TABLE dbo.RequestItems ADD DeliveredQuantity INT DEFAULT 0;
      END
    `);
    console.log('✅ DeliveredQuantity column checked/created in dbo.RequestItems');

    // Update existing items where ItemStatus = 'Livré Totalement' to set DeliveredQuantity = Quantity
    await pool.request().query(`
      UPDATE dbo.RequestItems
      SET DeliveredQuantity = Quantity
      WHERE ItemStatus IN ('Livré Totalement', 'Livré') AND (DeliveredQuantity IS NULL OR DeliveredQuantity = 0);
    `);
    console.log('✅ Backfilled DeliveredQuantity for existing delivered items');

    process.exit(0);
  } catch (e) {
    console.error('Migration error:', e);
    process.exit(1);
  }
}

migrateDeliveredQty();
