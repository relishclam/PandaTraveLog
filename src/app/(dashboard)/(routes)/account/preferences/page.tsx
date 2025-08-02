'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { 
  Settings, 
  Bell, 
  Globe, 
  Shield, 
  Moon, 
  Mail,
  Smartphone,
  Save
} from 'lucide-react';

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState({
    notifications: {
      email: true,
      push: false,
      tripReminders: true,
      weatherAlerts: true,
    },
    privacy: {
      profileVisibility: 'private',
      shareLocation: false,
      dataCollection: true,
    },
    appearance: {
      theme: 'light',
      language: 'en',
    },
    travel: {
      currency: 'USD',
      units: 'metric',
      timezone: 'auto',
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // Show success message or handle actual save
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-backpack-orange" />
        <h1 className="text-2xl font-bold text-gray-900">Preferences</h1>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive trip updates via email</p>
            </div>
            <Switch
              checked={preferences.notifications.email}
              onCheckedChange={(checked: boolean) => 
                setPreferences(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, email: checked }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-500">Get instant notifications on your device</p>
            </div>
            <Switch
              checked={preferences.notifications.push}
              onCheckedChange={(checked: boolean) => 
                setPreferences(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, push: checked }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Trip Reminders</p>
              <p className="text-sm text-gray-500">Reminders for upcoming trips and activities</p>
            </div>
            <Switch
              checked={preferences.notifications.tripReminders}
              onCheckedChange={(checked: boolean) => 
                setPreferences(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, tripReminders: checked }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weather Alerts</p>
              <p className="text-sm text-gray-500">Get notified about weather changes at your destinations</p>
            </div>
            <Switch
              checked={preferences.notifications.weatherAlerts}
              onCheckedChange={(checked: boolean) => 
                setPreferences(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, weatherAlerts: checked }
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Profile Visibility</label>
            <select 
              value={preferences.privacy.profileVisibility}
              onChange={(e) => 
                setPreferences(prev => ({
                  ...prev,
                  privacy: { ...prev.privacy, profileVisibility: e.target.value }
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-backpack-orange"
            >
              <option value="private">Private</option>
              <option value="friends">Friends Only</option>
              <option value="public">Public</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Share Location</p>
              <p className="text-sm text-gray-500">Allow PO Assistant to access your location for better suggestions</p>
            </div>
            <Switch
              checked={preferences.privacy.shareLocation}
              onCheckedChange={(checked: boolean) => 
                setPreferences(prev => ({
                  ...prev,
                  privacy: { ...prev.privacy, shareLocation: checked }
                }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Usage Analytics</p>
              <p className="text-sm text-gray-500">Help improve the app by sharing anonymous usage data</p>
            </div>
            <Switch
              checked={preferences.privacy.dataCollection}
              onCheckedChange={(checked: boolean) => 
                setPreferences(prev => ({
                  ...prev,
                  privacy: { ...prev.privacy, dataCollection: checked }
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-600" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <select 
              value={preferences.appearance.theme}
              onChange={(e) => 
                setPreferences(prev => ({
                  ...prev,
                  appearance: { ...prev.appearance, theme: e.target.value }
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-backpack-orange"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select 
              value={preferences.appearance.language}
              onChange={(e) => 
                setPreferences(prev => ({
                  ...prev,
                  appearance: { ...prev.appearance, language: e.target.value }
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-backpack-orange"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Travel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-orange-600" />
            Travel Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default Currency</label>
            <select 
              value={preferences.travel.currency}
              onChange={(e) => 
                setPreferences(prev => ({
                  ...prev,
                  travel: { ...prev.travel, currency: e.target.value }
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-backpack-orange"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Units</label>
            <select 
              value={preferences.travel.units}
              onChange={(e) => 
                setPreferences(prev => ({
                  ...prev,
                  travel: { ...prev.travel, units: e.target.value }
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-backpack-orange"
            >
              <option value="metric">Metric (km, °C)</option>
              <option value="imperial">Imperial (miles, °F)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Timezone</label>
            <select 
              value={preferences.travel.timezone}
              onChange={(e) => 
                setPreferences(prev => ({
                  ...prev,
                  travel: { ...prev.travel, timezone: e.target.value }
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-backpack-orange"
            >
              <option value="auto">Auto-detect</option>
              <option value="utc">UTC</option>
              <option value="local">Local Time</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-backpack-orange hover:bg-backpack-orange/90"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
