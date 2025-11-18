# Ironman 70.3 Training Championship

Gamified HR-zone-based Strava competition for Ironman 70.3 training (January 1 - March 31, 2026).

## Tech Stack

- **Frontend**: Next.js 15 (React) with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Vercel API Routes (Serverless)
- **Database**: Supabase (PostgreSQL)
- **External API**: Strava API (OAuth2 + Webhooks)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Strava API application (OAuth credentials)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL from `schema_draft.sql` in the Supabase SQL Editor
   - Copy your project URL and anon key

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase and Strava credentials.

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Leaderboard (home page)
│   ├── athlete/[id]/       # Athlete detail pages
│   └── api/                # API routes
│       ├── leaderboard/    # Leaderboard endpoint
│       └── strava/
│           └── webhook/    # Strava webhook handler
├── lib/
│   └── supabase.ts         # Supabase client
├── schema_draft.sql        # Database schema
└── architecture_spec_draft.json  # Architecture documentation
```

## Scoring System

Points are awarded based on time spent in heart rate zones:
- Zone 1: 1 point/minute
- Zone 2: 2 points/minute
- Zone 3: 3 points/minute
- Zone 4: 4 points/minute
- Zone 5: 5 points/minute

## Deployment

Deploy to Vercel:
```bash
vercel
```

Make sure to set environment variables in your Vercel project settings.

## License

Private - For competition use only
