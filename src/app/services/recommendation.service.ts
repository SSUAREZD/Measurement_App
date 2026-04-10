import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SizeDTO, RecommendationResult } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly base = `${API_BASE_URL}/recommendations`;

  constructor(private http: HttpClient) {}

  /**
   * Returns a RecommendationResult with a typed status:
   *  - FITS    → valid SizeDTO
   *  - NO_FIT  → SizeDTO { id: "-1", denomination: "-1" }
   *  - NO_INFO → 204 No Content (null body)
   */
  recommend(userId: string, productId: string): Observable<RecommendationResult> {
    return this.http
      .get<SizeDTO | null>(`${this.base}/user/${userId}/product/${productId}`, {
        observe: 'response',
      })
      .pipe(
        map(response => {
          if (response.status === 204 || response.body === null) {
            return { size: null, status: 'NO_INFO' as const };
          }
          const size = response.body!;
          if (size.id === '-1') {
            return { size, status: 'NO_FIT' as const };
          }
          return { size, status: 'FITS' as const };
        })
      );
  }
}
