-- CreateTable EditorTemplates
CREATE TABLE "editor_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'default',
    "elements" JSONB NOT NULL,
    "globalStyles" JSONB NOT NULL,
    "pages" JSONB,
    "pageSettings" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editor_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "editor_templates_createdBy_idx" ON "editor_templates"("createdBy");
CREATE INDEX "editor_templates_category_idx" ON "editor_templates"("category");
CREATE INDEX "editor_templates_isPublic_idx" ON "editor_templates"("isPublic");
CREATE INDEX "editor_templates_createdAt_idx" ON "editor_templates"("createdAt");
CREATE INDEX "editor_templates_updatedAt_idx" ON "editor_templates"("updatedAt");
CREATE INDEX "editor_templates_createdBy_isPublic_idx" ON "editor_templates"("createdBy", "isPublic");
CREATE INDEX "editor_templates_category_isPublic_idx" ON "editor_templates"("category", "isPublic");
