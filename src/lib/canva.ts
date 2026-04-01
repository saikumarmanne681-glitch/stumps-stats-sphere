import { CanvaCertificateJob, CertificateRecord } from './v2types';
import { generateId } from './utils';
import { istNow, v2api } from './v2api';

function buildMockCanvaExportUrl(jobId: string) {
  return `https://www.canva.com/design/${jobId}/download`;
}

export async function queueCanvaCertificateRender(certificate: CertificateRecord, requestedBy = 'admin') {
  const job: CanvaCertificateJob = {
    job_id: generateId('CANVAJOB'),
    certificate_id: certificate.certificate_id,
    template_id: certificate.canva_template_id || 'unset-template',
    recipient_name: certificate.recipient_name,
    payload_json: JSON.stringify({
      certificate_id: certificate.certificate_id,
      title: certificate.title,
      recipient_name: certificate.recipient_name,
      metadata_json: certificate.metadata_json,
      verification_url: certificate.verification_url,
      verification_token: certificate.verification_token,
      generated_at: certificate.generated_at,
    }),
    status: 'queued',
    export_url: '',
    error: '',
    requested_by: requestedBy,
    requested_at: istNow(),
    completed_at: '',
  };

  await v2api.addCanvaCertificateJob(job);
  return job;
}

export async function pollCanvaCertificateRender(jobId: string) {
  const jobs = await v2api.getCanvaCertificateJobs();
  const current = jobs.find((job) => job.job_id === jobId);
  if (!current) return null;

  if (current.status === 'queued') {
    const completed: CanvaCertificateJob = {
      ...current,
      status: 'completed',
      export_url: buildMockCanvaExportUrl(jobId),
      error: '',
      completed_at: istNow(),
    };
    await v2api.updateCanvaCertificateJob(completed);
    return completed;
  }

  return current;
}
