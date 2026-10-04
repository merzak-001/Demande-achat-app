import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Database } from 'lucide-react';

export default function SqlModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sqlScript = `-- ====================================================================
-- Demande Achat (Purchase Request) System - SQL Server (T-SQL) Schema
-- Database: DemandeAchatDB
-- Compatible with SQL Server 2012+ / SQLEXPRESS / Azure SQL / Remote Instances
-- ====================================================================

-- 1. Create Database if not exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'DemandeAchatDB')
BEGIN
    CREATE DATABASE DemandeAchatDB;
END
GO

USE DemandeAchatDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 2. Drop tables in reverse foreign key order (Safe Re-run)
IF OBJECT_ID('dbo.StatusHistory', 'U') IS NOT NULL DROP TABLE dbo.StatusHistory;
IF OBJECT_ID('dbo.Attachments', 'U') IS NOT NULL DROP TABLE dbo.Attachments;
IF OBJECT_ID('dbo.RequestItems', 'U') IS NOT NULL DROP TABLE dbo.RequestItems;
IF OBJECT_ID('dbo.PurchaseRequests', 'U') IS NOT NULL DROP TABLE dbo.PurchaseRequests;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- 3. Create Users Table
CREATE TABLE dbo.Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    Password NVARCHAR(100) NOT NULL,
    Department NVARCHAR(100) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'Demandeur',
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 4. Create PurchaseRequests Table
CREATE TABLE dbo.PurchaseRequests (
    RequestID INT IDENTITY(1,1) PRIMARY KEY,
    RequestNumber NVARCHAR(60) NOT NULL UNIQUE,
    Type NVARCHAR(20) NOT NULL DEFAULT 'Local',
    RequestDate DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    RequesterID INT NOT NULL,
    Department NVARCHAR(100) NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Priority NVARCHAR(20) NOT NULL DEFAULT 'Normal',
    CurrentStatus NVARCHAR(30) NOT NULL DEFAULT 'Brouillon',
    RequiredByDate DATE NULL,
    HasSignedDoc BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_PurchaseRequests_Users FOREIGN KEY (RequesterID) REFERENCES dbo.Users(UserID)
);
GO

-- 5. Create RequestItems Table
CREATE TABLE dbo.RequestItems (
    ItemID INT IDENTITY(1,1) PRIMARY KEY,
    RequestID INT NOT NULL,
    ItemDescription NVARCHAR(255) NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    Observation NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_RequestItems_PurchaseRequests FOREIGN KEY (RequestID) REFERENCES dbo.PurchaseRequests(RequestID) ON DELETE CASCADE
);
GO

-- 6. Create Attachments Table
CREATE TABLE dbo.Attachments (
    AttachmentID INT IDENTITY(1,1) PRIMARY KEY,
    RequestID INT NOT NULL,
    AttachmentType NVARCHAR(50) NOT NULL,
    OriginalFileName NVARCHAR(255) NOT NULL,
    StoredFileName NVARCHAR(255) NOT NULL,
    FilePath NVARCHAR(500) NOT NULL,
    MimeType NVARCHAR(100) NOT NULL,
    FileSize BIGINT NOT NULL,
    UploadedByID INT NOT NULL,
    UploadedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Attachments_PurchaseRequests FOREIGN KEY (RequestID) REFERENCES dbo.PurchaseRequests(RequestID) ON DELETE CASCADE,
    CONSTRAINT FK_Attachments_Users FOREIGN KEY (UploadedByID) REFERENCES dbo.Users(UserID)
);
GO

-- 7. Create StatusHistory Table
CREATE TABLE dbo.StatusHistory (
    HistoryID INT IDENTITY(1,1) PRIMARY KEY,
    RequestID INT NOT NULL,
    PreviousStatus NVARCHAR(30) NULL,
    NewStatus NVARCHAR(30) NOT NULL,
    ChangedByID INT NOT NULL,
    Comments NVARCHAR(MAX) NULL,
    ChangedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_StatusHistory_PurchaseRequests FOREIGN KEY (RequestID) REFERENCES dbo.PurchaseRequests(RequestID) ON DELETE CASCADE,
    CONSTRAINT FK_StatusHistory_Users FOREIGN KEY (ChangedByID) REFERENCES dbo.Users(UserID)
);
GO

-- 8. Seed Default System Users (Password: 1010)
IF NOT EXISTS (SELECT * FROM dbo.Users WHERE Username = 'admin')
BEGIN
    INSERT INTO dbo.Users (FullName, Username, Password, Department, Role)
    VALUES (N'Administrateur', N'admin', N'1010', N'Informatique', N'Admin');
END

IF NOT EXISTS (SELECT * FROM dbo.Users WHERE Username = 'acheteur1')
BEGIN
    INSERT INTO dbo.Users (FullName, Username, Password, Department, Role)
    VALUES (N'Acheteur SENSUS', N'acheteur1', N'1010', N'Achats', N'Acheteur');
END

IF NOT EXISTS (SELECT * FROM dbo.Users WHERE Username = 'demandeur1')
BEGIN
    INSERT INTO dbo.Users (FullName, Username, Password, Department, Role)
    VALUES (N'Demandeur SENSUS', N'demandeur1', N'1010', N'Production', N'Demandeur');
END
GO`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-blue-900">
            <Database className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base">Script SQL Server T-SQL (localhost\SQLEXPRESS)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs leading-relaxed border border-slate-800">
          <pre>{sqlScript}</pre>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">Instance: localhost\SQLEXPRESS • Database: DemandeAchatDB</span>
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copié dans le presse-papier !' : 'Copier le Script SQL'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
