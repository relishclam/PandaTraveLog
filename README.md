# 🐼 PandaTraveLog - AI-Powered Travel Planning Application

PandaTraveLog is a comprehensive travel planning application featuring PO, a friendly panda mascot who assists users in creating personalized itineraries and exploring travel destinations.

![PandaTraveLog Logo](/public/images/logo/logo-full.png)

## ✨ Features

- **User Authentication**: Secure sign-up and login with Supabase, including phone verification via Twilio OTP
- **Trip Planning**: Create and manage trips with detailed information
- **AI-Generated Content**: Generate personalized travel recommendations and itineraries using Gemini AI
- **Google Maps Integration**: Search for locations and view them on interactive maps
- **Companion Management**: Keep track of who's traveling with you
- **Emergency Contacts**: Store important contact information for each trip
- **Responsive Design**: Works seamlessly on both desktop and mobile devices

## 🚀 Tech Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Authentication**: Supabase Auth with Twilio OTP verification
- **Database**: Supabase PostgreSQL
- **Maps**: Google Maps and Places APIs
- **AI**: Gemini API for content generation
- **Deployment**: Netlify

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account
- Twilio account with Verify service
- Google Maps API key
- Gemini API key

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/pandatravelog.git
cd pandatravelog
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add the necessary environment variables (see `.env.example` for reference)

4. Initialize the Supabase database schema using the provided `supabase-schema.sql` file

5. Run the development server

```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) to see the application

## 📝 Database Schema

The application uses the following database tables:

- **profiles**: User profile information
- **trips**: Trip details and metadata
- **trip_places**: Places to visit during a trip
- **trip_itinerary**: AI-generated itinerary content
- **trip_companions**: People traveling with the user
- **trip_emergency_contacts**: Emergency contacts for the trip

## 🌐 Deployment

The application is configured for deployment on Netlify. A `netlify.toml` configuration file is included in the repository.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License

This project is licensed under the MIT License.
