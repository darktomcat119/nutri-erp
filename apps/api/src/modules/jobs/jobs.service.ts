import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ReplaySubject, Observable } from 'rxjs';
import { randomUUID } from 'crypto';

export type JobEvent =
  | { type: 'stage'; stage: string; message?: string; current?: number; total?: number }
  | { type: 'progress'; current: number; total: number; message?: string }
  | { type: 'done'; result: unknown; message?: string }
  | { type: 'error'; message: string };

interface JobState {
  id: string;
  name: string;
  subject: ReplaySubject<JobEvent>;
  createdAt: number;
  finished: boolean;
  lastEvent?: JobEvent;
}

const JOB_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private jobs = new Map<string, JobState>();

  constructor() {
    // Periodic cleanup of finished or stale jobs
    setInterval(() => this.sweep(), 60 * 1000).unref();
  }

  startJob(name: string): string {
    const id = randomUUID();
    this.jobs.set(id, {
      id,
      name,
      // Infinite buffer so late subscribers (EventSource typically connects a few ms after POST returns)
      // get the full event history from the start.
      subject: new ReplaySubject<JobEvent>(Infinity),
      createdAt: Date.now(),
      finished: false,
    });
    this.logger.log(`Job started: ${name} (${id})`);
    return id;
  }

  emit(jobId: string, event: JobEvent): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      this.logger.warn(`emit to unknown job ${jobId}`);
      return;
    }
    job.lastEvent = event;
    job.subject.next(event);
    if (event.type === 'done' || event.type === 'error') {
      job.finished = true;
      // Let subscribers receive the final event, then complete shortly
      setTimeout(() => {
        job.subject.complete();
      }, 100);
    }
  }

  getStream(jobId: string): Observable<JobEvent> {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job no encontrado o expirado');
    return job.subject.asObservable();
  }

  getLastEvent(jobId: string): JobEvent | undefined {
    return this.jobs.get(jobId)?.lastEvent;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      const age = now - job.createdAt;
      if (job.finished && age > 30_000) {
        this.jobs.delete(id);
      } else if (age > JOB_TTL_MS) {
        // Stale: force-close
        try {
          job.subject.error(new Error('Job timed out'));
        } catch { /* already closed */ }
        this.jobs.delete(id);
      }
    }
  }
}
