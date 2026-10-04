const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getPool, sql } = require('../config/db');

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '../uploads');
const signedDocsDir = path.join(uploadBaseDir, 'signed-docs');
const samplesDir = path.join(uploadBaseDir, 'samples');

if (!fs.existsSync(uploadBaseDir)) fs.mkdirSync(uploadBaseDir, { recursive: true });
if (!fs.existsSync(signedDocsDir)) fs.mkdirSync(signedDocsDir, { recursive: true });
if (!fs.existsSync(samplesDir)) fs.mkdirSync(samplesDir, { recursive: true });

// Storage Strategy Implementation:
// Local File Storage with unique naming (UUID/Timestamp) + SQL Server Metadata Registry
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine attachment type from fieldname or body
    const attachmentType = req.body.attachmentType || file.fieldname;
    if (attachmentType === 'SignedDocument' || file.fieldname === 'signedDocument') {
      cb(null, signedDocsDir);
    } else {
      cb(null, samplesDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Allowed formats: PDF, JPG, PNG, WEBP, DOCX, XLSX'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB file size limit
  fileFilter: fileFilter
});

// Dual Upload Middleware config
const uploadDualMiddleware = upload.fields([
  { name: 'signedDocument', maxCount: 1 },
  { name: 'referenceSamples', maxCount: 10 }
]);

// Upload Controller Handler
const handleFileUpload = async (req, res) => {
  const requestId = req.params.requestId || req.body.requestId;
  const userId = req.user ? req.user.userId : 1;

  if (!requestId) {
    return res.status(400).json({ error: 'RequestID is required to attach files' });
  }

  try {
    const pool = await getPool();
    const uploadedAttachments = [];

    // Process Physically Signed/Scanned Document
    if (req.files && req.files.signedDocument) {
      const file = req.files.signedDocument[0];
      const relPath = path.relative(path.join(__dirname, '..'), file.path).replace(/\\/g, '/');

      const result = await pool.request()
        .input('RequestID', sql.Int, requestId)
        .input('AttachmentType', sql.NVarChar(30), 'SignedDocument')
        .input('OriginalFileName', sql.NVarChar(255), file.originalname)
        .input('StoredFileName', sql.NVarChar(255), file.filename)
        .input('FilePath', sql.NVarChar(500), relPath)
        .input('MimeType', sql.NVarChar(100), file.mimetype)
        .input('FileSize', sql.BigInt, file.size)
        .input('UploadedByID', sql.Int, userId)
        .query(`
          INSERT INTO dbo.Attachments 
          (RequestID, AttachmentType, OriginalFileName, StoredFileName, FilePath, MimeType, FileSize, UploadedByID)
          OUTPUT INSERTED.AttachmentID
          VALUES 
          (@RequestID, @AttachmentType, @OriginalFileName, @StoredFileName, @FilePath, @MimeType, @FileSize, @UploadedByID);

          UPDATE dbo.PurchaseRequests SET HasSignedDoc = 1 WHERE RequestID = @RequestID;
        `);

      uploadedAttachments.push({
        attachmentId: result.recordset[0].AttachmentID,
        attachmentType: 'SignedDocument',
        fileName: file.originalname,
        filePath: relPath
      });
    }

    // Process Reference Pictures, Samples, Specifications
    if (req.files && req.files.referenceSamples) {
      for (const file of req.files.referenceSamples) {
        const relPath = path.relative(path.join(__dirname, '..'), file.path).replace(/\\/g, '/');

        const result = await pool.request()
          .input('RequestID', sql.Int, requestId)
          .input('AttachmentType', sql.NVarChar(30), 'ReferenceSample')
          .input('OriginalFileName', sql.NVarChar(255), file.originalname)
          .input('StoredFileName', sql.NVarChar(255), file.filename)
          .input('FilePath', sql.NVarChar(500), relPath)
          .input('MimeType', sql.NVarChar(100), file.mimetype)
          .input('FileSize', sql.BigInt, file.size)
          .input('UploadedByID', sql.Int, userId)
          .query(`
            INSERT INTO dbo.Attachments 
            (RequestID, AttachmentType, OriginalFileName, StoredFileName, FilePath, MimeType, FileSize, UploadedByID)
            OUTPUT INSERTED.AttachmentID
            VALUES 
            (@RequestID, @AttachmentType, @OriginalFileName, @StoredFileName, @FilePath, @MimeType, @FileSize, @UploadedByID);
          `);

        uploadedAttachments.push({
          attachmentId: result.recordset[0].AttachmentID,
          attachmentType: 'ReferenceSample',
          fileName: file.originalname,
          filePath: relPath
        });
      }
    }

    res.status(201).json({
      message: 'Files uploaded and attached successfully',
      attachments: uploadedAttachments
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to process file attachment upload' });
  }
};

// Download / View Attachment Handler (GET /api/attachments/:id/download)
const downloadAttachment = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('AttachmentID', sql.Int, id)
      .query(`SELECT * FROM dbo.Attachments WHERE AttachmentID = @AttachmentID`);

    if (result.recordset.length === 0) {
      return res.status(404).send('Pièce jointe introuvable');
    }

    const att = result.recordset[0];
    const cleanPath = att.FilePath ? att.FilePath.replace(/\\/g, '/') : '';
    const absolutePath = path.resolve(__dirname, '..', cleanPath);

    if (!fs.existsSync(absolutePath)) {
      console.error(`File not found on server disk: ${absolutePath}`);
      return res.status(404).send(`Le fichier n'existe plus sur le serveur (${att.OriginalFileName})`);
    }

    const mime = att.MimeType || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(att.OriginalFileName)}"`);
    return res.sendFile(absolutePath);

  } catch (err) {
    console.error('Error downloading attachment:', err);
    res.status(500).send('Échec du téléchargement de la pièce jointe');
  }
};

module.exports = {
  uploadDualMiddleware,
  handleFileUpload,
  downloadAttachment
};
