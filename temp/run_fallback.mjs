import { pythonFallbackService } from '/app/dist/services/pythonFallbackService.js';

const filePath = '/tmp/uploads/EF7216103439.xls';
const filename = 'EF7216103439.xls';
const options = {
  fileName: filename,
  jobId: `manual_${Date.now()}`,
  chunkSize: 1000,
  validationId: null,
  forceSensorId: 'cmiyxytgu0jc6se4ng0rrrgnj'
};

(async () => {
  try {
    const res = await pythonFallbackService.processLegacyXls(filePath, filename, options);
    console.log(JSON.stringify(res));
  } catch (e) {
    console.error('ERROR', e?.message ?? e);
  }
})();
