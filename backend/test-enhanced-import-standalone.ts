// Standalone test for enhanced import functionality using tsx
import { enhancedFileProcessorService } from './src/services/enhancedFileProcessorService';
import fs from 'fs';
import path from 'path';

async function testEnhancedImport() {
  console.log('🧪 Testing Enhanced Import Functionality...\n');

  // Create test CSV file with some errors - include sensor serial in filename for matching
  const testCSVContent = `Sensor_ID,Temperatura,Umidade,Data_Hora,Localizacao
S001,25.5,60.2,2024-01-15 10:00:00,Sala A
S002,invalid_temp,55.1,2024-01-15 10:15:00,Sala B
S003,22.8,invalid_humidity,2024-01-15 10:30:00,Sala C
S004,26.1,58.9,invalid_date,Sala D
S005,24.7,61.3,2024-01-15 11:00:00,Sala E`;

  const testFilePath = './test-import.csv';
  fs.writeFileSync(testFilePath, testCSVContent);

  try {
    console.log('📁 Processing test CSV file...');
    
    // Create a mock Multer file object with sensor serial in filename for matching
    const mockFile = {
      fieldname: 'file',
      originalname: 'data_S001_20240115.csv',
      encoding: 'utf-8',
      mimetype: 'text/csv',
      destination: './',
      filename: 'data_S001_20240115.csv',
      path: testFilePath,
      size: testCSVContent.length,
      buffer: Buffer.from(testCSVContent)
    };

    // Create a mock suitcase object with sensors
    const mockSuitcase = {
      id: 'test-suitcase-123',
      userId: 'test-user-123',
      name: 'Test Suitcase',
      sensors: [
        {
          id: 'sensor-001',
          sensor: {
            id: 'sensor-001',
            serialNumber: 'S001',
            name: 'Test Sensor 1'
          }
        }
      ]
    };
    
    const result = await enhancedFileProcessorService.processFileWithRobustService(
      mockFile as any,
      mockSuitcase as any
    );

    console.log('✅ Processing completed!');
    console.log('📊 Results:');
    console.log(`  - Total rows: ${result.totalRows}`);
    console.log(`  - Valid rows: ${result.validRows}`);
    console.log(`  - Invalid rows: ${result.invalidRows}`);
    console.log(`  - Status: ${result.status}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors found:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. Row ${error.row}: ${error.message}`);
        console.log(`     Data: ${JSON.stringify(error.data)}`);
      });
    }

    if (result.validationResults && result.validationResults.length > 0) {
      console.log('\n🔍 Validation Results:');
      result.validationResults.forEach((validation, index) => {
        console.log(`  Row ${validation.rowNumber}: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
        if (!validation.isValid && validation.errors) {
          validation.errors.forEach(error => {
            console.log(`    - ${error.field}: ${error.message}`);
          });
        }
      });
    }

    // Test progress tracking (skip if Redis is not available)
    console.log('\n📈 Testing progress tracking...');
    try {
      const progress = await enhancedFileProcessorService.getJobProgress('test-job-123');
      console.log('Progress:', progress);
    } catch (progressError) {
      console.log('⚠️  Progress tracking not available (Redis may not be connected):', progressError.message);
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('\n🧹 Test file cleaned up');
    }
  }
}

// Run the test
testEnhancedImport().catch(console.error);