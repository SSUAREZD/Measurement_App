import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductDTO } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly base = `${API_BASE_URL}/products`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ProductDTO[]> {
    return this.http.get<ProductDTO[]>(this.base);
  }

  getById(id: string): Observable<ProductDTO> {
    return this.http.get<ProductDTO>(`${this.base}/${id}`);
  }

  create(product: ProductDTO): Observable<ProductDTO> {
    return this.http.post<ProductDTO>(this.base, product);
  }

  update(id: string, product: ProductDTO): Observable<ProductDTO> {
    return this.http.put<ProductDTO>(`${this.base}/${id}`, product);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
