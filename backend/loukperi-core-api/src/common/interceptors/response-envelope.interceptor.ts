import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

type PaginatedPayload = {
  items: unknown[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.id ?? 'local-request';

    return next.handle().pipe(
      map((payload: unknown) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'items' in payload &&
          'pagination' in payload
        ) {
          const paginated = payload as PaginatedPayload;
          return {
            data: paginated.items,
            pagination: paginated.pagination,
            meta: { request_id: requestId },
          };
        }

        return {
          data: payload,
          meta: { request_id: requestId },
        };
      }),
    );
  }
}
