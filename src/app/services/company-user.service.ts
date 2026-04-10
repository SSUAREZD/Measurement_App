import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyDTO, CompanyUserDTO, UserDTO } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class CompanyUserService {
  private readonly base = `${API_BASE_URL}/company-users`;

  constructor(private http: HttpClient) {}

  getCompaniesByUser(userId: string): Observable<CompanyDTO[]> {
    return this.http.get<CompanyDTO[]>(`${this.base}/user/${userId}/companies`);
  }

  getUsersByCompany(companyId: string): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(`${this.base}/company/${companyId}/users`);
  }

  addUserToCompany(companyId: string, userId: string): Observable<CompanyUserDTO> {
    return this.http.post<CompanyUserDTO>(`${this.base}/${companyId}/${userId}`, null);
  }

  removeUserFromCompany(companyId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${companyId}/${userId}`);
  }
}
