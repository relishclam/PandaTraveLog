/**
 * Utility functions for working with the Geoapify API
 */

/**
 * Validates if the Geoapify API key is working by making a simple test request
 * @returns Promise<boolean> - True if API key is valid, false otherwise
 */
export async function validateGeoapifyApiKey(): Promise<{ valid: boolean; message: string }> {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    
    if (!apiKey) {
      return {
        valid: false,
        message: 'API key not found in environment variables. Check your .env.local file.'
      };
    }
    
    // Enhanced debugging for API key
    console.log(`🔑 Testing Geoapify API key (last 4 chars): ...${apiKey.slice(-4)}`);
    console.log(`🔑 API key length: ${apiKey.length} characters`);
    console.log(`🔑 First 2 chars: ${apiKey.slice(0, 2)}...`);
    
    // Check if key contains only valid characters
    const validKeyPattern = /^[a-zA-Z0-9]+$/;
    const isValidFormat = validKeyPattern.test(apiKey);
    console.log(`🔑 API key format valid: ${isValidFormat}`);
    
    if (!isValidFormat) {
      return {
        valid: false,
        message: 'API key format is invalid. It should only contain letters and numbers.'
      };
    }
    
    // Try a different endpoint - geocoding API which might have different permissions
    const testUrl = `https://api.geoapify.com/v1/geocode/search?text=London&apiKey=${apiKey}`;
    console.log(`🔑 Testing API with URL: ${testUrl.replace(apiKey, '****')}`);
    
    const response = await fetch(testUrl);
    console.log(`🔑 API response status: ${response.status}`);
    
    if (response.ok) {
      return {
        valid: true,
        message: 'Geoapify API key is valid and working with the geocoding API.'
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('API validation error details:', errorData);
      
      // Try a second endpoint as a fallback
      console.log('🔑 Trying alternative API endpoint...');
      const fallbackUrl = `https://api.geoapify.com/v2/places?categories=accommodation&filter=circle:0.0,51.5,1000&apiKey=${apiKey}`;
      
      try {
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          return {
            valid: true,
            message: 'Geoapify API key is valid with the places API (fallback endpoint).'
          };
        } else {
          const fallbackError = await fallbackResponse.json().catch(() => ({}));
          return {
            valid: false,
            message: `API key validation failed on all endpoints. Status: ${response.status}. Details: ${JSON.stringify(errorData || fallbackError)}`
          };
        }
      } catch (fallbackErr) {
        return {
          valid: false,
          message: `API key validation failed: ${response.status}. Fallback error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`
        };
      }
    }
  } catch (error) {
    console.error('Validation error:', error);
    return {
      valid: false,
      message: `Error validating API key: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks environment variables and reports potential issues
 */
export function checkGeoapifyEnvironment(): { valid: boolean; message: string } {
  // This function runs on the client side
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  
  if (!apiKey) {
    return {
      valid: false,
      message: 'API key not found in environment variables. Check your .env.local file.'
    };
  }
  
  if (apiKey.length < 20) {
    return {
      valid: false,
      message: 'API key looks too short. Please check that you have the correct key.'
    };
  }
  
  return {
    valid: true,
    message: `API key found in environment variables (last 4 chars): ...${apiKey.slice(-4)}`
  };
}
