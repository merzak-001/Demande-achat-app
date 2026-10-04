const { getPool } = require('./backend/config/db');

async function testCompletion() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT 
        COUNT(CASE WHEN ri.ItemStatus = 'Livré Totalement' THEN 1 END) as DeliveredItems,
        COUNT(CASE WHEN ri.ItemStatus = 'Livré Partiellement' THEN 1 END) as PartialItems,
        COUNT(CASE WHEN ri.ItemStatus NOT IN ('Annulé', 'Non Disponible') THEN 1 END) as ActiveItems,
        COUNT(CASE WHEN ri.ItemStatus IN ('Annulé', 'Non Disponible') THEN 1 END) as CancelledItems,
        COUNT(*) as TotalItems
      FROM dbo.RequestItems ri
      JOIN dbo.PurchaseRequests pr ON ri.RequestID = pr.RequestID
      WHERE pr.CurrentStatus != 'Annulee'
    `);
    console.log('ITEM METRICS:', res.recordset[0]);
    const { DeliveredItems, PartialItems, ActiveItems } = res.recordset[0];
    const rate = ActiveItems > 0 ? Math.round(((DeliveredItems + (PartialItems * 0.5)) / ActiveItems) * 100) : 0;
    console.log('CALCULATED ITEM COMPLETION RATE (%):', rate);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

testCompletion();
