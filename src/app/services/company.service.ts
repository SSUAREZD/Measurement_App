import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyDTO } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly base = `${API_BASE_URL}/companies`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CompanyDTO[]> {
    return this.http.get<CompanyDTO[]>(this.base);
  }

  getById(id: string): Observable<CompanyDTO> {
    return this.http.get<CompanyDTO>(`${this.base}/${id}`);
  }

  create(company: CompanyDTO): Observable<CompanyDTO> {
    return this.http.post<CompanyDTO>(this.base, company);
  }

  update(id: string, company: CompanyDTO): Observable<CompanyDTO> {
    return this.http.put<CompanyDTO>(`${this.base}/${id}`, company);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
