/**
 * Currency Conversion Service
 * Provides real-time currency exchange rates and conversion functionality
 */

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

export interface CurrencyConversion {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  exchangeRate: number;
  timestamp: number;
}

export interface SupportedCurrency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export class CurrencyService {
  private static readonly API_KEY = process.env.NEXT_PUBLIC_EXCHANGE_API_KEY;
  private static readonly BASE_URL = 'https://api.exchangerate-api.com/v4';
  private static readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds
  private static exchangeRateCache = new Map<string, { rate: number; timestamp: number }>();

  // Popular currencies with their symbols and flags
  static readonly SUPPORTED_CURRENCIES: SupportedCurrency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷' },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£', flag: '🇪🇬' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' }
  ];

  /**
   * Get current exchange rate between two currencies
   */
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    if (fromCurrency === toCurrency) {
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: 1,
        timestamp: Date.now()
      };
    }

    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.exchangeRateCache.get(cacheKey);
    
    // Return cached rate if still valid
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: cached.rate,
        timestamp: cached.timestamp
      };
    }

    try {
      // Use exchangerate-api.com (free tier supports up to 1500 requests/month)
      const response = await fetch(
        `${this.BASE_URL}/latest/${fromCurrency}?access_key=${this.API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.rates || !data.rates[toCurrency]) {
        throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
      }

      const rate = data.rates[toCurrency];
      const timestamp = Date.now();

      // Cache the result
      this.exchangeRateCache.set(cacheKey, { rate, timestamp });

      return {
        from: fromCurrency,
        to: toCurrency,
        rate,
        timestamp
      };

    } catch (error) {
      console.error('Currency exchange rate fetch error:', error);
      
      // Fallback to approximate rates for common conversions
      const fallbackRates = this.getFallbackRate(fromCurrency, toCurrency);
      if (fallbackRates) {
        return fallbackRates;
      }
      
      throw new Error(`Unable to get exchange rate for ${fromCurrency} to ${toCurrency}`);
    }
  }

  /**
   * Convert amount from one currency to another
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate.rate;

    return {
      amount,
      fromCurrency,
      toCurrency,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      exchangeRate: exchangeRate.rate,
      timestamp: exchangeRate.timestamp
    };
  }

  /**
   * Format currency amount with appropriate symbol and formatting
   */
  static formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || currencyCode;
    const flag = currency?.flag || '';

    // Format number with appropriate decimal places
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2,
    }).format(amount);

    return `${flag} ${symbol}${formattedAmount}`;
  }

  /**
   * Get currency info by code
   */
  static getCurrencyInfo(currencyCode: string): SupportedCurrency | null {
    return this.SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || null;
  }

  /**
   * Get popular currencies for a specific region/country
   */
  static getCurrenciesForRegion(region: string): SupportedCurrency[] {
    const regionCurrencies: Record<string, string[]> = {
      'asia': ['USD', 'JPY', 'CNY', 'KRW', 'SGD', 'THB', 'VND', 'MYR', 'PHP', 'IDR', 'HKD', 'TWD', 'INR'],
      'europe': ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RUB', 'TRY'],
      'americas': ['USD', 'CAD', 'BRL', 'MXN', 'ARS', 'CLP'],
      'oceania': ['AUD', 'NZD', 'USD'],
      'africa': ['ZAR', 'EGP', 'USD', 'EUR'],
      'middle_east': ['AED', 'SAR', 'ILS', 'TRY', 'USD', 'EUR']
    };

    const codes = regionCurrencies[region.toLowerCase()] || ['USD', 'EUR', 'GBP'];
    return codes.map(code => this.SUPPORTED_CURRENCIES.find(c => c.code === code)!).filter(Boolean);
  }

  /**
   * Fallback exchange rates for when API is unavailable
   */
  private static getFallbackRate(fromCurrency: string, toCurrency: string): ExchangeRate | null {
    // Approximate rates as of 2024 (for fallback only)
    const fallbackRates: Record<string, Record<string, number>> = {
      'USD': {
        'EUR': 0.85, 'GBP': 0.73, 'JPY': 110, 'AUD': 1.35, 'CAD': 1.25,
        'CHF': 0.88, 'CNY': 6.4, 'INR': 75, 'KRW': 1200, 'SGD': 1.3
      },
      'EUR': {
        'USD': 1.18, 'GBP': 0.86, 'JPY': 130, 'AUD': 1.6, 'CAD': 1.48,
        'CHF': 1.04, 'CNY': 7.6, 'INR': 88, 'KRW': 1420, 'SGD': 1.54
      }
    };

    if (fallbackRates[fromCurrency]?.[toCurrency]) {
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: fallbackRates[fromCurrency][toCurrency],
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Detect user's likely currency based on location
   */
  static detectCurrencyFromLocation(countryCode?: string): string {
    const countryCurrencyMap: Record<string, string> = {
      'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'AU': 'AUD', 'NZ': 'NZD',
      'JP': 'JPY', 'KR': 'KRW', 'CN': 'CNY', 'IN': 'INR', 'SG': 'SGD',
      'TH': 'THB', 'VN': 'VND', 'MY': 'MYR', 'PH': 'PHP', 'ID': 'IDR',
      'HK': 'HKD', 'TW': 'TWD', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK',
      'DK': 'DKK', 'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'RU': 'RUB',
      'BR': 'BRL', 'MX': 'MXN', 'AR': 'ARS', 'CL': 'CLP', 'ZA': 'ZAR',
      'EG': 'EGP', 'AE': 'AED', 'SA': 'SAR', 'TR': 'TRY', 'IL': 'ILS'
    };

    // EU countries use EUR
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'LU', 'MT', 'CY', 'SK', 'SI', 'EE', 'LV', 'LT'];
    
    if (countryCode && euCountries.includes(countryCode)) {
      return 'EUR';
    }

    return countryCurrencyMap[countryCode || ''] || 'USD';
  }
}
