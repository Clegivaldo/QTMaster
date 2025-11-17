-- Create equipment tables based on Prisma schema

-- Equipment Item Types
CREATE TABLE "equipment_item_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_item_types_pkey" PRIMARY KEY ("id")
);

-- Equipment Brands
CREATE TABLE "equipment_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_brands_pkey" PRIMARY KEY ("id")
);

-- Equipment Models
CREATE TABLE "equipment_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_models_pkey" PRIMARY KEY ("id")
);

-- Client Equipment
CREATE TABLE "client_equipments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "equipmentTypeId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "assetNumber" TEXT,
    "tag" TEXT,
    "acceptanceMinTemp" DOUBLE PRECISION,
    "acceptanceMaxTemp" DOUBLE PRECISION,
    "acceptanceMinHum" DOUBLE PRECISION,
    "acceptanceMaxHum" DOUBLE PRECISION,
    "acceptanceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_equipments_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX "equipment_brands_name_key" ON "equipment_brands"("name");
CREATE UNIQUE INDEX "equipment_models_brandId_name_key" ON "equipment_models"("brandId", "name");

-- Add indexes
CREATE INDEX "equipment_item_types_name_idx" ON "equipment_item_types"("name");
CREATE INDEX "equipment_item_types_createdAt_idx" ON "equipment_item_types"("createdAt");

CREATE INDEX "equipment_brands_name_idx" ON "equipment_brands"("name");
CREATE INDEX "equipment_brands_createdAt_idx" ON "equipment_brands"("createdAt");

CREATE INDEX "equipment_models_brandId_idx" ON "equipment_models"("brandId");
CREATE INDEX "equipment_models_typeId_idx" ON "equipment_models"("typeId");
CREATE INDEX "equipment_models_name_idx" ON "equipment_models"("name");
CREATE INDEX "equipment_models_createdAt_idx" ON "equipment_models"("createdAt");

CREATE INDEX "client_equipments_clientId_idx" ON "client_equipments"("clientId");
CREATE INDEX "client_equipments_equipmentTypeId_idx" ON "client_equipments"("equipmentTypeId");
CREATE INDEX "client_equipments_brandId_idx" ON "client_equipments"("brandId");
CREATE INDEX "client_equipments_modelId_idx" ON "client_equipments"("modelId");
CREATE INDEX "client_equipments_serialNumber_idx" ON "client_equipments"("serialNumber");
CREATE INDEX "client_equipments_createdAt_idx" ON "client_equipments"("createdAt");

-- Add foreign key constraints
ALTER TABLE "equipment_models" ADD CONSTRAINT "equipment_models_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "equipment_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_models" ADD CONSTRAINT "equipment_models_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "equipment_item_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_equipments" ADD CONSTRAINT "client_equipments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_equipments" ADD CONSTRAINT "client_equipments_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "equipment_item_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_equipments" ADD CONSTRAINT "client_equipments_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "equipment_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_equipments" ADD CONSTRAINT "client_equipments_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "equipment_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;