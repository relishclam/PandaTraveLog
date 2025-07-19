// Trip Enrichment Service - Uses AI to enhance trip data with addresses, contacts, and map links
import { OpenAI } from 'openai';

interface EnrichmentRequest {
  placeName: string;
  placeType: 'destination' | 'hotel' | 'restaurant' | 'attraction';
  context?: string;
}

interface EnrichedPlaceData {
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  mapLink?: string;
  additionalInfo?: string;
  confidence: number;
}

class TripEnrichmentService {
  private openai: OpenAI;
  private geoapifyApiKey: string;

  constructor() {
    // Initialize OpenRouter client
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
      dangerouslyAllowBrowser: true
    });
    
    this.geoapifyApiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '';
  }

  /**
   * Enrich a place with AI-powered data gathering
   */
  async enrichPlace(request: EnrichmentRequest): Promise<EnrichedPlaceData> {
    try {
      console.log('Enriching place:', request);

      // First, try to get basic location data from Geoapify
      const geoData = await this.getGeoapifyData(request.placeName);
      
      // Then use AI to enhance with additional information
      const aiEnhancement = await this.getAIEnhancement(request, geoData);

      // Combine the data
      const enrichedData: EnrichedPlaceData = {
        name: request.placeName,
        address: geoData?.address || aiEnhancement.address || 'Address not found',
        coordinates: geoData?.coordinates || aiEnhancement.coordinates,
        contactInfo: aiEnhancement.contactInfo,
        mapLink: this.generateMapLink(geoData?.coordinates || aiEnhancement.coordinates),
        additionalInfo: aiEnhancement.additionalInfo,
        confidence: this.calculateConfidence(geoData, aiEnhancement)
      };

      return enrichedData;
    } catch (error) {
      console.error('Error enriching place:', error);
      return {
        name: request.placeName,
        address: 'Unable to find address',
        confidence: 0
      };
    }
  }

  /**
   * Get location data from Geoapify
   */
  private async getGeoapifyData(placeName: string): Promise<any> {
    if (!this.geoapifyApiKey) {
      console.warn('Geoapify API key not available');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(placeName)}&apiKey=${this.geoapifyApiKey}&limit=1`
      );

      if (!response.ok) {
        console.warn('Geoapify API error:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          address: feature.properties.formatted,
          coordinates: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          },
          properties: feature.properties
        };
      }

      return null;
    } catch (error) {
      console.error('Geoapify error:', error);
      return null;
    }
  }

  /**
   * Use AI to enhance place information
   */
  private async getAIEnhancement(request: EnrichmentRequest, geoData: any): Promise<any> {
    try {
      const prompt = this.buildEnhancementPrompt(request, geoData);
      
      const completion = await this.openai.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "system",
            content: "You are a travel information assistant. Provide accurate, helpful information about places including addresses, contact details, and travel tips. Always respond in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          return JSON.parse(response);
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          return this.createFallbackResponse(request);
        }
      }

      return this.createFallbackResponse(request);
    } catch (error) {
      console.error('AI enhancement error:', error);
      return this.createFallbackResponse(request);
    }
  }

  /**
   * Build prompt for AI enhancement
   */
  private buildEnhancementPrompt(request: EnrichmentRequest, geoData: any): string {
    const baseInfo = geoData ? `
Known location data:
- Address: ${geoData.address}
- Coordinates: ${geoData.coordinates?.lat}, ${geoData.coordinates?.lng}
` : '';

    return `
Please provide detailed information about "${request.placeName}" as a ${request.placeType}.

${baseInfo}

${request.context ? `Additional context: ${request.context}` : ''}

Please respond with a JSON object containing:
{
  "address": "Full formatted address if not already provided",
  "coordinates": {"lat": number, "lng": number} if available,
  "contactInfo": {
    "phone": "phone number if available",
    "email": "email if available", 
    "website": "official website if available"
  },
  "additionalInfo": "Helpful travel information, opening hours, tips, etc.",
  "confidence": number between 0-1 indicating data reliability
}

Focus on providing accurate, up-to-date information. If you're not certain about specific details, indicate lower confidence.
`;
  }

  /**
   * Create fallback response when AI fails
   */
  private createFallbackResponse(request: EnrichmentRequest): any {
    return {
      address: '',
      coordinates: null,
      contactInfo: {},
      additionalInfo: `${request.placeType} information not available`,
      confidence: 0
    };
  }

  /**
   * Generate Google Maps link
   */
  private generateMapLink(coordinates?: { lat: number; lng: number }): string {
    if (coordinates) {
      return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
    }
    return '';
  }

  /**
   * Calculate confidence score based on available data
   */
  private calculateConfidence(geoData: any, aiData: any): number {
    let confidence = 0;
    
    if (geoData?.address) confidence += 0.4;
    if (geoData?.coordinates) confidence += 0.3;
    if (aiData?.contactInfo?.phone) confidence += 0.1;
    if (aiData?.contactInfo?.website) confidence += 0.1;
    if (aiData?.additionalInfo) confidence += 0.1;
    
    return Math.min(confidence, 1);
  }

  /**
   * Enrich multiple places in batch
   */
  async enrichMultiplePlaces(requests: EnrichmentRequest[]): Promise<EnrichedPlaceData[]> {
    const results = await Promise.allSettled(
      requests.map(request => this.enrichPlace(request))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to enrich ${requests[index].placeName}:`, result.reason);
        return {
          name: requests[index].placeName,
          address: 'Enrichment failed',
          confidence: 0
        };
      }
    });
  }

  /**
   * Enrich trip data automatically
   */
  async enrichTripData(tripData: any): Promise<any> {
    const enrichmentRequests: EnrichmentRequest[] = [];

    // Extract destinations
    if (tripData.destinations) {
      tripData.destinations.forEach((dest: any) => {
        enrichmentRequests.push({
          placeName: dest.name,
          placeType: 'destination',
          context: dest.address || ''
        });
      });
    }

    // Extract accommodations
    if (tripData.accommodations) {
      tripData.accommodations.forEach((hotel: any) => {
        enrichmentRequests.push({
          placeName: hotel.name,
          placeType: 'hotel',
          context: hotel.address || ''
        });
      });
    }

    // Enrich all places
    const enrichedData = await this.enrichMultiplePlaces(enrichmentRequests);

    // Update trip data with enriched information
    const enrichedTripData = { ...tripData };

    let enrichmentIndex = 0;

    // Update destinations
    if (enrichedTripData.destinations) {
      enrichedTripData.destinations = enrichedTripData.destinations.map((dest: any) => ({
        ...dest,
        enrichedData: enrichedData[enrichmentIndex++]
      }));
    }

    // Update accommodations
    if (enrichedTripData.accommodations) {
      enrichedTripData.accommodations = enrichedTripData.accommodations.map((hotel: any) => ({
        ...hotel,
        enrichedData: enrichedData[enrichmentIndex++]
      }));
    }

    return enrichedTripData;
  }
}

export default TripEnrichmentService;
export type { EnrichmentRequest, EnrichedPlaceData };
