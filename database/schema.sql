-- ====================================================================
-- Demande Achat (Purchase Request) System - SQL Server (T-SQL) Schema
-- Target Audience: Purchasing (Achat) Team & Requesters
-- Authentication: Username + Simple Plain Text Password '1010'
-- Workflow Statuses in French: Brouillon, En Attente, En Cours, Commandée, Finalisée, Annulée
-- ====================================================================

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

-- Drop tables in reverse foreign key order
IF OBJECT_ID('dbo.StatusHistory', 'U') IS NOT NULL DROP TABLE dbo.StatusHistory;
IF OBJECT_ID('dbo.Attachments', 'U') IS NOT NULL DROP TABLE dbo.Attachments;
IF OBJECT_ID('dbo.RequestItems', 'U') IS NOT NULL DROP TABLE dbo.RequestItems;
IF OBJECT_ID('dbo.PurchaseRequests', 'U') IS NOT NULL DROP TABLE dbo.PurchaseRequests;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- 1. Users Table (Username + Simple Password '1010')
CREATE TABLE dbo.Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Password NVARCHAR(100) NOT NULL, -- Plain text password
    Department NVARCHAR(100) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'Acheteur',
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- 2. PurchaseRequests Table (French Status Names)
CREATE TABLE dbo.PurchaseRequests (
    RequestID INT IDENTITY(1,1) PRIMARY KEY,
    RequestNumber NVARCHAR(60) NOT NULL UNIQUE, -- e.g. N°1231/SENSUS/DP/2026
    Type NVARCHAR(20) NOT NULL DEFAULT 'Local'
        CONSTRAINT CHK_PR_Type CHECK (Type IN ('Local', 'Etranger')),
    RequestDate DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    RequesterID INT NOT NULL,
    Department NVARCHAR(100) NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    CurrentStatus NVARCHAR(30) NOT NULL DEFAULT N'En Attente' 
        CONSTRAINT CHK_PR_Status CHECK (CurrentStatus IN (N'Brouillon', N'En Attente', N'En Cours', N'Commandée', N'Finalisée', N'Annulée')),
    RequiredByDate DATE NULL,
    HasSignedDoc BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_PurchaseRequests_Users FOREIGN KEY (RequesterID) REFERENCES dbo.Users(UserID)
);
GO

CREATE NONCLUSTERED INDEX IX_PurchaseRequests_Status ON dbo.PurchaseRequests(CurrentStatus);
CREATE NONCLUSTERED INDEX IX_PurchaseRequests_Number ON dbo.PurchaseRequests(RequestNumber);
CREATE NONCLUSTERED INDEX IX_PurchaseRequests_Type ON dbo.PurchaseRequests(Type);
GO

-- 3. RequestItems Table (Désignation, Quantité, Observation)
CREATE TABLE dbo.RequestItems (
    ItemID INT IDENTITY(1,1) PRIMARY KEY,
    RequestID INT NOT NULL,
    ItemDescription NVARCHAR(255) NOT NULL, -- Désignation
    Quantity INT NOT NULL DEFAULT 1 CONSTRAINT CHK_Item_Qty CHECK (Quantity > 0), -- Quantité
    Observation NVARCHAR(MAX) NULL, -- Observation / Remarques
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_RequestItems_PurchaseRequests FOREIGN KEY (RequestID) REFERENCES dbo.PurchaseRequests(RequestID) ON DELETE CASCADE
);
GO

-- 4. Attachments Table
CREATE TABLE dbo.Attachments (
    AttachmentID INT IDENTITY(1,1) PRIMARY KEY,
    RequestID INT NOT NULL,
    AttachmentType NVARCHAR(30) NOT NULL 
        CONSTRAINT CHK_Attachment_Type CHECK (AttachmentType IN ('SignedDocument', 'ReferenceSample')),
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

-- 5. StatusHistory Table (Audit Log in French)
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

-- Seed Demo Users (Password: 1010)
INSERT INTO dbo.Users (FullName, Username, Password, Department, Role)
VALUES 
(N'Achraf Benali', N'achraf', N'1010', N'Achat', N'Acheteur'),
(N'Fatima Zohra', N'fatima', N'1010', N'Logistique', N'Demandeur');
GO

-- Seed Demo Purchase Requests
INSERT INTO dbo.PurchaseRequests (RequestNumber, Type, RequestDate, RequesterID, Department, Title, Description, CurrentStatus, RequiredByDate, HasSignedDoc)
VALUES 
(N'N°1231/SENSUS/DP/2026', N'Local', '2026-08-10', 1, N'Achat', N'Fournitures de Bureau & Équipements IT', N'Demande de réapprovisionnement pour la direction générale', N'En Attente', '2026-08-30', 1),
(N'N°1232/SENSUS/DP/2026', N'Etranger', '2026-08-10', 2, N'Logistique', N'Outillage Spécifique Importation', N'Pièces de rechange sous garantie constructeur', N'En Cours', '2026-08-25', 0);
GO

INSERT INTO dbo.RequestItems (RequestID, ItemDescription, Quantity, Observation)
VALUES 
(1, N'Écran Dell UltraSharp 27" 4K', 5, N'Livré avec câbles DisplayPort et HDMI'),
(1, N'Clavier et Souris Sans Fil Logitech', 5, N'Couleur noire, norme AZERTY'),
(2, N'Batterie Chariot Élévateur 24V 500Ah', 2, N'Référence usine n° CT-99082');
GO

INSERT INTO dbo.StatusHistory (RequestID, PreviousStatus, NewStatus, ChangedByID, Comments)
VALUES 
(1, N'Brouillon', N'En Attente', 1, N'Création et soumission initiale de la demande'),
(2, N'Brouillon', N'En Attente', 2, N'Soumission par le service Logistique'),
(2, N'En Attente', N'En Cours', 1, N'Prise en charge par l''équipe Achat pour consultation');
GO
