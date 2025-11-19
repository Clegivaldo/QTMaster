import { enhancedFileProcessorService } from '/app/src/services/enhancedFileProcessorService.ts';

async function main() {
  const filePath = process.argv[2];
  const suitcaseId = process.argv[3] || 'cmi5wyins0003mv0tkui49liy';
  const userId = process.argv[4] || 'cmi4tyky40001ut0895cilog7';

  if (!filePath) {
    console.error('Usage: tsx manual_run_enhanced.ts <path-to-file> [suitcaseId] [userId]');
    process.exit(1);
  }

  const fileObj: any = {
    originalname: filePath.split('/').pop(),
    path: filePath,
  };

  console.log('Starting enhanced processing job for', fileObj.originalname);
  const jobId = await enhancedFileProcessorService.processFiles([fileObj], suitcaseId, userId);
  console.log('Job created:', jobId);

  // Poll job status until complete
  for (let i = 0; i < 60; i++) {
    const status = await enhancedFileProcessorService.getJobStatus(jobId);
    console.log('Job status poll:', status ? status.status : 'not-found');
    if (status && (status.status === 'completed' || status.status === 'failed')) {
      console.log('Job finished:', JSON.stringify(status, null, 2));
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.warn('Job did not finish within timeout, check logs for details');
  process.exit(2);
}

main().catch(err => { console.error(err); process.exit(10); });
