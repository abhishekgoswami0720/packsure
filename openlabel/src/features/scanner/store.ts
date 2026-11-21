import { create } from 'zustand';
import { ScanSource } from '@/domain/scans';

/** The two capture modes offered on the scanner screen. */
export type ScanMode = Extract<ScanSource, 'barcode' | 'label'>;

interface ScannerState {
  mode: ScanMode;
  setMode: (mode: ScanMode) => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  mode: 'barcode',
  setMode: (mode) => set({ mode }),
}));
