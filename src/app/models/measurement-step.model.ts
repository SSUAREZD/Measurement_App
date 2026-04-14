export type MeasurementStepKey =
  | 'welcome'
  | 'instructions'
  | 'capture-left'
  | 'confirm-left'
  | 'capture-right'
  | 'confirm-right'
  | 'summary';

export interface MeasurementStep {
  key: MeasurementStepKey;
  title: string;
  subtitle: string;
}
