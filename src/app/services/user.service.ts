import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminDTO, ClientDTO, MeasurementDTO, PhoneDTO, UserDTO } from '../models/models';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly base = `${API_BASE_URL}/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(this.base);
  }

  getById(id: string): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.base}/${id}`);
  }

  getPhone(id: string): Observable<PhoneDTO> {
    return this.http.get<PhoneDTO>(`${this.base}/${id}/phone`);
  }

  getMeasurements(userId: string): Observable<MeasurementDTO[]> {
    return this.http.get<MeasurementDTO[]>(`${this.base}/measurements/${userId}`);
  }

  createAdmin(admin: AdminDTO): Observable<UserDTO> {
    return this.http.post<UserDTO>(`${this.base}/admin`, admin);
  }

  createClient(client: ClientDTO): Observable<UserDTO> {
    return this.http.post<UserDTO>(`${this.base}/client`, client);
  }

  updateAdmin(id: string, admin: AdminDTO): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.base}/${id}/admin`, admin);
  }

  updateClient(id: string, client: ClientDTO): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.base}/${id}/client`, client);
  }

  updatePhone(id: string, phone: PhoneDTO): Observable<PhoneDTO> {
    return this.http.put<PhoneDTO>(`${this.base}/${id}/phone`, phone);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
