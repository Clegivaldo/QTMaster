import { enhancedFileProcessorService } from './dist/services/enhancedFileProcessorService.js';
import fs from 'fs';

const file = {
  originalname: 'Elitech RC-4HC.xls',
  buffer: fs.readFileSync('/app/uploads/Elitech RC-4HC.xls'),
  size: fs.statSync('/app/uploads/Elitech RC-4HC.xls').size,
  mimetype: 'application/vnd.ms-excel'
};

const suitcaseId = 'cmi92afb00005o90zurjlw0bs';
const userId = '0831d800-bf72-4c2b-b67f-012608fe100a';

console.log('Starting file processing test...');
console.log('File:', file.originalname, file.size, 'bytes');

enhancedFileProcessorService.processFiles([file], suitcaseId, userId)
  .then(jobId => {
    console.log('✓ Job created:', jobId);
    
    // Wait and check status
    setTimeout(async () => {
      const status = await enhancedFileProcessorService.getJobStatus(jobId);
      console.log('\nJob Status:', JSON.stringify(status, null, 2));
      
      // Check database
      const { prisma } = await import('./dist/lib/prisma.js');
      const count = await prisma.sensorData.count();
      console.log('\nSensor data records:', count);
      
      if (count > 0) {
        const sample = await prisma.sensorData.findMany({ take: 3 });
        console.log('\nSample records:', JSON.stringify(sample, null, 2));
      }
      
      process.exit(0);
    }, 25000);
  })
  .catch(e => {
    console.error('✗ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  });
