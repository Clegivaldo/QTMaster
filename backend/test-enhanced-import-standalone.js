// Standalone test for enhanced import functionality
import { enhancedFileProcessorService } from './dist/services/enhancedFileProcessorService.js';
import fs from 'fs';
import path from 'path';

async function testEnhancedImport() {
  console.log('🧪 Testing Enhanced Import Functionality...\n');

  // Create test CSV file with some errors
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
    
    const result = await enhancedFileProcessorService.processFileWithRobustService(
      testFilePath,
      'test-import.csv',
      'text/csv',
      'test-job-123'
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

    // Test progress tracking
    console.log('\n📈 Testing progress tracking...');
    const progress = await enhancedFileProcessorService.getJobProgress('test-job-123');
    console.log('Progress:', progress);

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