import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeetMeasurementDTO, MeasurementDTO } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class MeasurementService {
  private readonly base = `${API_BASE_URL}/measurements`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<MeasurementDTO[]> {
    return this.http.get<MeasurementDTO[]>(this.base);
  }

  getById(id: number): Observable<MeasurementDTO> {
    return this.http.get<MeasurementDTO>(`${this.base}/${id}`);
  }

  createFeetMeasurement(userId: string, measurement: FeetMeasurementDTO): Observable<FeetMeasurementDTO> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post<FeetMeasurementDTO>(`${this.base}/feet`, measurement, { params });
  }

  update(id: number, measurement: FeetMeasurementDTO): Observable<MeasurementDTO> {
    return this.http.put<MeasurementDTO>(`${this.base}/${id}`, measurement);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
