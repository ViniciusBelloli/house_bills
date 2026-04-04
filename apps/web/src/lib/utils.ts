import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formats an ISO date string (YYYY-MM-DD) as "2 jan. 2026". */
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'd MMM yyyy', { locale: ptBR });
}

/** Returns today as YYYY-MM-DD. */
export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Returns the current month as YYYY-MM. */
export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}
