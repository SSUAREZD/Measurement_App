import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SizeDTO } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class SizeService {
  private readonly base = `${API_BASE_URL}/sizes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<SizeDTO[]> {
    return this.http.get<SizeDTO[]>(this.base);
  }

  getById(id: string): Observable<SizeDTO> {
    return this.http.get<SizeDTO>(`${this.base}/${id}`);
  }

  create(size: SizeDTO): Observable<SizeDTO> {
    return this.http.post<SizeDTO>(this.base, size);
  }

  update(id: string, size: SizeDTO): Observable<SizeDTO> {
    return this.http.put<SizeDTO>(`${this.base}/${id}`, size);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
