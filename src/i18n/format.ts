// Locale-aware formatting, one formatter per language dictionary.
// fr-FR: narrow no-break space (U+202F) as thousands separator, no-break space before ":" (and ";", "!", "?").
// en: comma as thousands separator, no space before ":".
export const NBSP = ' ';
// Narrow no-break space: French thousands separator.
export const NNBSP = ' ';

export type Formatter = {
  integer(value: number): string;
  label(text: string, value: string | number): string;
};

export function formatter(locale: string): Formatter {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const beforeColon = locale.toLowerCase().startsWith('fr') ? NBSP : '';
  const integer = (value: number) => numbers.format(value);
  return {
    integer,
    label: (text, value) => `${text}${beforeColon}: ${typeof value === 'number' ? integer(value) : value}`,
  };
}

// Decimal with at most one fraction digit, in the language's style (fr "1,5", en "1.5").
export function decimal(locale: string): (value: number) => string {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (value) => numbers.format(value);
}
