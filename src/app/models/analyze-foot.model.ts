import { FootCapture } from './foot-capture.model';

export interface AnalyzeFootRequest {
  referenceType: 'card_id1';
  referenceDimensionsMm: {
    width: number;
    height: number;
  };
  captures: FootCapture[];
}

export interface AnalyzeFootResponse {
  measurementId: string;
  status: 'accepted' | 'processing' | 'completed' | 'failed';
  message: string;
  leftFootMm?: number;
  rightFootMm?: number;
  suggestedSize?: string;
}
