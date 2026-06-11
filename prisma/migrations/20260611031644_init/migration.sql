-- CreateTable
CREATE TABLE "Keyword" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyword" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UploadBatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OactRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "econumber" TEXT NOT NULL,
    "requestorItcode" TEXT,
    "requestorName" TEXT,
    "requestorEmail" TEXT,
    "requestorJobTitle" TEXT,
    "requestorDepartment" TEXT,
    "courtesyType" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "proposedBy" TEXT,
    "proposerName" TEXT,
    "proposerTitle" TEXT,
    "feePerPerson" REAL,
    "officialCount" INTEGER NOT NULL DEFAULT 0,
    "appliedAmount" REAL NOT NULL DEFAULT 0,
    "itemizedDesc" TEXT,
    "purpose" TEXT,
    "status" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "uploadBatchId" INTEGER,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OactOfficial" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "oactRecordId" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT,
    "entity" TEXT,
    "title" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "matchedKeywords" TEXT,
    CONSTRAINT "OactOfficial_oactRecordId_fkey" FOREIGN KEY ("oactRecordId") REFERENCES "OactRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConcurRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ecoApprovalNumber" TEXT,
    "reportId" TEXT,
    "employee" TEXT,
    "employeeEmail" TEXT,
    "employeeTitle" TEXT,
    "expenseType" TEXT,
    "govOfficial" BOOLEAN NOT NULL DEFAULT false,
    "attendeeName" TEXT,
    "attendeeTitle" TEXT,
    "companyAttendee" TEXT,
    "attendeeApprovedUsd" REAL,
    "approvedUsd" REAL,
    "totalReportUsd" REAL,
    "reimbursementCurrency" TEXT,
    "transactionDate" DATETIME,
    "businessPurpose" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "matchedKeywords" TEXT,
    "uploadBatchId" INTEGER,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Keyword_category_idx" ON "Keyword"("category");

-- CreateIndex
CREATE UNIQUE INDEX "OactRecord_econumber_key" ON "OactRecord"("econumber");

-- CreateIndex
CREATE INDEX "OactRecord_courtesyType_idx" ON "OactRecord"("courtesyType");

-- CreateIndex
CREATE INDEX "OactRecord_isSensitive_idx" ON "OactRecord"("isSensitive");

-- CreateIndex
CREATE INDEX "OactRecord_startDate_idx" ON "OactRecord"("startDate");

-- CreateIndex
CREATE INDEX "OactOfficial_oactRecordId_idx" ON "OactOfficial"("oactRecordId");

-- CreateIndex
CREATE INDEX "ConcurRow_ecoApprovalNumber_idx" ON "ConcurRow"("ecoApprovalNumber");

-- CreateIndex
CREATE INDEX "ConcurRow_reportId_idx" ON "ConcurRow"("reportId");
