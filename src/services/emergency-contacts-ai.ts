/**
 * AI-Powered Emergency Contacts Auto-Population Service
 * Generates destination-specific emergency contacts using OpenRouter AI
 */

import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface EmergencyContactData {
  name: string;
  phone: string;
  type: 'medical' | 'police' | 'fire' | 'embassy' | 'tourist_police' | 'emergency_services';
  address?: string;
  notes?: string;
  priority: number;
  isVerified: boolean;
  source: 'ai_generated' | 'user_manual';
}

export interface DestinationEmergencyInfo {
  destination: string;
  country: string;
  countryCode: string;
  contacts: EmergencyContactData[];
  lastUpdated: string;
  confidence: number;
}

export class EmergencyContactsAI {
  // No constructor needed since we're using the imported service object

  /**
   * Generate emergency contacts for a destination using AI
   */
  async generateEmergencyContacts(
    destination: string, 
    country?: string
  ): Promise<DestinationEmergencyInfo> {
    try {
      const prompt = this.buildEmergencyContactsPrompt(destination, country);
      
      // Get API key from environment variables
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenRouter API key not configured');
      }

      const response = await axios.post(OPENROUTER_API_URL, {
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: `You are a travel safety expert. Generate accurate, up-to-date emergency contact information for travelers. Always provide real, verified contact numbers and addresses where possible.`
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for factual accuracy
        response_format: { type: 'json_object' }
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'PandaTraveLog Emergency Contacts'
        }
      });

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from AI service');
      }

      return this.parseEmergencyContactsResponse(response.data.choices[0].message.content, destination);
      
    } catch (error) {
      console.error('Error generating emergency contacts:', error);
      throw error;
    }
  }

  /**
   * Build the AI prompt for emergency contacts generation
   */
  private buildEmergencyContactsPrompt(destination: string, country?: string): string {
    return `
Generate comprehensive emergency contact information for travelers visiting ${destination}${country ? `, ${country}` : ''}.

Please provide the following types of emergency contacts with REAL, VERIFIED contact information:

1. **Emergency Services** (Police, Fire, Ambulance)
2. **Medical Services** (Hospitals, clinics)
3. **Tourist Police** (if available)
4. **Embassy/Consulate** (for international travelers)
5. **Local Emergency Hotlines**

For each contact, provide:
- Name/Organization
- Phone number (with country code)
- Type of service
- Address (if applicable)
- Priority level (1-3, where 1 is most critical)
- Brief notes about when to use this contact

Return the response in this exact JSON format:
{
  "destination": "${destination}",
  "country": "detected_country_name",
  "countryCode": "country_code",
  "contacts": [
    {
      "name": "Emergency Services",
      "phone": "+country_code_emergency_number",
      "type": "emergency_services",
      "address": "if_applicable",
      "notes": "General emergency number for police, fire, ambulance",
      "priority": 1,
      "isVerified": true,
      "source": "ai_generated"
    }
  ],
  "confidence": 0.95
}

IMPORTANT: Only provide real, accurate contact information. If you're unsure about a contact, mark isVerified as false and add a note.
`;
  }

  /**
   * Parse the AI response into structured emergency contact data
   */
  private parseEmergencyContactsResponse(
    content: string, 
    destination: string
  ): DestinationEmergencyInfo {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        destination: parsed.destination || destination,
        country: parsed.country || 'Unknown',
        countryCode: parsed.countryCode || 'XX',
        contacts: parsed.contacts || [],
        lastUpdated: new Date().toISOString(),
        confidence: parsed.confidence || 0.8
      };
      
    } catch (error) {
      console.error('Error parsing emergency contacts response:', error);
      
      // Return fallback structure
      return {
        destination,
        country: 'Unknown',
        countryCode: 'XX',
        contacts: [],
        lastUpdated: new Date().toISOString(),
        confidence: 0.0
      };
    }
  }

  /**
   * Enrich accommodation data with contact information
   */
  async enrichAccommodationContacts(accommodations: any[]): Promise<any[]> {
    const enrichedAccommodations = [];

    for (const accommodation of accommodations) {
      try {
        const enriched = await this.enrichSingleAccommodation(accommodation);
        enrichedAccommodations.push(enriched);
      } catch (error) {
        console.error(`Error enriching accommodation ${accommodation.name}:`, error);
        enrichedAccommodations.push(accommodation); // Return original if enrichment fails
      }
    }

    return enrichedAccommodations;
  }

  /**
   * Enrich a single accommodation with contact details using AI
   */
  private async enrichSingleAccommodation(accommodation: any): Promise<any> {
    const prompt = `
Find contact information for this accommodation:
- Name: ${accommodation.name}
- Address: ${accommodation.address || 'Not provided'}
- Location: ${accommodation.location || 'Not provided'}

Please provide:
1. Phone number (with country code)
2. Email address
3. Website URL
4. Full address (if not complete)
5. Check-in/check-out policies
6. Emergency contact number

Return in JSON format:
{
  "phone": "+country_code_number",
  "email": "contact@hotel.com",
  "website": "https://website.com",
  "fullAddress": "complete address",
  "checkInTime": "3:00 PM",
  "checkOutTime": "11:00 AM",
  "emergencyPhone": "+country_code_emergency",
  "confidence": 0.9
}
`;

    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('OpenRouter API key not configured for accommodation enrichment');
      return accommodation; // Return original if no API key
    }

    const response = await axios.post(OPENROUTER_API_URL, {
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system',
          content: 'You are a travel booking expert. Provide accurate hotel/accommodation contact information.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'PandaTraveLog Accommodation Enrichment'
      }
    });

    if (response.data?.choices?.[0]?.message?.content) {
      try {
        const content = response.data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const contactInfo = JSON.parse(jsonMatch[0]);
          
          return {
            ...accommodation,
            enrichedContactInfo: contactInfo,
            isEnriched: true,
            enrichedAt: new Date().toISOString()
          };
        }
      } catch (parseError) {
        console.error('Error parsing accommodation enrichment:', parseError);
      }
    }

    return accommodation;
  }

  /**
   * Cache emergency contacts to avoid repeated API calls
   */
  async cacheEmergencyContacts(
    tripId: string, 
    emergencyInfo: DestinationEmergencyInfo
  ): Promise<void> {
    try {
      // Server-side caching - store in memory or database
      // For now, we'll skip caching on server-side to avoid localStorage errors
      // In production, this could use Redis or database caching
      console.log(`Caching emergency contacts for trip ${tripId}`);
      
    } catch (error) {
      console.error('Error caching emergency contacts:', error);
    }
  }

  /**
   * Get cached emergency contacts
   */
  getCachedEmergencyContacts(tripId: string): DestinationEmergencyInfo | null {
    try {
      // Server-side - no localStorage available
      // Always return null to force fresh generation
      // In production, this could check Redis or database cache
      return null;
      
    } catch (error) {
      console.error('Error reading cached emergency contacts:', error);
      return null;
    }
  }
}

export default EmergencyContactsAI;
