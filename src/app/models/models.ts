// ─── Company ─────────────────────────────────────────────────────────────────

export interface CompanyDTO {
  id?: string;
  name: string;
  [key: string]: unknown;
}

// ─── Company-User ─────────────────────────────────────────────────────────────

export interface CompanyUserDTO {
  companyId: string;
  userId: string;
}

// ─── Phone ────────────────────────────────────────────────────────────────────

export interface PhoneDTO {
  id?: string;
  brand: string;
  name: string;
  [key: string]: unknown;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserDTO {
  id?: string;
  username: string;
  role?: string;
  [key: string]: unknown;
}

export interface AdminDTO {
  username: string;
  password: string;
  [key: string]: unknown;
}

export interface ClientDTO {
  username: string;
  password: string;
  phone?: PhoneDTO;
  [key: string]: unknown;
}

// ─── Measurement ──────────────────────────────────────────────────────────────

export interface FeetMeasurement {
  userId?: string;
  footLength:   number;
  ballWidth:    number;
  heelWidth:    number;
  /** Calculated server-side — always sent as 0 */
  ballGirth:    number;
  /** Calculated server-side — always sent as 0 */
  instepGirth:  number;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductDTO {
  id?: string;
  name: string;
  [key: string]: unknown;
}

// ─── Product Line ─────────────────────────────────────────────────────────────

export interface ProductLineDTO {
  id?: string;
  name: string;
  companyId?: string;
  [key: string]: unknown;
}

// ─── Size ─────────────────────────────────────────────────────────────────────

export interface SizeDTO {
  id?: string;
  denomination: string;
  [key: string]: unknown;
}

export type RecommendationStatus = 'FITS' | 'NO_FIT' | 'NO_INFO';

export interface RecommendationResult {
  size: SizeDTO | null;
  status: RecommendationStatus;
}
