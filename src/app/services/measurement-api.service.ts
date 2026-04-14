import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { AnalyzeFootRequest, AnalyzeFootResponse } from '../models/analyze-foot.model';

@Injectable({ providedIn: 'root' })
export class MeasurementApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/measurements/foot/analyze';

  analyzeFeet(request: AnalyzeFootRequest): Observable<AnalyzeFootResponse> {
    return this.http.post<AnalyzeFootResponse>(this.endpoint, request).pipe(
      catchError((error) => {
        const message =
          error?.error?.message ??
          error?.message ??
          'No fue posible enviar las capturas al backend.';

        return throwError(() => new Error(message));
      }),
    );
  }
}
