export interface QuotaSpesa {
  membroId: string;
  quotaCentesimi: number;
}

export interface Spesa {
  id: string;
  pagatoDa: string;
  importoCentesimi: number;
  quote: QuotaSpesa[];
}

export interface Transazione {
  da: string;
  a: string;
  importoCentesimi: number;
}
