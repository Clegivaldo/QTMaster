import { csvProcessingService } from '../src/services/csvProcessingService';

(async () => {
  try {
    console.log('Starting CSV debug runner');
    const options: any = {
      suitcaseId: 'cmi5wyins0003mv0tkui49liy',
      userId: 'cmi4tyky40001ut0895cilog7',
      validateData: false,
      chunkSize: 1000,
      jobId: 'debug_job_12345',
      fileName: 'test-small.csv',
      delimiter: ',',
      encoding: 'utf8',
      hasHeader: true,
      validationId: null,
      forceSensorId: 'cmi5wyifr0002mv0txvv6qrln'
    };

    const result = await csvProcessingService.processCSVFile('/app/test-small.csv', 'test-small.csv', options);
    console.log('CSV processing result:', result);
  } catch (e) {
    console.error('CSV debug runner error:', e);
  }
})();