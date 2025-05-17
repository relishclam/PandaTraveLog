// ISO country codes and names for filtering
export const COUNTRY_CODES: Record<string, string> = {
  'India': 'IN',
  'United States': 'US',
  'Malaysia': 'MY',
  'France': 'FR',
  'Italy': 'IT',
  'Germany': 'DE',
  'Japan': 'JP',
  'Australia': 'AU',
  'United Kingdom': 'GB',
  // ... add more as needed
};

export function getCountryCodeByName(name: string): string | undefined {
  // Try direct match
  if (COUNTRY_CODES[name]) return COUNTRY_CODES[name];
  // Try case-insensitive match
  const entry = Object.entries(COUNTRY_CODES).find(([n]) => n.toLowerCase() === name.toLowerCase());
  return entry ? entry[1] : undefined;
}
