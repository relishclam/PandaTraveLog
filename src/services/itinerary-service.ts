// src/services/itinerary-service.ts
import { createClient } from '@/utils/supabase/client';

// Initialize Supabase client for this service
const supabase = createClient();
import { Itinerary, ItineraryDay, Activity } from './openrouter-service';

export interface SaveItineraryParams {
  tripId: string;
  userId: string;
  itinerary: Itinerary;
}

export interface SaveItineraryResponse {
  success: boolean;
  message: string;
  itineraryId?: string;
  dayIds?: string[];
  error?: any;
}

export const itineraryService = {
  /**
   * Save a complete itinerary to the database
   * This includes saving day and activity data
   */
  async saveItinerary({ tripId, userId, itinerary }: SaveItineraryParams): Promise<SaveItineraryResponse> {
    try {
      console.log(`Saving itinerary for trip ${tripId}`);
      
      // First, check if an itinerary already exists for this trip
      const { data: existingItinerary, error: fetchError } = await supabase
        .from('itineraries')
        .select('id')
        .eq('trip_id', tripId)
        .single();
      
      let itineraryId: string;
      let operation: 'created' | 'updated' = 'created';
      
      if (existingItinerary) {
        // Update existing itinerary
        itineraryId = existingItinerary.id;
        operation = 'updated';
        
        const { error: updateError } = await supabase
          .from('itineraries')
          .update({
            title: itinerary.title,
            description: itinerary.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', itineraryId);
        
        if (updateError) {
          console.error('Error updating itinerary:', updateError);
          return {
            success: false,
            message: 'Failed to update itinerary',
            error: updateError
          };
        }
        
        // Delete existing days and activities to avoid duplication
        await this.deleteItineraryDays(itineraryId);
      } else {
        // Create new itinerary
        const { data: newItinerary, error: insertError } = await supabase
          .from('itineraries')
          .insert({
            trip_id: tripId,
            user_id: userId,
            title: itinerary.title,
            description: itinerary.description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (insertError || !newItinerary) {
          console.error('Error creating itinerary:', insertError);
          return {
            success: false,
            message: 'Failed to create itinerary',
            error: insertError
          };
        }
        
        itineraryId = newItinerary.id;
      }
      
      // Now save the days and activities
      const dayIds = await this.saveItineraryDays(itineraryId, itinerary.days);
      
      return {
        success: true,
        message: `Itinerary ${operation} successfully`,
        itineraryId,
        dayIds
      };
    } catch (error) {
      console.error('Error in saveItinerary:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while saving itinerary',
        error
      };
    }
  },
  
  /**
   * Save itinerary days and their activities
   */
  async saveItineraryDays(itineraryId: string, days: ItineraryDay[]): Promise<string[]> {
    const dayIds: string[] = [];
    
    // Process each day sequentially to maintain order
    for (const day of days) {
      try {
        // Insert day
        const { data: newDay, error: dayError } = await supabase
          .from('itinerary_days')
          .insert({
            itinerary_id: itineraryId,
            day_number: day.dayNumber,
            date: day.date,
            title: day.title,
            description: day.description
          })
          .select('id')
          .single();
        
        if (dayError || !newDay) {
          console.error(`Error saving day ${day.dayNumber}:`, dayError);
          continue; // Skip activities for this day
        }
        
        dayIds.push(newDay.id);
        
        // Save activities for this day
        await this.saveActivities(newDay.id, day.activities);
        
        // Save meals if they exist
        if (day.meals) {
          await this.saveMeals(newDay.id, day.meals);
        }
      } catch (error) {
        console.error(`Error processing day ${day.dayNumber}:`, error);
      }
    }
    
    return dayIds;
  },
  
  /**
   * Save activities for a day
   */
  async saveActivities(dayId: string, activities: Activity[]): Promise<void> {
    if (!activities || activities.length === 0) return;
    
    // Prepare activities data
    const activitiesData = activities.map((activity, index) => ({
      day_id: dayId,
      title: activity.title,
      description: activity.description,
      type: activity.type,
      location_name: activity.location?.name || '',
      location_address: activity.location?.address || '',
      location_place_id: activity.location?.placeId || '',
      lat: activity.location?.coordinates?.lat || null,
      lng: activity.location?.coordinates?.lng || null,
      start_time: activity.startTime || null,
      end_time: activity.endTime || null,
      duration: activity.duration || null,
      image_url: activity.imageUrl || null,
      map_url: activity.mapUrl || null,
      cost: activity.cost || null,
      notes: activity.notes || null,
      sort_order: index // Maintain original order
    }));
    
    // Insert activities
    const { error } = await supabase
      .from('activities')
      .insert(activitiesData);
    
    if (error) {
      console.error('Error saving activities:', error);
    }
  },
  
  /**
   * Save meals for a day
   */
  async saveMeals(dayId: string, meals: any): Promise<void> {
    // Extract meals from the day
    const mealData = [];
    
    if (meals.breakfast) {
      mealData.push({
        day_id: dayId,
        type: 'breakfast',
        name: meals.breakfast.name,
        location: meals.breakfast.location,
        description: meals.breakfast.description,
        place_id: meals.breakfast.placeId
      });
    }
    
    if (meals.lunch) {
      mealData.push({
        day_id: dayId,
        type: 'lunch',
        name: meals.lunch.name,
        location: meals.lunch.location,
        description: meals.lunch.description,
        place_id: meals.lunch.placeId
      });
    }
    
    if (meals.dinner) {
      mealData.push({
        day_id: dayId,
        type: 'dinner',
        name: meals.dinner.name,
        location: meals.dinner.location,
        description: meals.dinner.description,
        place_id: meals.dinner.placeId
      });
    }
    
    if (mealData.length === 0) return;
    
    // Insert meals
    const { error } = await supabase
      .from('meals')
      .insert(mealData);
    
    if (error) {
      console.error('Error saving meals:', error);
    }
  },
  
  /**
   * Delete all days and activities for an itinerary
   */
  async deleteItineraryDays(itineraryId: string): Promise<void> {
    try {
      // Get all days for this itinerary
      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('id')
        .eq('itinerary_id', itineraryId);
      
      if (daysError) {
        console.error('Error fetching days to delete:', daysError);
        return;
      }
      
      // Delete activities and meals for each day
      for (const day of days || []) {
        // Delete activities
        await supabase
          .from('activities')
          .delete()
          .eq('day_id', day.id);
        
        // Delete meals
        await supabase
          .from('meals')
          .delete()
          .eq('day_id', day.id);
      }
      
      // Delete all days
      await supabase
        .from('itinerary_days')
        .delete()
        .eq('itinerary_id', itineraryId);
        
    } catch (error) {
      console.error('Error in deleteItineraryDays:', error);
    }
  },
  
  /**
   * Get a complete itinerary with days, activities, and meals
   */
  async getItinerary(tripId: string): Promise<any> {
    try {
      // Get the itinerary
      const { data: itinerary, error: itineraryError } = await supabase
        .from('itineraries')
        .select('*')
        .eq('trip_id', tripId)
        .single();
      
      if (itineraryError || !itinerary) {
        console.error('Error fetching itinerary:', itineraryError);
        return null;
      }
      
      // Get days
      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('*')
        .eq('itinerary_id', itinerary.id)
        .order('day_number', { ascending: true });
      
      if (daysError) {
        console.error('Error fetching itinerary days:', daysError);
        return { ...itinerary, days: [] };
      }
      
      // Get activities and meals for each day
      const daysWithDetails = await Promise.all(days.map(async (day: any) => {
        // Get activities
        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('day_id', day.id)
          .order('sort_order', { ascending: true });
        
        if (activitiesError) {
          console.error(`Error fetching activities for day ${day.id}:`, activitiesError);
        }
        
        // Get meals
        const { data: meals, error: mealsError } = await supabase
          .from('meals')
          .select('*')
          .eq('day_id', day.id);
        
        if (mealsError) {
          console.error(`Error fetching meals for day ${day.id}:`, mealsError);
        }
        
        // Organize meals by type
        const organizedMeals = {
          breakfast: meals?.find((m: any) => m.type === 'breakfast'),
          lunch: meals?.find((m: any) => m.type === 'lunch'),
          dinner: meals?.find((m: any) => m.type === 'dinner')
        };
        
        return {
          ...day,
          activities: activities || [],
          meals: organizedMeals
        };
      }));
      
      return {
        ...itinerary,
        days: daysWithDetails
      };
    } catch (error) {
      console.error('Error in getItinerary:', error);
      return null;
    }
  }
};
