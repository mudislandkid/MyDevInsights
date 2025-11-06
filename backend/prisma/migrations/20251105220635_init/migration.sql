-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DISCOVERED', 'QUEUED', 'ANALYZING', 'ANALYZED', 'ERROR', 'ARCHIVED');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "framework" TEXT,
    "language" TEXT,
    "packageManager" TEXT,
    "fileCount" INTEGER,
    "linesOfCode" INTEGER,
    "lastModified" TIMESTAMP(3),
    "size" BIGINT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DISCOVERED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analyzedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_analyses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "techStack" JSONB NOT NULL DEFAULT '{}',
    "complexity" TEXT,
    "recommendations" JSONB DEFAULT '[]',
    "completionScore" INTEGER,
    "maturityLevel" TEXT,
    "productionGaps" JSONB DEFAULT '[]',
    "estimatedValue" JSONB,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProjectToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_path_key" ON "projects"("path");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_discoveredAt_idx" ON "projects"("discoveredAt");

-- CreateIndex
CREATE INDEX "projects_status_discoveredAt_idx" ON "projects"("status", "discoveredAt");

-- CreateIndex
CREATE INDEX "projects_framework_idx" ON "projects"("framework");

-- CreateIndex
CREATE INDEX "projects_language_idx" ON "projects"("language");

-- CreateIndex
CREATE INDEX "project_analyses_projectId_idx" ON "project_analyses"("projectId");

-- CreateIndex
CREATE INDEX "project_analyses_createdAt_idx" ON "project_analyses"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectToTag_AB_unique" ON "_ProjectToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectToTag_B_index" ON "_ProjectToTag"("B");

-- AddForeignKey
ALTER TABLE "project_analyses" ADD CONSTRAINT "project_analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToTag" ADD CONSTRAINT "_ProjectToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToTag" ADD CONSTRAINT "_ProjectToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
