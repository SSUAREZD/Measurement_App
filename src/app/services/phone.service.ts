import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhoneDTO } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class PhoneService {
  private readonly base = `${API_BASE_URL}/phones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PhoneDTO[]> {
    return this.http.get<PhoneDTO[]>(this.base);
  }

  getById(id: string): Observable<PhoneDTO> {
    return this.http.get<PhoneDTO>(`${this.base}/${id}`);
  }

  getByBrandAndName(brand: string, name: string): Observable<PhoneDTO> {
    return this.http.get<PhoneDTO>(`${this.base}/brand/${brand}/name/${name}`);
  }

  create(phone: PhoneDTO): Observable<PhoneDTO> {
    return this.http.post<PhoneDTO>(this.base, phone);
  }

  update(id: string, phone: PhoneDTO): Observable<PhoneDTO> {
    return this.http.put<PhoneDTO>(`${this.base}/${id}`, phone);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
