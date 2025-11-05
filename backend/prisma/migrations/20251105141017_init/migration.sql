-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "metadata" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_cnpj_idx" ON "clients"("cnpj");

-- CreateIndex
CREATE INDEX "clients_createdAt_idx" ON "clients"("createdAt");

-- CreateIndex
CREATE INDEX "reports_clientId_idx" ON "reports"("clientId");

-- CreateIndex
CREATE INDEX "reports_userId_idx" ON "reports"("userId");

-- CreateIndex
CREATE INDEX "reports_validationId_idx" ON "reports"("validationId");

-- CreateIndex
CREATE INDEX "reports_templateId_idx" ON "reports"("templateId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- CreateIndex
CREATE INDEX "reports_clientId_status_idx" ON "reports"("clientId", "status");

-- CreateIndex
CREATE INDEX "reports_userId_createdAt_idx" ON "reports"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "sensor_data_sensorId_idx" ON "sensor_data"("sensorId");

-- CreateIndex
CREATE INDEX "sensor_data_timestamp_idx" ON "sensor_data"("timestamp");

-- CreateIndex
CREATE INDEX "sensor_data_validationId_idx" ON "sensor_data"("validationId");

-- CreateIndex
CREATE INDEX "sensor_data_fileName_idx" ON "sensor_data"("fileName");

-- CreateIndex
CREATE INDEX "sensor_data_sensorId_timestamp_idx" ON "sensor_data"("sensorId", "timestamp");

-- CreateIndex
CREATE INDEX "sensor_data_validationId_timestamp_idx" ON "sensor_data"("validationId", "timestamp");

-- CreateIndex
CREATE INDEX "sensors_typeId_idx" ON "sensors"("typeId");

-- CreateIndex
CREATE INDEX "sensors_serialNumber_idx" ON "sensors"("serialNumber");

-- CreateIndex
CREATE INDEX "sensors_model_idx" ON "sensors"("model");

-- CreateIndex
CREATE INDEX "sensors_createdAt_idx" ON "sensors"("createdAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "validations_clientId_idx" ON "validations"("clientId");

-- CreateIndex
CREATE INDEX "validations_userId_idx" ON "validations"("userId");

-- CreateIndex
CREATE INDEX "validations_suitcaseId_idx" ON "validations"("suitcaseId");

-- CreateIndex
CREATE INDEX "validations_isApproved_idx" ON "validations"("isApproved");

-- CreateIndex
CREATE INDEX "validations_createdAt_idx" ON "validations"("createdAt");

-- CreateIndex
CREATE INDEX "validations_clientId_createdAt_idx" ON "validations"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "validations_userId_createdAt_idx" ON "validations"("userId", "createdAt");
