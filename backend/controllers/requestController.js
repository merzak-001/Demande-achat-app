const path = require('path');
const fs = require('fs');
const { getPool, sql } = require('../config/db');
const emailService = require('../services/emailService');

// Valid Statuses
const VALID_STATUSES = [
  'Brouillon',
  'En Attente Validation Responsable',
  'En Attente Validation Direction',
  'En Attente',
  'En Cours',
  'Commandée',
  'Commandee',
  'Finalisée',
  'Finalisee',
  'Annulée',
  'Annulee',
  'Archivée',
  'Archivee',
  'Refusée par Responsable',
  'Refusee par Responsable',
  'Refusée par Direction',
  'Refusee par Direction'
];

// Reference Number Normalizer (e.g. N°0002/SENSUS/DP/2026 -> N°2/SENSUS/DP/2026)
const normalizeRefNumber = (refStr) => {
  if (!refStr) return { normRef: '', seq: null, dept: null, year: null };
  const str = refStr.trim();
  const match = str.match(/^N°0*(\d+)\/SENSUS\/([^/]+)\/(\d+)$/i);
  if (match) {
    const seq = parseInt(match[1], 10);
    const dept = match[2].toUpperCase().trim();
    const year = match[3].trim();
    return { normRef: `N°${seq}/SENSUS/${dept}/${year}`, seq, dept, year };
  }
  return { normRef: str, seq: null, dept: null, year: null };
};

// Get Dashboard Summary & Metrics with Month & Year Filtering
const getDashboardMetrics = async (req, res) => {
  const userId = req.user ? req.user.userId : 1;
  const { month, year } = req.query;

  let prFilter = `WHERE pr.CurrentStatus NOT IN ('Brouillon', N'En Attente Validation Responsable', N'Refusée par Responsable', 'Refusee par Responsable', N'En Attente Validation Direction', N'Refusée par Direction', 'Refusee par Direction')`;
  if (year && year !== 'all') {
    prFilter += ` AND YEAR(pr.CreatedAt) = ${parseInt(year)}`;
  }
  if (month && month !== 'all') {
    prFilter += ` AND MONTH(pr.CreatedAt) = ${parseInt(month)}`;
  }

  try {
    const pool = await getPool();
    
    // Status counts
    const statusCounts = await pool.request().query(`
      SELECT CurrentStatus, COUNT(*) as Count
      FROM dbo.PurchaseRequests pr
      ${prFilter}
      GROUP BY CurrentStatus
    `);

    // Type Breakdown (Local vs Etranger)
    const typeCounts = await pool.request().query(`
      SELECT Type, COUNT(*) as Count
      FROM dbo.PurchaseRequests pr
      ${prFilter}
      GROUP BY Type
    `);

    // Total Requests (excluding Brouillons)
    const totalResult = await pool.request().query(`
      SELECT COUNT(*) as TotalCount FROM dbo.PurchaseRequests pr ${prFilter}
    `);

    // User's Own Requests Count (excluding Brouillons)
    const userTotalResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT COUNT(*) as UserCount 
        FROM dbo.PurchaseRequests pr 
        WHERE pr.RequesterID = @UserID
          AND pr.CurrentStatus != 'Brouillon'
        ${year && year !== 'all' ? `AND YEAR(pr.CreatedAt) = ${parseInt(year)}` : ''}
        ${month && month !== 'all' ? `AND MONTH(pr.CreatedAt) = ${parseInt(month)}` : ''}
      `);

    // Recent Activities (Status History Log)
    const recentActivities = await pool.request().query(`
      SELECT TOP 10 
        sh.HistoryID, sh.RequestID, pr.RequestNumber, pr.Title, pr.Type,
        sh.PreviousStatus, sh.NewStatus, sh.Comments, sh.ChangedAt,
        u.FullName as ChangedBy
      FROM dbo.StatusHistory sh
      JOIN dbo.PurchaseRequests pr ON sh.RequestID = pr.RequestID
      JOIN dbo.Users u ON sh.ChangedByID = u.UserID
      ${prFilter}
      ORDER BY sh.ChangedAt DESC
    `);

    // Available Years for filters
    const availableYearsResult = await pool.request().query(`
      SELECT DISTINCT YEAR(ISNULL(pr.RequestDate, pr.CreatedAt)) as YearNum
      FROM dbo.PurchaseRequests pr
      WHERE pr.CurrentStatus NOT IN ('Brouillon', N'En Attente Validation Responsable', N'Refusée par Responsable', 'Refusee par Responsable', N'En Attente Validation Direction', N'Refusée par Direction', 'Refusee par Direction')
        AND ISNULL(pr.RequestDate, pr.CreatedAt) IS NOT NULL
      ORDER BY YearNum DESC
    `);
    const availableYears = availableYearsResult.recordset.map(r => r.YearNum).filter(Boolean);
    const currentYear = new Date().getFullYear();
    if (!availableYears.includes(currentYear)) {
      availableYears.unshift(currentYear);
    }

    // Item-level completion breakdown with year filtering (defaults to current year, or selectable year)
    const targetItemYear = req.query.itemYear || (year && year !== 'all' ? year : String(currentYear));
    let itemFilter = `WHERE pr.CurrentStatus NOT IN ('Brouillon', N'En Attente Validation Responsable', N'Refusée par Responsable', 'Refusee par Responsable', N'En Attente Validation Direction', N'Refusée par Direction', 'Refusee par Direction')`;
    if (targetItemYear && targetItemYear !== 'all') {
      itemFilter += ` AND YEAR(ISNULL(pr.RequestDate, pr.CreatedAt)) = ${parseInt(targetItemYear)}`;
    }
    if (month && month !== 'all') {
      itemFilter += ` AND MONTH(ISNULL(pr.RequestDate, pr.CreatedAt)) = ${parseInt(month)}`;
    }

    const itemMetricsResult = await pool.request().query(`
      SELECT 
        SUM(CASE WHEN ri.ItemStatus NOT IN ('Annulé', 'Non Disponible') THEN ISNULL(ri.DeliveredQuantity, 0) ELSE 0 END) as TotalDeliveredUnits,
        SUM(CASE WHEN ri.ItemStatus NOT IN ('Annulé', 'Non Disponible') THEN ISNULL(ri.Quantity, 1) ELSE 0 END) as TotalActiveUnits,
        COUNT(CASE WHEN ri.ItemStatus = 'Livré Totalement' THEN 1 END) as DeliveredItems,
        COUNT(CASE WHEN ri.ItemStatus = 'Livré Partiellement' THEN 1 END) as PartialItems,
        COUNT(CASE WHEN ri.ItemStatus NOT IN ('Annulé', 'Non Disponible') THEN 1 END) as ActiveItems,
        COUNT(CASE WHEN ri.ItemStatus IN ('Annulé', 'Non Disponible') THEN 1 END) as CancelledItems,
        COUNT(*) as TotalItems
      FROM dbo.RequestItems ri
      JOIN dbo.PurchaseRequests pr ON ri.RequestID = pr.RequestID
      ${itemFilter}
    `);

    // Monthly Breakdown of Requests & Total Items (Grouped Dual Bar Chart)
    // Filter specifically for the chart without being collapsed by the single-month KPI filter
    const targetChartYear = req.query.chartYear || 'last12';
    let chartFilter = `WHERE pr.CurrentStatus NOT IN ('Brouillon', N'En Attente Validation Responsable', N'Refusée par Responsable', 'Refusee par Responsable', N'En Attente Validation Direction', N'Refusée par Direction', 'Refusee par Direction')`;

    if (targetChartYear === 'last12') {
      chartFilter += ` AND ISNULL(pr.RequestDate, pr.CreatedAt) >= DATEADD(month, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))`;
    } else if (targetChartYear !== 'all') {
      chartFilter += ` AND YEAR(ISNULL(pr.RequestDate, pr.CreatedAt)) = ${parseInt(targetChartYear)}`;
    }

    const monthlyBreakdownResult = await pool.request().query(`
      SELECT 
        YEAR(ISNULL(pr.RequestDate, pr.CreatedAt)) as YearNum,
        MONTH(ISNULL(pr.RequestDate, pr.CreatedAt)) as MonthNum,
        COUNT(DISTINCT pr.RequestID) as RequestCount,
        COUNT(ri.ItemID) as ItemCount
      FROM dbo.PurchaseRequests pr
      LEFT JOIN dbo.RequestItems ri ON pr.RequestID = ri.RequestID
      ${chartFilter}
      GROUP BY YEAR(ISNULL(pr.RequestDate, pr.CreatedAt)), MONTH(ISNULL(pr.RequestDate, pr.CreatedAt))
      ORDER BY YearNum ASC, MonthNum ASC
    `);

    const { TotalDeliveredUnits, TotalActiveUnits, DeliveredItems, PartialItems, ActiveItems, CancelledItems, TotalItems } = itemMetricsResult.recordset[0];
    const itemCompletionRate = (TotalActiveUnits && TotalActiveUnits > 0) ? Math.round((TotalDeliveredUnits / TotalActiveUnits) * 100) : 0;

    res.json({
      metrics: {
        totalRequests: totalResult.recordset[0].TotalCount || 0,
        myRequestsCount: userTotalResult.recordset[0].UserCount || 0,
        statusBreakdown: statusCounts.recordset,
        typeBreakdown: typeCounts.recordset,
        monthlyBreakdown: monthlyBreakdownResult.recordset,
        availableYears,
        chartYear: targetChartYear,
        itemYear: targetItemYear,
        itemCompletionRate,
        itemMetrics: {
          deliveredUnits: TotalDeliveredUnits || 0,
          activeUnits: TotalActiveUnits || 0,
          deliveredItems: DeliveredItems || 0,
          partialItems: PartialItems || 0,
          activeItems: ActiveItems || 0,
          cancelledItems: CancelledItems || 0,
          totalItems: TotalItems || 0
        }
      },
      recentActivities: recentActivities.recordset
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
};

// Get All Purchase Requests
const getAllRequests = async (req, res) => {
  const { status, type, search, myOnly, teamOnly, department, startDate, endDate, hasSignedDoc, onlyPending } = req.query;
  const userId = req.user ? req.user.userId : 1;

  try {
    const pool = await getPool();
    let query = `
      SELECT pr.RequestID, pr.RequestNumber, pr.Type, pr.RequestDate, pr.Title, pr.Department, 
             pr.CurrentStatus, pr.RequiredByDate, pr.HasSignedDoc, pr.TargetDirectorCode,
             pr.CreatedAt, COALESCE(u.FullName, pr.RequesterName, N'Utilisateur Supprimé') as RequesterName, pr.RequesterID
      FROM dbo.PurchaseRequests pr
      LEFT JOIN dbo.Users u ON pr.RequesterID = u.UserID
      WHERE 1=1
    `;

    const request = pool.request();

    if (myOnly === 'true') {
      query += ` AND pr.RequesterID = @UserID`;
      request.input('UserID', sql.Int, userId);
    } else if (teamOnly === 'true') {
      query += ` AND (
        u.ManagerID = @UserID OR 
        u.ManagerID IN (SELECT m2.UserID FROM dbo.Users m2 WHERE m2.InterimManagerID = @UserID)
      )`;
      request.input('UserID', sql.Int, userId);
    } else if (status === 'En Attente Validation Direction' || (status && status.toLowerCase().includes('direction'))) {
      if (onlyPending === 'true') {
        query += ` AND pr.CurrentStatus = N'En Attente Validation Direction'`;
      } else {
        query += ` AND pr.CurrentStatus != 'Brouillon'`;
      }

      // Filter by TargetDirectorCode if the user is a specific Director (and not DP or Admin master fallback)
      const userDirCode = req.user?.directorCode || req.user?.DirectorCode;
      const userRole = req.user?.role || req.user?.Role;
      if (userRole !== 'Admin' && userDirCode && userDirCode !== 'DP') {
        query += ` AND (
          pr.TargetDirectorCode = @UserDirCode OR 
          pr.Department IN (SELECT DepartmentName FROM dbo.Departments WHERE DirectorCode = @UserDirCode)
        )`;
        request.input('UserDirCode', sql.NVarChar(10), userDirCode);
      } else if (userRole !== 'Admin' && (!userDirCode || userDirCode === 'DP')) {
        query += ` AND (
          pr.TargetDirectorCode = 'DP' OR
          pr.Department IN (SELECT DepartmentName FROM dbo.Departments WHERE DirectorCode = 'DP') OR
          pr.CurrentStatus = N'En Attente Validation Direction'
        )`;
      }
    } else {
      // General Acheteur view: hides drafts, pending manager validation, and pending direction validation
      query += ` AND pr.CurrentStatus NOT IN ('Brouillon', N'En Attente Validation Responsable', N'Refusée par Responsable', 'Refusee par Responsable', N'En Attente Validation Direction', N'Refusée par Direction', 'Refusee par Direction')`;
    }

    if (status && status !== 'En Attente Validation Direction' && !status.toLowerCase().includes('direction') && status.toLowerCase() !== 'toutes' && status.toLowerCase() !== 'all' && status.toLowerCase() !== 'all_with_archived' && status !== 'undefined') {
      const s = status.trim().toLowerCase();
      if (s.includes('command')) {
        query += ` AND (pr.CurrentStatus = 'Commandee' OR pr.CurrentStatus = N'Commandée')`;
      } else if (s.includes('finalis')) {
        query += ` AND (pr.CurrentStatus = 'Finalisee' OR pr.CurrentStatus = N'Finalisée')`;
      } else if (s.includes('annul')) {
        query += ` AND (pr.CurrentStatus = 'Annulee' OR pr.CurrentStatus = N'Annulée')`;
      } else if (s.includes('archiv')) {
        query += ` AND (pr.CurrentStatus = 'Archivee' OR pr.CurrentStatus = N'Archivée')`;
      } else if (s.includes('validation') && s.includes('responsable')) {
        query += ` AND pr.CurrentStatus = N'En Attente Validation Responsable'`;
      } else if (s.includes('refus')) {
        query += ` AND (pr.CurrentStatus = N'Refusée par Responsable' OR pr.CurrentStatus = N'Refusee par Responsable' OR pr.CurrentStatus = N'Refusée par Direction' OR pr.CurrentStatus = N'Refusee par Direction')`;
      } else if (s.includes('attente')) {
        query += ` AND pr.CurrentStatus = 'En Attente'`;
      } else if (s.includes('cours')) {
        query += ` AND pr.CurrentStatus = 'En Cours'`;
      } else if (s.includes('brouillon')) {
        query += ` AND pr.CurrentStatus = 'Brouillon'`;
      } else {
        query += ` AND (pr.CurrentStatus = @Status OR pr.CurrentStatus LIKE @StatusLike)`;
        request.input('Status', sql.NVarChar(35), status);
        request.input('StatusLike', sql.NVarChar(35), `%${status}%`);
      }
    } else if (!status || status === 'all' || status === 'toutes') {
      query += ` AND (pr.CurrentStatus NOT IN ('Archivee', N'Archivée'))`;
    }

    if (type) {
      query += ` AND pr.Type = @Type`;
      request.input('Type', sql.NVarChar(20), type);
    }

    if (department) {
      query += ` AND pr.Department = @Department`;
      request.input('Department', sql.NVarChar(100), department);
    }

    if (startDate) {
      query += ` AND pr.RequestDate >= @StartDate`;
      request.input('StartDate', sql.NVarChar(30), startDate);
    }

    if (endDate) {
      query += ` AND pr.RequestDate <= @EndDate`;
      request.input('EndDate', sql.NVarChar(30), endDate);
    }

    if (hasSignedDoc === 'true') {
      query += ` AND pr.HasSignedDoc = 1`;
    }

    if (search) {
      query += ` AND (
        pr.RequestNumber LIKE @Search OR 
        pr.Title LIKE @Search OR 
        pr.Department LIKE @Search OR 
        u.FullName LIKE @Search OR
        EXISTS (
          SELECT 1 FROM dbo.RequestItems ri 
          WHERE ri.RequestID = pr.RequestID 
            AND (
              ri.ItemDescription LIKE @Search OR 
              ri.Observation LIKE @Search
            )
        )
      )`;
      request.input('Search', sql.NVarChar(200), `%${search}%`);
    }

    query += ` ORDER BY pr.CreatedAt DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    res.status(500).json({ error: 'Failed to fetch purchase requests' });
  }
};

// Get Request Details by ID
const getRequestById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    const requestResult = await pool.request()
      .input('RequestID', sql.Int, id)
      .query(`
        SELECT pr.*, COALESCE(u.FullName, pr.RequesterName, N'Utilisateur Supprimé') as RequesterName, u.Username as RequesterUsername
        FROM dbo.PurchaseRequests pr
        LEFT JOIN dbo.Users u ON pr.RequesterID = u.UserID
        WHERE pr.RequestID = @RequestID
      `);

    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Demande d\'achat introuvable' });
    }

    const purchaseRequest = requestResult.recordset[0];

    const itemsResult = await pool.request()
      .input('RequestID', sql.Int, id)
      .query(`SELECT ItemID, ItemDescription, Quantity, ISNULL(Unit, 'U') as Unit, ISNULL(DeliveredQuantity, 0) as DeliveredQuantity, Observation, ItemStatus FROM dbo.RequestItems WHERE RequestID = @RequestID ORDER BY ItemID ASC`);

    const attachmentsResult = await pool.request()
      .input('RequestID', sql.Int, id)
      .query(`
        SELECT a.*, u.FullName as UploadedByName
        FROM dbo.Attachments a
        LEFT JOIN dbo.Users u ON a.UploadedByID = u.UserID
        WHERE a.RequestID = @RequestID
      `);

    const historyResult = await pool.request()
      .input('RequestID', sql.Int, id)
      .query(`
        SELECT sh.*, u.FullName as ChangedByName
        FROM dbo.StatusHistory sh
        LEFT JOIN dbo.Users u ON sh.ChangedByID = u.UserID
        WHERE sh.RequestID = @RequestID
        ORDER BY sh.ChangedAt DESC
      `);

    res.json({
      request: purchaseRequest,
      items: itemsResult.recordset,
      attachments: attachmentsResult.recordset,
      statusHistory: historyResult.recordset
    });

  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details' });
  }
};

// Create New Purchase Request
const createRequest = async (req, res) => {
  const { type, customNumber, requestDate, title, department, requiredByDate, description, items, status } = req.body;

  if (!title || !title.trim() || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'L\'objet et les désignations d\'articles sont requis' });
  }

  // Check initial status: If submitting (non-Brouillon), check if approval system is enabled
  let initialStatus = 'En Attente';
  if (status === 'Brouillon') {
    initialStatus = 'Brouillon';
  } else {
    try {
      const requesterIdVal = req.user ? req.user.userId : 1;
      const pool = await getPool();

      // Check SystemSettings (ENABLE_RESPONSABLE_APPROVAL & ENABLE_DIRECTOR_AUTHORIZATION)
      const settingsRes = await pool.request().query(`
        SELECT SettingKey, SettingValue FROM dbo.SystemSettings 
        WHERE SettingKey IN ('ENABLE_RESPONSABLE_APPROVAL', 'ENABLE_DIRECTOR_AUTHORIZATION', 'ENABLE_DEMANDE_APPROVAL')
      `);
      let isResponsableAuthEnabled = true;
      let isDirectorAuthEnabled = false;

      settingsRes.recordset.forEach(r => {
        if (r.SettingKey === 'ENABLE_RESPONSABLE_APPROVAL') isResponsableAuthEnabled = r.SettingValue === '1';
        if (r.SettingKey === 'ENABLE_DIRECTOR_AUTHORIZATION') isDirectorAuthEnabled = r.SettingValue === '1';
        if (r.SettingKey === 'ENABLE_DEMANDE_APPROVAL' && r.SettingValue === '0') {
          isResponsableAuthEnabled = false;
          isDirectorAuthEnabled = false;
        }
      });

      const mgrRes = await pool.request()
        .input('UID', sql.Int, requesterIdVal)
        .query(`
          SELECT u.ManagerID, u.IsResponsable, u.Role, u.DirectorCode, mgr.InterimManagerID as ManagerInterimID
          FROM dbo.Users u
          LEFT JOIN dbo.Users mgr ON u.ManagerID = mgr.UserID
          WHERE u.UserID = @UID
        `);
      if (mgrRes.recordset.length > 0) {
        const uInfo = mgrRes.recordset[0];
        const isDirectorUser = Boolean(uInfo.Role === 'Admin' || (uInfo.DirectorCode && ['DP', 'DC', 'DFC', 'DRH', 'DG'].includes(String(uInfo.DirectorCode).trim())));

        if (isResponsableAuthEnabled && uInfo.ManagerID && !uInfo.IsResponsable && uInfo.Role !== 'Admin') {
          initialStatus = 'En Attente Validation Responsable';
        } else if (isDirectorAuthEnabled && !isDirectorUser) {
          initialStatus = 'En Attente Validation Direction';
        } else {
          initialStatus = 'En Attente';
        }
      }
    } catch (err) {
      console.error('Error checking requester approval settings:', err);
    }
  }

  const transaction = new sql.Transaction(await getPool());

  try {
    await transaction.begin();

    // Verify user ID validity
    let validRequesterId = req.user ? req.user.userId : 1;
    const userCheck = await transaction.request()
      .input('UID', sql.Int, validRequesterId)
      .query(`SELECT UserID FROM dbo.Users WHERE UserID = @UID`);

    if (userCheck.recordset.length === 0) {
      const firstUser = await transaction.request().query(`SELECT TOP 1 UserID FROM dbo.Users ORDER BY UserID ASC`);
      if (firstUser.recordset.length > 0) {
        validRequesterId = firstUser.recordset[0].UserID;
      }
    }

    // Auto-generate request number if empty or ensure uniqueness
    let requestNumber = customNumber ? customNumber.trim() : '';
    const currentYear = new Date().getFullYear();

    if (!requestNumber) {
      // Find highest existing sequence number in database
      const maxSeqResult = await transaction.request().query(`
        SELECT ISNULL(MAX(CAST(SUBSTRING(RequestNumber, CHARINDEX(N'N°', RequestNumber) + 2, CHARINDEX('/SENSUS', RequestNumber) - (CHARINDEX(N'N°', RequestNumber) + 2)) AS INT)), 1230) as MaxSeq
        FROM dbo.PurchaseRequests
        WHERE RequestNumber LIKE N'N°%/SENSUS/%'
      `);

      let nextSeq = (maxSeqResult.recordset[0]?.MaxSeq || 1230) + 1;
      let isUnique = false;

      while (!isUnique) {
        const testNum = `N°${nextSeq}/SENSUS/DP/${currentYear}`;
        const checkNum = await transaction.request()
          .input('CheckNum', sql.NVarChar(60), testNum)
          .query(`SELECT RequestID FROM dbo.PurchaseRequests WHERE RequestNumber = @CheckNum`);

        if (checkNum.recordset.length === 0) {
          requestNumber = testNum;
          isUnique = true;
        } else {
          nextSeq++;
        }
      }
    } else {
      const refInfo = normalizeRefNumber(requestNumber);
      if (!refInfo.seq || isNaN(refInfo.seq)) {
        try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
        return res.status(400).json({ error: 'Le numéro de référence ne peut pas être vide ou nul.' });
      }

      requestNumber = refInfo.normRef;

      // Check duplicate using normalized sequence, department, and year
      const pattern1 = `N°${refInfo.seq}/SENSUS/${refInfo.dept}/${refInfo.year}`;
      const pattern2 = `N°%${refInfo.seq}/SENSUS/${refInfo.dept}/${refInfo.year}`;

      const checkCustom = await transaction.request()
        .input('Pattern1', sql.NVarChar(60), pattern1)
        .input('Pattern2', sql.NVarChar(60), pattern2)
        .query(`
          SELECT RequestID, RequestNumber FROM dbo.PurchaseRequests 
          WHERE RequestNumber = @Pattern1 OR RequestNumber LIKE @Pattern2
        `);

      if (checkCustom.recordset.length > 0) {
        const existing = checkCustom.recordset[0];
        try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
        return res.status(400).json({
          error: `Le numéro de référence "${requestNumber}" (numéro ${refInfo.seq}) existe déjà dans le système (Réf: ${existing.RequestNumber}). Veuillez utiliser un numéro unique.`
        });
      }
    }

    const dateVal = requestDate || new Date().toISOString().split('T')[0];
    const deptVal = department || 'Achat';
    const requesterNameVal = req.user ? (req.user.name || req.user.fullName || req.user.FullName) : 'Utilisateur';

    let targetDirCode = 'DP';
    const DIRECTOR_CODES = ['DP', 'DC', 'DFC', 'DRH', 'DG'];
    const refInfoForDir = normalizeRefNumber(requestNumber);

    if (refInfoForDir.dept && DIRECTOR_CODES.includes(refInfoForDir.dept.toUpperCase())) {
      targetDirCode = refInfoForDir.dept.toUpperCase();
    } else {
      try {
        const deptDirRes = await transaction.request()
          .input('DeptVal', sql.NVarChar(100), deptVal)
          .query(`
            SELECT DirectorCode FROM dbo.Departments 
            WHERE DepartmentName = @DeptVal OR DirectorCode = @DeptVal
          `);
        if (deptDirRes.recordset.length > 0 && deptDirRes.recordset[0].DirectorCode) {
          targetDirCode = deptDirRes.recordset[0].DirectorCode;
        }
      } catch (e) {
        console.error('Error fetching department director code:', e);
      }
    }

    // Insert Purchase Request Header
    const requestResult = await transaction.request()
      .input('RequestNumber', sql.NVarChar(60), requestNumber)
      .input('Type', sql.NVarChar(20), type || 'Local')
      .input('RequestDate', sql.NVarChar(100), dateVal)
      .input('RequesterID', sql.Int, validRequesterId)
      .input('RequesterName', sql.NVarChar(100), requesterNameVal)
      .input('Department', sql.NVarChar(100), deptVal)
      .input('Title', sql.NVarChar(200), title.trim())
      .input('Description', sql.NVarChar(sql.MAX), description || '')
      .input('CurrentStatus', sql.NVarChar(100), initialStatus)
      .input('RequiredByDate', sql.NVarChar(100), requiredByDate || null)
      .input('TargetDirectorCode', sql.NVarChar(10), targetDirCode)
      .query(`
        INSERT INTO dbo.PurchaseRequests 
        (RequestNumber, Type, RequestDate, RequesterID, RequesterName, Department, Title, Description, CurrentStatus, RequiredByDate, TargetDirectorCode)
        OUTPUT INSERTED.RequestID
        VALUES 
        (@RequestNumber, @Type, @RequestDate, @RequesterID, @RequesterName, @Department, @Title, @Description, @CurrentStatus, @RequiredByDate, @TargetDirectorCode);
      `);

    const newRequestId = requestResult.recordset[0].RequestID;

    // Insert Request Items
    for (const item of items) {
      if (item.itemDescription && item.itemDescription.trim()) {
        await transaction.request()
          .input('RequestID', sql.Int, newRequestId)
          .input('ItemDescription', sql.NVarChar(255), item.itemDescription.trim())
          .input('Quantity', sql.Int, parseInt(item.quantity) || 1)
          .input('Unit', sql.NVarChar(50), item.unit ? item.unit.trim() : 'U')
          .input('Observation', sql.NVarChar(sql.MAX), item.observation || '')
          .query(`
            INSERT INTO dbo.RequestItems 
            (RequestID, ItemDescription, Quantity, Unit, Observation)
            VALUES 
            (@RequestID, @ItemDescription, @Quantity, @Unit, @Observation);
          `);
      }
    }

    // Insert Initial Status History Entry
    await transaction.request()
      .input('RequestID', sql.Int, newRequestId)
      .input('PreviousStatus', sql.NVarChar(100), 'Initial')
      .input('NewStatus', sql.NVarChar(100), initialStatus)
      .input('ChangedByID', sql.Int, validRequesterId)
      .input('Comments', sql.NVarChar(sql.MAX), initialStatus === 'Brouillon' ? 'Enregistré comme Brouillon' : `Création et soumission de la demande d'achat ${type || 'Local'}`)
      .query(`
        INSERT INTO dbo.StatusHistory (RequestID, PreviousStatus, NewStatus, ChangedByID, Comments)
        VALUES (@RequestID, @PreviousStatus, @NewStatus, @ChangedByID, @Comments);
      `);

    await transaction.commit();

    // Trigger email notification asynchronously if not Brouillon
    if (initialStatus !== 'Brouillon') {
      emailService.sendNewRequestNotification({
        requestNumber,
        title,
        type,
        department: deptVal,
        requesterName: requesterNameVal,
        requestDate: dateVal,
        requiredByDate,
        description
      }, items).catch(err => console.error('Error in async email notification:', err));
    }

    res.status(201).json({
      message: 'Demande d\'achat créée avec succès',
      requestId: newRequestId,
      requestNumber: requestNumber
    });

  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackErr) {
      // Transaction was already aborted by SQL Server — safe to ignore
      console.warn('Rollback skipped (already aborted):', rollbackErr.code);
    }
    console.error('Error creating purchase request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Échec de la création de la demande d\'achat' });
    }
  }
};

// Update Request Status (French Status Validation)
const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { newStatus, comments } = req.body;
  const changedById = req.user ? req.user.userId : 1;

  const statusMap = {
    'commandee': 'Commandee',
    'commandée': 'Commandee',
    'finalisee': 'Finalisee',
    'finalisée': 'Finalisee',
    'annulee': 'Annulee',
    'annulée': 'Annulee',
    'archivee': 'Archivee',
    'archivée': 'Archivee',
    'en attente': 'En Attente',
    'en attente validation responsable': 'En Attente Validation Responsable',
    'validation responsable': 'En Attente Validation Responsable',
    'en attente validation direction': 'En Attente Validation Direction',
    'validation direction': 'En Attente Validation Direction',
    'refusée par responsable': 'Refusée par Responsable',
    'refusee par responsable': 'Refusée par Responsable',
    'refusée par direction': 'Refusée par Direction',
    'refusee par direction': 'Refusée par Direction',
    'en cours': 'En Cours',
    'brouillon': 'Brouillon'
  };

  let targetStatus = statusMap[newStatus.trim().toLowerCase()] || newStatus;

  // Check SystemSettings (ENABLE_RESPONSABLE_APPROVAL & ENABLE_DIRECTOR_AUTHORIZATION)
  let isResponsableAuthEnabled = true;
  let isDirectorAuthEnabled = false;
  try {
    const settingPool = await getPool();
    const settingsRes = await settingPool.request().query(`
      SELECT SettingKey, SettingValue FROM dbo.SystemSettings 
      WHERE SettingKey IN ('ENABLE_RESPONSABLE_APPROVAL', 'ENABLE_DIRECTOR_AUTHORIZATION', 'ENABLE_DEMANDE_APPROVAL')
    `);
    settingsRes.recordset.forEach(r => {
      if (r.SettingKey === 'ENABLE_RESPONSABLE_APPROVAL') isResponsableAuthEnabled = r.SettingValue === '1';
      if (r.SettingKey === 'ENABLE_DIRECTOR_AUTHORIZATION') isDirectorAuthEnabled = r.SettingValue === '1';
      if (r.SettingKey === 'ENABLE_DEMANDE_APPROVAL' && r.SettingValue === '0') {
        isResponsableAuthEnabled = false;
        isDirectorAuthEnabled = false;
      }
    });
  } catch (e) {
    console.error('Error reading SystemSettings in updateStatus:', e);
  }

  // If submitting a request from Brouillon to En Attente, check approval settings
  if (targetStatus === 'En Attente') {
    try {
      const currentReqInfo = await (await getPool()).request()
        .input('RequestID', sql.Int, id)
        .query(`
          SELECT pr.RequesterID, u.ManagerID, u.IsResponsable, u.Role, u.DirectorCode, mgr.InterimManagerID as ManagerInterimID 
          FROM dbo.PurchaseRequests pr 
          LEFT JOIN dbo.Users u ON pr.RequesterID = u.UserID 
          LEFT JOIN dbo.Users mgr ON u.ManagerID = mgr.UserID 
          WHERE pr.RequestID = @RequestID
        `);
      if (currentReqInfo.recordset.length > 0) {
        const u = currentReqInfo.recordset[0];
        const isDirectorUser = Boolean(u.Role === 'Admin' || (u.DirectorCode && ['DP', 'DC', 'DFC', 'DRH', 'DG'].includes(String(u.DirectorCode).trim())));

        if (u.RequesterID === changedById) {
          if (isResponsableAuthEnabled && u.ManagerID && !u.IsResponsable && u.Role !== 'Admin') {
            targetStatus = 'En Attente Validation Responsable';
          } else if (isDirectorAuthEnabled && !isDirectorUser) {
            targetStatus = 'En Attente Validation Direction';
          }
        }
      }
    } catch (e) {
      console.error('Error checking user manager in updateStatus:', e);
    }
  }

  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    return res.status(400).json({ error: 'Un statut valide est requis (Brouillon, En Attente, En Cours, Commandée, Finalisée, Annulée)' });
  }

  const transaction = new sql.Transaction(await getPool());

  try {
    await transaction.begin();

    const currentRes = await transaction.request()
      .input('RequestID', sql.Int, id)
      .query(`SELECT CurrentStatus FROM dbo.PurchaseRequests WHERE RequestID = @RequestID`);

    if (currentRes.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Demande d\'achat introuvable' });
    }

    const previousStatus = currentRes.recordset[0].CurrentStatus;

    // Direction Validation Intercept: If team manager approved (moving to En Attente), check if Director authorization is required
    if (isDirectorAuthEnabled && targetStatus === 'En Attente' && previousStatus === 'En Attente Validation Responsable') {
      const valUserRes = await transaction.request()
        .input('UID', sql.Int, changedById)
        .query(`SELECT Role, DirectorCode FROM dbo.Users WHERE UserID = @UID`);
      const valUser = valUserRes.recordset[0];
      const isDirectorUser = Boolean(valUser && (valUser.Role === 'Admin' || (valUser.DirectorCode && ['DP', 'DC', 'DFC', 'DRH', 'DG'].includes(String(valUser.DirectorCode).trim()))));

      if (!isDirectorUser) {
        targetStatus = 'En Attente Validation Direction';

        // Preserve or populate TargetDirectorCode
        try {
          const reqDeptRes = await transaction.request()
            .input('ReqID', sql.Int, id)
            .query(`
              SELECT pr.RequestNumber, pr.Department, pr.TargetDirectorCode, d.DirectorCode as DeptDirCode 
              FROM dbo.PurchaseRequests pr 
              LEFT JOIN dbo.Departments d ON pr.Department = d.DepartmentName 
              WHERE pr.RequestID = @ReqID
            `);
          if (reqDeptRes.recordset.length > 0) {
            const row = reqDeptRes.recordset[0];
            const DIRECTOR_CODES = ['DP', 'DC', 'DFC', 'DRH', 'DG'];
            
            let tgtDir = row.TargetDirectorCode;
            const refInfo = normalizeRefNumber(row.RequestNumber);
            
            if (refInfo.dept && DIRECTOR_CODES.includes(refInfo.dept.toUpperCase())) {
              tgtDir = refInfo.dept.toUpperCase();
            } else if (!tgtDir && row.DeptDirCode) {
              tgtDir = row.DeptDirCode;
            }

            if (tgtDir) {
              await transaction.request()
                .input('ReqID2', sql.Int, id)
                .input('TgtDir', sql.NVarChar(10), tgtDir)
                .query(`UPDATE dbo.PurchaseRequests SET TargetDirectorCode = @TgtDir WHERE RequestID = @ReqID2`);
            }
          }
        } catch (e) {
          console.error('Error setting TargetDirectorCode on Level 1 approval:', e);
        }
      }
    }

    await transaction.request()
      .input('RequestID', sql.Int, id)
      .input('NewStatus', sql.NVarChar(100), targetStatus)
      .query(`
        UPDATE dbo.PurchaseRequests 
        SET CurrentStatus = @NewStatus, UpdatedAt = SYSDATETIME() 
        WHERE RequestID = @RequestID
      `);

    // Complete 2-way Cascade update child items based on new header status
    if (['Finalisee', 'Finalisée'].includes(targetStatus)) {
      // Set active items to Livré Totalement
      await transaction.request()
        .input('RequestID', sql.Int, id)
        .query(`
          UPDATE dbo.RequestItems 
          SET ItemStatus = N'Livré Totalement' 
          WHERE RequestID = @RequestID AND ItemStatus NOT IN (N'Annulé', N'Non Disponible')
        `);
    } else if (['Annulee', 'Annulée'].includes(targetStatus)) {
      // Set all items to Annulé
      await transaction.request()
        .input('RequestID', sql.Int, id)
        .query(`
          UPDATE dbo.RequestItems 
          SET ItemStatus = N'Annulé' 
          WHERE RequestID = @RequestID
        `);
    } else if (['Commandee', 'Commandée'].includes(targetStatus) || targetStatus === 'En Cours') {
      // Revert delivered items back to En Cours
      await transaction.request()
        .input('RequestID', sql.Int, id)
        .query(`
          UPDATE dbo.RequestItems 
          SET ItemStatus = N'En Cours' 
          WHERE RequestID = @RequestID AND ItemStatus NOT IN (N'Annulé', N'Non Disponible')
        `);
    } else if (['En Attente', 'Brouillon'].includes(targetStatus)) {
      // Revert items back to En Attente
      await transaction.request()
        .input('RequestID', sql.Int, id)
        .query(`
          UPDATE dbo.RequestItems 
          SET ItemStatus = N'En Attente' 
          WHERE RequestID = @RequestID AND ItemStatus NOT IN (N'Annulé', N'Non Disponible')
        `);
    }

    await transaction.request()
      .input('RequestID', sql.Int, id)
      .input('PreviousStatus', sql.NVarChar(100), previousStatus)
      .input('NewStatus', sql.NVarChar(100), targetStatus)
      .input('ChangedByID', sql.Int, changedById)
      .input('Comments', sql.NVarChar(sql.MAX), comments || `Statut mis à jour : ${targetStatus}`)
      .query(`
        INSERT INTO dbo.StatusHistory (RequestID, PreviousStatus, NewStatus, ChangedByID, Comments)
        VALUES (@RequestID, @PreviousStatus, @NewStatus, @ChangedByID, @Comments);
      `);

    await transaction.commit();

    res.json({
      message: `Statut mis à jour (${previousStatus} ➔ ${targetStatus})`,
      requestId: id,
      previousStatus,
      newStatus: targetStatus
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Échec de la mise à jour du statut' });
  }
};

// Update Individual Item Status & Delivered Quantity inside a Request
const updateItemStatus = async (req, res) => {
  const { requestId, itemId } = req.params;
  const { newItemStatus, deliveredQuantity } = req.body;
  const changedById = req.user ? req.user.userId : 1;

  const transaction = new sql.Transaction(await getPool());

  try {
    await transaction.begin();

    // Fetch existing item details
    const existingItemRes = await transaction.request()
      .input('ItemID', sql.Int, itemId)
      .input('RequestID', sql.Int, requestId)
      .query(`SELECT Quantity, ISNULL(DeliveredQuantity, 0) as DeliveredQuantity, ItemStatus FROM dbo.RequestItems WHERE ItemID = @ItemID AND RequestID = @RequestID`);

    if (existingItemRes.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Article introuvable' });
    }

    const item = existingItemRes.recordset[0];
    const targetQuantity = item.Quantity || 1;
    let finalDeliveredQty = item.DeliveredQuantity || 0;
    let finalItemStatus = newItemStatus || item.ItemStatus;

    if (deliveredQuantity !== undefined && deliveredQuantity !== null) {
      finalDeliveredQty = Math.max(0, Math.min(targetQuantity, parseInt(deliveredQuantity) || 0));
      if (finalDeliveredQty >= targetQuantity) {
        finalItemStatus = 'Livré Totalement';
      } else if (finalDeliveredQty > 0) {
        finalItemStatus = 'Livré Partiellement';
      } else if (finalItemStatus === 'Livré Totalement' || finalItemStatus === 'Livré Partiellement') {
        finalItemStatus = 'En Cours';
      }
    } else if (newItemStatus === 'Livré Totalement') {
      finalDeliveredQty = targetQuantity;
    } else if (['Annulé', 'Non Disponible', 'En Attente'].includes(newItemStatus)) {
      finalDeliveredQty = 0;
    }

    // 1. Update target item
    await transaction.request()
      .input('ItemID', sql.Int, itemId)
      .input('RequestID', sql.Int, requestId)
      .input('DeliveredQuantity', sql.Int, finalDeliveredQty)
      .input('ItemStatus', sql.NVarChar(50), finalItemStatus)
      .query(`
        UPDATE dbo.RequestItems
        SET DeliveredQuantity = @DeliveredQuantity, ItemStatus = @ItemStatus
        WHERE ItemID = @ItemID AND RequestID = @RequestID
      `);

    // 2. Fetch all items for this request to evaluate auto header status
    const allItemsRes = await transaction.request()
      .input('RequestID', sql.Int, requestId)
      .query(`SELECT ItemStatus, Quantity, ISNULL(DeliveredQuantity, 0) as DeliveredQuantity FROM dbo.RequestItems WHERE RequestID = @RequestID`);

    const items = allItemsRes.recordset;
    
    // 3. Fetch current parent request status
    const parentRes = await transaction.request()
      .input('RequestID', sql.Int, requestId)
      .query(`SELECT CurrentStatus FROM dbo.PurchaseRequests WHERE RequestID = @RequestID`);

    let autoHeaderStatus = null;
    if (parentRes.recordset.length > 0 && items.length > 0) {
      const currentParentStatus = parentRes.recordset[0].CurrentStatus;
      
      const activeItems = items.filter(i => !['Annulé', 'Non Disponible'].includes(i.ItemStatus));
      const deliveredItems = items.filter(i => ['Livré Totalement', 'Livré'].includes(i.ItemStatus));
      const cancelledItems = items.filter(i => ['Annulé', 'Non Disponible'].includes(i.ItemStatus));
      const startedItems = items.filter(i => ['Livré Totalement', 'Livré Partiellement', 'En Cours'].includes(i.ItemStatus));

      if (items.length > 0 && cancelledItems.length === items.length) {
        autoHeaderStatus = 'Annulee';
      } else if (activeItems.length > 0 && deliveredItems.length === activeItems.length) {
        autoHeaderStatus = 'Finalisee';
      } else if (startedItems.length > 0 && ['En Attente', 'Brouillon'].includes(currentParentStatus)) {
        autoHeaderStatus = 'En Cours';
      }

      if (autoHeaderStatus && autoHeaderStatus !== currentParentStatus) {
        await transaction.request()
          .input('RequestID', sql.Int, requestId)
          .input('NewStatus', sql.NVarChar(100), autoHeaderStatus)
          .query(`
            UPDATE dbo.PurchaseRequests 
            SET CurrentStatus = @NewStatus, UpdatedAt = SYSDATETIME() 
            WHERE RequestID = @RequestID
          `);

        await transaction.request()
          .input('RequestID', sql.Int, requestId)
          .input('PreviousStatus', sql.NVarChar(100), currentParentStatus)
          .input('NewStatus', sql.NVarChar(100), autoHeaderStatus)
          .input('ChangedByID', sql.Int, changedById)
          .input('Comments', sql.NVarChar(sql.MAX), `Mise à jour automatique du statut suite aux livraisons d'articles (${currentParentStatus} ➔ ${autoHeaderStatus})`)
          .query(`
            INSERT INTO dbo.StatusHistory (RequestID, PreviousStatus, NewStatus, ChangedByID, Comments)
            VALUES (@RequestID, @PreviousStatus, @NewStatus, @ChangedByID, @Comments);
          `);
      }
    }

    await transaction.commit();

    res.json({ 
      message: 'Statut et quantité livrée de l\'article mis à jour', 
      itemId, 
      newItemStatus: finalItemStatus,
      deliveredQuantity: finalDeliveredQty,
      autoUpdatedRequestStatus: autoHeaderStatus 
    });

  } catch (error) {
    try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
    console.error('Error updating item status:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Échec de la mise à jour de l\'article' });
  }
};

// Update Purchase Request (PUT /api/requests/:id)
const updateRequest = async (req, res) => {
  const { id } = req.params;
  const { type, title, department, requestDate, requiredByDate, description, items, status, customNumber, requestNumber } = req.body;
  const userId = req.user ? req.user.userId : 1;
  const userRole = req.user ? req.user.role : null;

  const transaction = new sql.Transaction(await getPool());

  try {
    await transaction.begin();

    const reqRes = await transaction.request()
      .input('RequestID', sql.Int, id)
      .query(`
        SELECT pr.CurrentStatus, pr.RequesterID, pr.RequestNumber, pr.Department, pr.TargetDirectorCode,
               pr.Title, pr.Type, pr.RequestDate, pr.RequiredByDate, pr.Description
        FROM dbo.PurchaseRequests pr 
        WHERE pr.RequestID = @RequestID
      `);

    if (reqRes.recordset.length === 0) {
      try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const currentReq = reqRes.recordset[0];

    // Security & Authorization: Only the creator of the DA or an Admin can edit it
    if (userRole !== 'Admin' && currentReq.RequesterID !== userId) {
      try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
      return res.status(403).json({ error: 'Vous ne pouvez modifier que les demandes d\'achat que vous avez créées.' });
    }

    // Fetch existing items for detailed comparison
    const existingItemsRes = await transaction.request()
      .input('RequestID', sql.Int, id)
      .query(`SELECT ItemDescription, Quantity, Unit, Observation FROM dbo.RequestItems WHERE RequestID = @RequestID`);
    const oldItems = existingItemsRes.recordset || [];

    const numCheck = customNumber || requestNumber;
    let targetNum = null;
    if (numCheck && numCheck.trim()) {
      const refInfo = normalizeRefNumber(numCheck);
      if (!refInfo.seq || isNaN(refInfo.seq)) {
        try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
        return res.status(400).json({ error: 'Le numéro de référence ne peut pas être vide ou nul.' });
      }

      targetNum = refInfo.normRef;
      const pattern1 = `N°${refInfo.seq}/SENSUS/${refInfo.dept}/${refInfo.year}`;
      const pattern2 = `N°%${refInfo.seq}/SENSUS/${refInfo.dept}/${refInfo.year}`;

      const dupCheck = await transaction.request()
        .input('Pattern1', sql.NVarChar(60), pattern1)
        .input('Pattern2', sql.NVarChar(60), pattern2)
        .input('RequestID', sql.Int, id)
        .query(`
          SELECT RequestID, RequestNumber FROM dbo.PurchaseRequests 
          WHERE (RequestNumber = @Pattern1 OR RequestNumber LIKE @Pattern2) 
            AND RequestID != @RequestID
        `);

      if (dupCheck.recordset.length > 0) {
        const existing = dupCheck.recordset[0];
        try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
        return res.status(400).json({
          error: `Le numéro de référence "${targetNum}" (numéro ${refInfo.seq}) existe déjà dans le système (Réf: ${existing.RequestNumber}). Veuillez utiliser un numéro unique.`
        });
      }
    }

    const prevStatus = currentReq.CurrentStatus;
    let targetStatus = status || prevStatus;

    if (prevStatus === 'Brouillon' && targetStatus === 'En Attente') {
      let isResponsableAuthEnabled = true;
      let isDirectorAuthEnabled = false;
      try {
        const settingPool = await getPool();
        const settingsRes = await settingPool.request().query(`
          SELECT SettingKey, SettingValue FROM dbo.SystemSettings 
          WHERE SettingKey IN ('ENABLE_RESPONSABLE_APPROVAL', 'ENABLE_DIRECTOR_AUTHORIZATION', 'ENABLE_DEMANDE_APPROVAL')
        `);
        settingsRes.recordset.forEach(r => {
          if (r.SettingKey === 'ENABLE_RESPONSABLE_APPROVAL') isResponsableAuthEnabled = r.SettingValue === '1';
          if (r.SettingKey === 'ENABLE_DIRECTOR_AUTHORIZATION') isDirectorAuthEnabled = r.SettingValue === '1';
          if (r.SettingKey === 'ENABLE_DEMANDE_APPROVAL' && r.SettingValue === '0') {
            isResponsableAuthEnabled = false;
            isDirectorAuthEnabled = false;
          }
        });
      } catch (e) {
        console.error('Error reading SystemSettings in updateRequest:', e);
      }

      try {
        const userRes = await (await getPool()).request()
          .input('UID', sql.Int, userId)
          .query(`
            SELECT u.ManagerID, u.IsResponsable, u.Role, u.DirectorCode 
            FROM dbo.Users u WHERE u.UserID = @UID
          `);
        if (userRes.recordset.length > 0) {
          const u = userRes.recordset[0];
          const isDirectorUser = Boolean(u.Role === 'Admin' || (u.DirectorCode && ['DP', 'DC', 'DFC', 'DRH', 'DG'].includes(String(u.DirectorCode).trim())));

          if (isResponsableAuthEnabled && u.ManagerID && !u.IsResponsable && u.Role !== 'Admin') {
            targetStatus = 'En Attente Validation Responsable';
          } else if (isDirectorAuthEnabled && !isDirectorUser) {
            targetStatus = 'En Attente Validation Direction';
          } else {
            targetStatus = 'En Attente';
          }
        }
      } catch (e) {
        console.error('Error checking user manager in updateRequest:', e);
      }
    }

    const finalReqNumber = targetNum || currentReq.RequestNumber;
    const dateVal = requestDate || undefined;

    // --- COMPUTE DETAILED CHANGES AUDIT TRAIL ---
    const diffList = [];

    if (finalReqNumber && finalReqNumber !== currentReq.RequestNumber) {
      diffList.push(`N° Réf: "${currentReq.RequestNumber}" ➔ "${finalReqNumber}"`);
    }
    if (title && title.trim() !== (currentReq.Title || '').trim()) {
      diffList.push(`Objet: "${currentReq.Title || 'Sans titre'}" ➔ "${title.trim()}"`);
    }
    if (type && type !== currentReq.Type) {
      diffList.push(`Type: "${currentReq.Type}" ➔ "${type}"`);
    }

    // Date changes
    if (requestDate) {
      const oldDate = currentReq.RequestDate ? new Date(currentReq.RequestDate).toISOString().split('T')[0] : '';
      const newDate = new Date(requestDate).toISOString().split('T')[0];
      if (oldDate && newDate && oldDate !== newDate) {
        diffList.push(`Date Demande: "${oldDate}" ➔ "${newDate}"`);
      }
    }

    if (requiredByDate !== undefined) {
      const oldReqBy = currentReq.RequiredByDate ? new Date(currentReq.RequiredByDate).toISOString().split('T')[0] : '';
      const newReqBy = requiredByDate ? new Date(requiredByDate).toISOString().split('T')[0] : '';
      if (oldReqBy !== newReqBy) {
        diffList.push(`Date Souhaitée: "${oldReqBy || 'Non spécifiée'}" ➔ "${newReqBy || 'Non spécifiée'}"`);
      }
    }

    if (description !== undefined && (description || '').trim() !== (currentReq.Description || '').trim()) {
      diffList.push(`Remarques: "${(currentReq.Description || 'Aucune').trim()}" ➔ "${(description || 'Aucune').trim()}"`);
    }

    // Article changes
    if (items && Array.isArray(items)) {
      const added = items.filter(n => !oldItems.some(o => (o.ItemDescription || '').trim().toLowerCase() === (n.itemDescription || '').trim().toLowerCase()));
      const removed = oldItems.filter(o => !items.some(n => (n.itemDescription || '').trim().toLowerCase() === (o.ItemDescription || '').trim().toLowerCase()));
      const modified = items.filter(n => {
        const match = oldItems.find(o => (o.ItemDescription || '').trim().toLowerCase() === (n.itemDescription || '').trim().toLowerCase());
        return match && (parseInt(match.Quantity) !== parseInt(n.quantity) || (match.Unit || 'U') !== (n.unit || 'U') || (match.Observation || '') !== (n.observation || ''));
      });

      const itemDiffs = [];
      if (added.length > 0) {
        itemDiffs.push(`+ Ajout de ${added.length} article(s): ${added.map(a => `${a.itemDescription} (${a.quantity} ${a.unit || 'U'})`).join(', ')}`);
      }
      if (removed.length > 0) {
        itemDiffs.push(`- Suppression de ${removed.length} article(s): ${removed.map(r => `${r.ItemDescription}`).join(', ')}`);
      }
      if (modified.length > 0) {
        itemDiffs.push(`✏️ Modification de ${modified.length} article(s): ${modified.map(m => {
          const match = oldItems.find(o => (o.ItemDescription || '').trim().toLowerCase() === (m.itemDescription || '').trim().toLowerCase());
          return `${m.itemDescription} [Qté: ${match?.Quantity || 0} ➔ ${m.quantity}, Unité: ${match?.Unit || 'U'} ➔ ${m.unit || 'U'}]`;
        }).join(', ')}`);
      }

      if (itemDiffs.length > 0) {
        diffList.push(`Articles:\n  • ` + itemDiffs.join('\n  • '));
      }
    }

    await transaction.request()
      .input('RequestID', sql.Int, id)
      .input('RequestNumber', sql.NVarChar(60), finalReqNumber)
      .input('Type', sql.NVarChar(20), type || 'Local')
      .input('Department', sql.NVarChar(100), department || currentReq.Department || 'Achat')
      .input('Title', sql.NVarChar(200), title || 'Sans titre')
      .input('RequestDate', sql.NVarChar(100), dateVal || null)
      .input('Description', sql.NVarChar(sql.MAX), description || '')
      .input('CurrentStatus', sql.NVarChar(100), targetStatus)
      .input('RequiredByDate', sql.NVarChar(100), requiredByDate || null)
      .query(`
        UPDATE dbo.PurchaseRequests
        SET RequestNumber = @RequestNumber,
            Type = @Type,
            Department = @Department,
            Title = @Title,
            RequestDate = ISNULL(@RequestDate, RequestDate),
            Description = @Description,
            CurrentStatus = @CurrentStatus,
            RequiredByDate = @RequiredByDate,
            UpdatedAt = SYSDATETIME()
        WHERE RequestID = @RequestID
      `);

    if (items && Array.isArray(items)) {
      await transaction.request()
        .input('RequestID', sql.Int, id)
        .query(`DELETE FROM dbo.RequestItems WHERE RequestID = @RequestID`);

      for (const item of items) {
        if (item.itemDescription && item.itemDescription.trim()) {
          await transaction.request()
            .input('RequestID', sql.Int, id)
            .input('ItemDescription', sql.NVarChar(255), item.itemDescription.trim())
            .input('Quantity', sql.Int, parseInt(item.quantity) || 1)
            .input('Unit', sql.NVarChar(50), item.unit ? item.unit.trim() : 'U')
            .input('Observation', sql.NVarChar(sql.MAX), item.observation || '')
            .query(`
              INSERT INTO dbo.RequestItems (RequestID, ItemDescription, Quantity, Unit, Observation)
              VALUES (@RequestID, @ItemDescription, @Quantity, @Unit, @Observation);
            `);
        }
      }
    }

    // Detailed Log Comment for StatusHistory
    let auditComment = '';
    if (diffList.length > 0) {
      if (prevStatus === 'Brouillon' && targetStatus !== 'Brouillon') {
        auditComment = `🚀 Soumission de la demande après modifications :\n• ` + diffList.join('\n• ');
      } else {
        auditComment = `✏️ Demande modifiée par le demandeur :\n• ` + diffList.join('\n• ');
      }
    } else {
      if (prevStatus === 'Brouillon' && targetStatus !== 'Brouillon') {
        auditComment = `🚀 Soumission de la demande d'achat (${targetStatus})`;
      } else {
        auditComment = `Demande modifiée et réenregistrée`;
      }
    }

    await transaction.request()
      .input('RequestID', sql.Int, id)
      .input('PreviousStatus', sql.NVarChar(100), prevStatus)
      .input('NewStatus', sql.NVarChar(100), targetStatus)
      .input('ChangedByID', sql.Int, userId)
      .input('Comments', sql.NVarChar(sql.MAX), auditComment)
      .query(`
        INSERT INTO dbo.StatusHistory (RequestID, PreviousStatus, NewStatus, ChangedByID, Comments)
        VALUES (@RequestID, @PreviousStatus, @NewStatus, @ChangedByID, @Comments);
      `);

    await transaction.commit();

    // If a draft was submitted, trigger email notification
    if (prevStatus === 'Brouillon' && targetStatus !== 'Brouillon') {
      emailService.sendNewRequestNotification({
        requestNumber: finalReqNumber,
        title: title || currentReq.Title,
        type: type || currentReq.Type,
        department: department || currentReq.Department,
        requesterName: currentReq.RequesterName || 'Demandeur',
        requestDate: dateVal || currentReq.RequestDate,
        requiredByDate: requiredByDate !== undefined ? requiredByDate : currentReq.RequiredByDate,
        description: description !== undefined ? description : currentReq.Description
      }, items || oldItems).catch(err => console.error('Error in async email notification:', err));
    }

    res.json({ message: 'Demande mise à jour avec succès', requestId: id, status: targetStatus, requestNumber: finalReqNumber });

  } catch (error) {
    try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
    console.error('Error updating request:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Échec de la mise à jour de la demande' });
  }
};

// Delete / Remove Purchase Request Permanently (DELETE /api/requests/:id)
const deleteRequest = async (req, res) => {
  const { id } = req.params;

  const transaction = new sql.Transaction(await getPool());

  try {
    await transaction.begin();

    const reqRes = await transaction.request()
      .input('RequestID', sql.Int, id)
      .query(`SELECT RequestID, RequestNumber, RequesterID FROM dbo.PurchaseRequests WHERE RequestID = @RequestID`);

    if (reqRes.recordset.length === 0) {
      try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const reqData = reqRes.recordset[0];
    const currentUserId = req.user ? req.user.userId : null;
    const currentUserRole = req.user ? req.user.role : null;

    if (currentUserRole !== 'Admin' && reqData.RequesterID !== currentUserId) {
      try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer la demande d\'un autre utilisateur.' });
    }

    // 1. Find and delete physical attachment files from server disk
    const attsRes = await transaction.request()
      .input('RequestID', sql.Int, id)
      .query(`SELECT FilePath FROM dbo.Attachments WHERE RequestID = @RequestID`);

    for (const att of attsRes.recordset) {
      if (att.FilePath) {
        const fullPath = path.resolve(__dirname, '..', att.FilePath.replace(/\\/g, '/'));
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch (e) { console.error('Failed to delete attachment file from disk:', e); }
        }
      }
    }

    // 2. Permanently delete from all SQL tables in a single atomic query batch
    await transaction.request()
      .input('RequestID', sql.Int, id)
      .query(`
        DELETE FROM dbo.RequestItems WHERE RequestID = @RequestID;
        DELETE FROM dbo.Attachments WHERE RequestID = @RequestID;
        DELETE FROM dbo.StatusHistory WHERE RequestID = @RequestID;
        DELETE FROM dbo.PurchaseRequests WHERE RequestID = @RequestID;
      `);

    await transaction.commit();
    return res.json({ message: 'Demande supprimée définitivement', requestId: id });

  } catch (error) {
    try { await transaction.rollback(); } catch (e) { console.warn('Rollback skipped:', e.code); }
    console.error('Error deleting request permanently:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Échec de la suppression définitive de la demande' });
  }
};

module.exports = {
  getDashboardMetrics,
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
  updateStatus,
  updateItemStatus
};
