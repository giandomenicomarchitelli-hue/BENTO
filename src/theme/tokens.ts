/** Design token centrali dell'app: colori, tipografia, spaziature, raggi. */

export const colori = {
  blu600: '#2d6cdf',
  blu700: '#2558bb',
  blu100: '#dbe6fb',
  blu50: '#eef3fd',

  inchiostro900: '#14181f',
  inchiostro700: '#3a4150',
  inchiostro500: '#4b5563',
  inchiostro300: '#c7ccd4',
  inchiostro150: '#e6e9ee',
  inchiostro100: '#f1f3f6',

  superficie: '#ffffff',
  sfondoApp: '#f5f6f8',

  rosso600: '#c0392b',
  verde700: '#2e7d32',
} as const;

export const spaziatura = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const raggio = {
  sm: 10,
  md: 14,
  lg: 20,
} as const;

export const tipografia = {
  titolo: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.2 },
  etichetta: { fontSize: 13, fontWeight: '600' as const },
  corpo: { fontSize: 15, fontWeight: '600' as const },
  corpoSecondario: { fontSize: 12.5, fontWeight: '500' as const },
};
