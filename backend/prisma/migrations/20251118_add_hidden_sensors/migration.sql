-- Adicionar campo para sensores ocultos na validação
ALTER TABLE "validations" ADD COLUMN "hiddenSensorIds" TEXT[] DEFAULT '{}';

-- Índice para melhorar performance de busca
CREATE INDEX "idx_validation_hidden_sensors" ON "validations" USING GIN ("hiddenSensorIds");