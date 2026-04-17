import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If controller already returns { data, message }, don't double-wrap
        if (data && typeof data === 'object' && 'data' in data && 'message' in data) {
          return data as ApiResponse<T>;
        }
        return {
          data,
          message: 'Success',
        };
      }),
    );
  }
}
