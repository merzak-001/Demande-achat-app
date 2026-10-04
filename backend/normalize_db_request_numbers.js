const { getPool, sql } = require('./config/db');

async function normalizeExistingNumbers() {
  try {
    const pool = await getPool();
    console.log('Fetching purchase requests to normalize reference numbers...');

    const res = await pool.request().query(`
      SELECT RequestID, RequestNumber FROM dbo.PurchaseRequests ORDER BY RequestID ASC
    `);

    console.log(`Found ${res.recordset.length} requests to inspect.`);
    const seen = new Set();

    // First pass: add all existing normalized strings to seen
    for (const req of res.recordset) {
      const match = req.RequestNumber.match(/^N°0*(\d+)(.*)$/i);
      if (match) {
        const seq = parseInt(match[1], 10);
        const rest = match[2];
        seen.add(`N°${seq}${rest}`);
      } else {
        seen.add(req.RequestNumber);
      }
    }

    // Second pass: update records if needed
    for (const req of res.recordset) {
      const match = req.RequestNumber.match(/^N°0*(\d+)(.*)$/i);
      if (match) {
        let seq = parseInt(match[1], 10);
        let rest = match[2];
        let normalized = `N°${seq}${rest}`;

        if (normalized !== req.RequestNumber) {
          // If collision with existing record, increment sequence until unique
          while (seen.has(normalized)) {
            seq++;
            normalized = `N°${seq}${rest}`;
          }
          seen.add(normalized);

          console.log(`Normalizing RequestID ${req.RequestID}: '${req.RequestNumber}' -> '${normalized}'`);
          await pool.request()
            .input('RequestID', sql.Int, req.RequestID)
            .input('NormNum', sql.NVarChar(60), normalized)
            .query(`UPDATE dbo.PurchaseRequests SET RequestNumber = @NormNum WHERE RequestID = @RequestID`);
        }
      }
    }

    console.log('✅ Reference numbers normalization complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error normalizing numbers:', err);
    process.exit(1);
  }
}

normalizeExistingNumbers();
