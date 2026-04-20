import { Controller, Param, Sse, UseGuards, Query, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JobsService, JobEvent } from './jobs.service';
import { JwtService } from '@nestjs/jwt';

/**
 * Server-Sent Events stream for long-running jobs.
 * The global ResponseInterceptor wraps each emission as { data, message },
 * which is exactly the MessageEvent shape Nest's @Sse expects — so we return
 * the raw JobEvent and let the interceptor do the wrapping.
 */
@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService, private jwt: JwtService) {}

  @Sse(':jobId/stream')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Stream progress events for a job (SSE, Bearer auth)' })
  stream(@Param('jobId') jobId: string): Observable<JobEvent> {
    return this.jobs.getStream(jobId);
  }

  /**
   * SSE with token in query string — for EventSource which cannot set headers.
   */
  @Sse(':jobId/stream-by-token')
  @ApiOperation({ summary: 'Stream via EventSource using ?token=<jwt> query param' })
  streamByToken(
    @Param('jobId') jobId: string,
    @Query('token') token: string,
  ): Observable<JobEvent> {
    try {
      this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Token invalido o expirado');
    }
    return this.jobs.getStream(jobId);
  }
}
