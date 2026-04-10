import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductLineDTO, UserDTO } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class ProductLineService {
  private readonly base = `${API_BASE_URL}/product-lines`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ProductLineDTO[]> {
    return this.http.get<ProductLineDTO[]>(this.base);
  }

  getById(id: string): Observable<ProductLineDTO> {
    return this.http.get<ProductLineDTO>(`${this.base}/${id}`);
  }

  getByCompany(companyId: string): Observable<ProductLineDTO[]> {
    return this.http.get<ProductLineDTO[]>(`${this.base}/company/${companyId}`);
  }

  getByUser(userId: string): Observable<ProductLineDTO[]> {
    return this.http.get<ProductLineDTO[]>(`${this.base}/user/${userId}`);
  }

  create(productLine: ProductLineDTO): Observable<ProductLineDTO> {
    return this.http.post<ProductLineDTO>(this.base, productLine);
  }

  assignToUser(userId: string, productLineId: string): Observable<UserDTO> {
    return this.http.post<UserDTO>(`${this.base}/user/${userId}/${productLineId}`, null);
  }

  update(id: string, productLine: ProductLineDTO): Observable<ProductLineDTO> {
    return this.http.put<ProductLineDTO>(`${this.base}/${id}`, productLine);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
