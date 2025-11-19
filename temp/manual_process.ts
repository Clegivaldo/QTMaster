import { enhancedFileProcessorService } from '/app/src/services/enhancedFileProcessorService.ts';
import fs from 'fs';

(async () => {
  try {
    const suitcaseId = 'cmi5wyins0003mv0tkui49liy';
    const userId = 'cmi4tyky40001ut0895cilog7';

    // Look for uploaded file in multer's temp directory
    const tmpDir = '/tmp/qt-master-uploads';
    let files: string[] = [];
    try { files = fs.readdirSync(tmpDir); } catch (e) { /* ignore */ }

    if (!files || files.length === 0) {
      try { files = fs.readdirSync('/app/uploads'); } catch (e) { /* ignore */ }
    }

    console.log('Candidate files:', files);
    const target = files.find(f => f.toLowerCase().includes('elitech'));
    if (!target) {
      console.error('No file matching "elitech" found. Place the file in container under /tmp/qt-master-uploads or /app/uploads');
      process.exit(2);
    }

    const filePath = (fs.existsSync(`${tmpDir}/${target}`) ? `${tmpDir}/${target}` : `/app/uploads/${target}`);
    console.log('Found file to process:', filePath);

    const fileObj = { originalname: target, path: filePath } as any;
    const jobId = await enhancedFileProcessorService.processFiles([fileObj], suitcaseId, userId);
    console.log('Created job:', jobId);

    // Poll the in-memory job status for up to 60 seconds
    let job: any = null;
    for (let i = 0; i < 60; i++) {
      job = await enhancedFileProcessorService.getJobStatus(jobId);
      console.log(new Date().toISOString(), 'status=', job?.status, 'results=', job?.results?.length || 0);
      if (job && (job.status === 'completed' || job.status === 'failed')) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('Final job object:', JSON.stringify(job, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Script error:', e && (e as any).stack ? (e as any).stack : e);
    process.exit(1);
  }
})();
