'use client';

import React, { useState } from 'react';
import { MapPin, DollarSign, Navigation, Calculator, Globe, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useLocationCurrency, useCurrencyConverter, useLocationFeatures } from '@/hooks/useLocationCurrency';

interface LocationCurrencyWidgetProps {
  onLocationDetected?: (location: any) => void;
  onCurrencyConverted?: (conversion: any) => void;
  compact?: boolean;
}

export function LocationCurrencyWidget({ 
  onLocationDetected, 
  onCurrencyConverted, 
  compact = false 
}: LocationCurrencyWidgetProps) {
  const {
    userLocation,
    locationLoading,
    locationError,
    locationPermission,
    preferredCurrency,
    supportedCurrencies,
    currencyLoading,
    currencyError,
    setPreferredCurrency,
    convertCurrency,
    formatCurrency,
    calculateTravelRoute
  } = useLocationCurrency();

  const { getLocationString, requestLocationAccess } = useLocationFeatures();
  const { convertAndFormat } = useCurrencyConverter();

  const [activeTab, setActiveTab] = useState<'location' | 'currency' | 'route'>('location');
  const [conversionAmount, setConversionAmount] = useState<string>('100');
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>(preferredCurrency);
  const [conversionResult, setConversionResult] = useState<any>(null);
  const [routeOrigin, setRouteOrigin] = useState<string>('');
  const [routeDestination, setRouteDestination] = useState<string>('');
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const handleLocationRequest = async () => {
    const success = await requestLocationAccess();
    if (success && userLocation && onLocationDetected) {
      onLocationDetected(userLocation);
    }
  };

  const handleCurrencyConversion = async () => {
    const amount = parseFloat(conversionAmount);
    if (isNaN(amount) || amount <= 0) return;

    const result = await convertCurrency(amount, fromCurrency, toCurrency);
    if (result) {
      setConversionResult(result);
      if (onCurrencyConverted) {
        onCurrencyConverted(result);
      }
    }
  };

  const handleRouteCalculation = async () => {
    if (!routeOrigin || !routeDestination) return;

    setRouteLoading(true);
    try {
      const route = await calculateTravelRoute(routeOrigin, routeDestination);
      setRouteResult(route);
    } catch (error) {
      console.error('Route calculation failed:', error);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleSetUserLocation = () => {
    if (userLocation) {
      setRouteOrigin(getLocationString());
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-gray-600">
            {userLocation ? getLocationString() : 'Location not detected'}
          </span>
          {!userLocation && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleLocationRequest}
              disabled={locationLoading}
            >
              {locationLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Detect'}
            </Button>
          )}
        </div>
        
        <div className="h-6 w-px bg-gray-300 mx-2" />
        
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedCurrencies.slice(0, 10).map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.flag} {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5 text-blue-600" />
          Location & Currency
        </CardTitle>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={activeTab === 'location' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('location')}
            className="flex-1"
          >
            <MapPin className="h-4 w-4 mr-1" />
            Location
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'currency' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('currency')}
            className="flex-1"
          >
            <Calculator className="h-4 w-4 mr-1" />
            Currency
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'route' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('route')}
            className="flex-1"
          >
            <Navigation className="h-4 w-4 mr-1" />
            Route
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {activeTab === 'location' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Location</span>
              <Badge variant={userLocation ? 'default' : 'secondary'}>
                {userLocation ? 'Detected' : 'Not detected'}
              </Badge>
            </div>
            
            {userLocation ? (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {getLocationString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Suggested currency: {formatCurrency(1, preferredCurrency)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {locationError && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-800">{locationError}</p>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleLocationRequest}
                  disabled={locationLoading}
                  className="w-full"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Detecting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Detect My Location
                    </>
                  )}
                </Button>
                
                {locationPermission === 'denied' && (
                  <p className="text-xs text-gray-500 text-center">
                    Location access denied. Using IP-based detection.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'currency' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Preferred Currency</label>
              <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedCurrencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span>{currency.flag}</span>
                        <span>{currency.code}</span>
                        <span className="text-gray-500">- {currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-px bg-gray-200" />

            <div>
              <label className="text-sm font-medium mb-2 block">Currency Converter</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={conversionAmount}
                    onChange={(e) => setConversionAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1"
                  />
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedCurrencies.slice(0, 10).map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-center">
                  <div className="text-gray-400">to</div>
                </div>

                <div className="flex gap-2">
                  <Select value={toCurrency} onValueChange={setToCurrency}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedCurrencies.slice(0, 10).map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleCurrencyConversion}
                    disabled={currencyLoading}
                    className="flex-1"
                  >
                    {currencyLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Convert'
                    )}
                  </Button>
                </div>

                {conversionResult && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800">
                      {formatCurrency(conversionResult.amount, conversionResult.fromCurrency)} = {' '}
                      {formatCurrency(conversionResult.convertedAmount, conversionResult.toCurrency)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Rate: 1 {conversionResult.fromCurrency} = {conversionResult.exchangeRate.toFixed(4)} {conversionResult.toCurrency}
                    </p>
                  </div>
                )}

                {currencyError && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-800">{currencyError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'route' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Travel Route Calculator</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={routeOrigin}
                    onChange={(e) => setRouteOrigin(e.target.value)}
                    placeholder="From (city, address)"
                    className="flex-1"
                  />
                  {userLocation && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSetUserLocation}
                      title="Use my location"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Input
                  value={routeDestination}
                  onChange={(e) => setRouteDestination(e.target.value)}
                  placeholder="To (city, address)"
                />
                
                <Button 
                  onClick={handleRouteCalculation}
                  disabled={routeLoading || !routeOrigin || !routeDestination}
                  className="w-full"
                >
                  {routeLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Calculating Route...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-2" />
                      Calculate Route
                    </>
                  )}
                </Button>

                {routeResult && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-800">
                        {routeResult.formatted.origin} → {routeResult.formatted.destination}
                      </p>
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Distance: {routeResult.formatted.distance}</span>
                        <span>Time: {routeResult.estimatedTravelTime}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {routeResult.transportModes.map((mode: string) => (
                          <Badge key={mode} variant="secondary" className="text-xs">
                            {mode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
