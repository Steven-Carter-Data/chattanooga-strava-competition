# Ironman 70.3 Training Championship - Bourbon Chasers

## Project Overview

A gamified heart-rate-zone-based competition app for the "Bourbon Chasers" friend group preparing for Ironman 70.3 Chattanooga. The app integrates with Strava to track training activities, calculate points based on time spent in heart rate zones, and display competitive leaderboards.

**Competition Period:** January 1 - March 31, 2026
**Testing Period:** November 19 - December 31, 2025
**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (PostgreSQL), Vercel

## Core Concept

Athletes earn points based on time spent in different heart rate zones during training activities:
- **Zone 1** (50-60% max HR): 1 point/minute
- **Zone 2** (60-70% max HR): 2 points/minute
- **Zone 3** (70-80% max HR): 3 points/minute
- **Zone 4** (80-90% max HR): 4 points/minute
- **Zone 5** (90-100% max HR): 5 points/minute

All activity data, including custom heart rate zone boundaries, comes from Strava and is stored in Supabase for display and competition tracking.

---

## Architecture & Data Flow

```
Strava Activity Recording
    ↓
Strava Webhook Event → /api/strava/webhook
    ↓
Fetch Activity Details + HR Streams from Strava API
    ↓
Store in Supabase:
  - athletes table (profile + custom HR zones)
  - activities table (activity details + zone_points)
  - heart_rate_zones table (time in each zone)
    ↓
Database Triggers Auto-Calculate:
  - in_competition_window flag
  - zone_points from zone times
    ↓
Frontend Queries Leaderboard & Athlete Details
    ↓
Display Real-Time Competition Results
```

---

## Project Structure

```
project-root/
├── app/
│   ├── layout.tsx                    # Root layout with metadata
│   ├── page.tsx                      # Leaderboard (main page)
│   ├── athlete/[id]/page.tsx         # Athlete detail dashboard
│   └── api/
│       ├── auth/strava/
│       │   ├── route.ts              # OAuth initiation
│       │   └── callback/route.ts     # OAuth callback handler
│       ├── leaderboard/route.ts      # GET leaderboard data
│       ├── athlete/[id]/route.ts     # GET athlete details & stats
│       ├── sync/[athleteId]/route.ts # POST manual sync endpoint
│       ├── strava/webhook/route.ts   # Webhook verification & events
│       └── test/route.ts             # Connection test
├── lib/
│   ├── types.ts                      # TypeScript interfaces
│   ├── supabase.ts                   # Supabase client initialization
│   ├── strava.ts                     # Core Strava API functions
│   └── strava-zones.ts               # HR zone calculation logic
├── public/images/                    # Static assets (logos)
├── schema_draft.sql                  # Main database schema
├── schema_update_tokens.sql          # Token table migration
├── add-hr-zones-column.sql           # HR zones column migration
├── reset-for-testing.sql             # Testing data reset script
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── .env.example
```

---

## Database Schema

### Tables

#### `athletes`
Stores athlete profile information and custom heart rate zone configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `strava_athlete_id` | bigint | Unique Strava athlete ID |
| `firstname` | text | Athlete first name |
| `lastname` | text | Athlete last name |
| `profile_image_url` | text | Profile image URL from Strava |
| `hr_zones` | jsonb | Custom HR zone configuration from Strava (athlete-specific) |
| `created_at` | timestamptz | Record creation timestamp |

**HR Zones Format (Athlete-Specific):**

Each athlete has unique HR zone boundaries fetched from their Strava profile. These boundaries are based on each athlete's individual max heart rate and fitness level.

```json
{
  "custom_zones": true,
  "zones": [
    { "min": 0, "max": 138 },      // Zone 1 boundaries (example)
    { "min": 138, "max": 155 },    // Zone 2 boundaries (example)
    { "min": 155, "max": 172 },    // Zone 3 boundaries (example)
    { "min": 172, "max": 189 },    // Zone 4 boundaries (example)
    { "min": 189, "max": 220 }     // Zone 5 boundaries (example)
  ]
}
```

**Important:** The zone boundaries shown above are just an example format. Each athlete will have completely different values based on their personal max HR and Strava zone configuration. The app fetches these custom zones from the Strava API for each athlete during OAuth authentication and sync operations.

#### `activities`
Stores activity details from Strava with pre-calculated zone points.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `strava_activity_id` | bigint | Unique Strava activity ID |
| `athlete_id` | uuid | Foreign key to athletes |
| `name` | text | Activity name |
| `sport_type` | text | Activity type (Run, Ride, Swim, etc.) |
| `start_date` | timestamptz | Activity start date/time |
| `distance_m` | numeric | Distance in meters |
| `moving_time_s` | integer | Moving time in seconds |
| `elapsed_time_s` | integer | Total elapsed time in seconds |
| `average_heartrate` | numeric | Average heart rate |
| `max_heartrate` | numeric | Maximum heart rate |
| `average_speed_mps` | numeric | Average speed in meters per second |
| `total_elevation_gain_m` | numeric | Total elevation gain in meters |
| `zone_points` | numeric | Pre-calculated competition points |
| `in_competition_window` | boolean | Auto-set by trigger based on dates |
| `raw_payload` | jsonb | Raw Strava activity JSON |
| `created_at` | timestamptz | Record creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

#### `heart_rate_zones`
Stores time spent in each heart rate zone for each activity.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `activity_id` | uuid | Foreign key to activities (cascading delete) |
| `zone_1_time_s` | integer | Time in zone 1 (seconds) |
| `zone_2_time_s` | integer | Time in zone 2 (seconds) |
| `zone_3_time_s` | integer | Time in zone 3 (seconds) |
| `zone_4_time_s` | integer | Time in zone 4 (seconds) |
| `zone_5_time_s` | integer | Time in zone 5 (seconds) |
| `created_at` | timestamptz | Record creation timestamp |

#### `athlete_tokens`
Stores OAuth tokens for Strava API access.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `athlete_id` | uuid | Foreign key to athletes (unique) |
| `access_token` | text | Strava access token |
| `refresh_token` | text | Strava refresh token |
| `expires_at` | timestamptz | Token expiration timestamp |
| `scope` | text | OAuth scope granted |
| `created_at` | timestamptz | Record creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

#### `competition_config`
Stores competition date ranges and active status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Competition name |
| `start_date` | timestamptz | Competition start date |
| `end_date` | timestamptz | Competition end date |
| `is_active` | boolean | Active status (only one active at a time) |
| `created_at` | timestamptz | Record creation timestamp |

### Views

#### `leaderboard_points`
Aggregated leaderboard view with total points per athlete.

```sql
SELECT
  a.athlete_id,
  ath.firstname,
  ath.lastname,
  ath.profile_image_url,
  SUM(a.zone_points) as total_points,
  COUNT(a.id) as activity_count
FROM activities a
JOIN athletes ath ON a.athlete_id = ath.id
WHERE a.in_competition_window = true
GROUP BY a.athlete_id, ath.firstname, ath.lastname, ath.profile_image_url
ORDER BY total_points DESC
```

#### `activity_detail`
Complete activity information joined with athlete and HR zone data.

```sql
SELECT
  a.*,
  ath.firstname,
  ath.lastname,
  ath.profile_image_url,
  hrz.zone_1_time_s,
  hrz.zone_2_time_s,
  hrz.zone_3_time_s,
  hrz.zone_4_time_s,
  hrz.zone_5_time_s
FROM activities a
LEFT JOIN athletes ath ON a.athlete_id = ath.id
LEFT JOIN heart_rate_zones hrz ON a.id = hrz.activity_id
```

### Database Functions & Triggers

#### `set_activity_competition_flag()`
Automatically sets the `in_competition_window` flag based on active competition dates.

**Trigger:** `trg_set_activity_competition_flag` (BEFORE INSERT OR UPDATE on activities)

#### `update_activity_zone_points()`
Calculates and updates `zone_points` on the activity record based on heart rate zone times.

**Formula:** `zone_points = SUM((zone_X_time_s / 60) * X)`

**Trigger:** `trg_update_activity_zone_points` (AFTER INSERT OR UPDATE on heart_rate_zones)

---

## Key Files & Functionality

### Core Library Files

#### [lib/types.ts](lib/types.ts)
TypeScript interfaces for all data structures:
- `Athlete`, `Activity`, `HeartRateZones`, `CompetitionConfig` - Database models
- `LeaderboardEntry`, `ActivityDetail` - View types
- `StravaWebhookEvent`, `StravaActivity`, `StravaHeartRateStream` - Strava API types

#### [lib/supabase.ts](lib/supabase.ts)
Supabase client initialization:
- `supabase` - Anon key client for client-side operations
- `supabaseAdmin` - Service role key for privileged server-side operations

#### [lib/strava.ts](lib/strava.ts)
Core Strava API integration functions:
- `fetchStravaActivity(activityId, accessToken)` - Fetch detailed activity data
- `fetchHeartRateStream(activityId, accessToken)` - Fetch HR time series data
- `calculateHRZones(hrData, maxHR)` - Calculate zone times (percentage-based fallback)
- `calculateZonePoints(zones)` - Convert zone times to competition points
- `getAthleteAccessToken(stravaAthleteId)` - Retrieve and refresh access tokens
- `refreshAccessToken(refreshToken, athleteId)` - Refresh expired OAuth tokens

#### [lib/strava-zones.ts](lib/strava-zones.ts)
Custom HR zone calculation using Strava's zone boundaries:
- `fetchAthleteZones(accessToken)` - Fetch athlete's custom zone config from Strava
- `calculateHRZonesWithCustomBoundaries(hrData, timeData, zones)` - Calculate zone times using athlete's custom boundaries (matches Strava exactly)

**Key Innovation:** Uses athlete's custom zone boundaries from Strava API instead of percentage-based calculations, ensuring exact match with Strava's zone calculations.

### API Routes

#### [app/api/auth/strava/route.ts](app/api/auth/strava/route.ts)
Initiates OAuth flow by redirecting to Strava authorization page.
- **Scopes:** `activity:read_all,read`

#### [app/api/auth/strava/callback/route.ts](app/api/auth/strava/callback/route.ts)
OAuth callback handler:
1. Exchanges authorization code for access/refresh tokens
2. Stores athlete profile in `athletes` table
3. Stores tokens in `athlete_tokens` table
4. Redirects to leaderboard with success message

#### [app/api/leaderboard/route.ts](app/api/leaderboard/route.ts)
**GET** - Returns leaderboard data sorted by total points
- Queries all athletes with aggregated zone_points
- Only includes activities with `in_competition_window = true`
- Returns: `{ success: true, data: LeaderboardEntry[], count: number }`

#### [app/api/athlete/[id]/route.ts](app/api/athlete/[id]/route.ts)
**GET** - Returns detailed athlete statistics:
- Athlete profile info + HR zones configuration
- Total points and activity count
- Sport breakdown (activities, points, distance, time per sport type)
- Weekly stats breakdown
- Zone distribution (time spent in each zone)
- Recent activities (10 most recent)

#### [app/api/sync/[athleteId]/route.ts](app/api/sync/[athleteId]/route.ts)
**POST** - Manual sync endpoint (workaround for webhook issues):
1. Retrieves athlete's access token
2. Fetches athlete's HR zone configuration from Strava
3. Queries Strava API for activities after competition start date
4. For each activity:
   - Inserts or updates activity record
   - Fetches HR stream data
   - Calculates zone times (custom boundaries if available, fallback to max HR %)
   - Inserts or updates heart_rate_zones record
5. Returns sync count, skipped count, and error details

**Two Calculation Methods:**
- **Primary:** `calculateHRZonesWithCustomBoundaries` - uses athlete's custom zone boundaries from Strava
- **Fallback:** `calculateSimpleZones` - uses max HR percentage if custom zones unavailable

#### [app/api/strava/webhook/route.ts](app/api/strava/webhook/route.ts)
Strava webhook endpoint:
- **GET** - Webhook verification (responds with `hub.challenge`)
- **POST** - Handles webhook events:
  - **activity.create** / **activity.update**: Fetches activity data, stores in database, calculates HR zones
  - **activity.delete**: Removes activity record (cascades to HR zones)

#### [app/api/test/route.ts](app/api/test/route.ts)
**GET** - Simple connection test for Supabase connectivity

### Frontend Pages

#### [app/page.tsx](app/page.tsx) - Leaderboard (Main Page)
Main competition page featuring:
- Hero section with Ironman branding
- "Join Competition" card with Strava OAuth button
- Leaderboard table:
  - Rank display (medals for top 3, numbers for rest)
  - Athlete name (links to detail page)
  - Total points
  - Activity count
  - Individual sync button for each athlete
- Info cards explaining scoring system
- Real-time sync feedback messages
- Responsive design with Tailwind CSS

#### [app/athlete/[id]/page.tsx](app/athlete/[id]/page.tsx) - Athlete Detail Dashboard
Detailed athlete statistics page:
- Back button to leaderboard
- Hero header with athlete profile image
- Summary cards: Total Points, Total Activities
- Manual sync button
- **HR Zone Configuration Display** (if available from Strava):
  - Shows whether using custom or auto zones
  - Displays all 5 zone boundaries (min-max bpm)
- **HR Zone Distribution**:
  - Color-coded progress bars (blue → red)
  - Time in minutes and percentage for each zone
  - Zone boundaries displayed
- **Sport Breakdown**:
  - Card per sport type (Swim, Run, Bike, etc.)
  - Stats: activity count, total points, distance, time
- **Recent Activities**:
  - Activity cards with name, sport, date
  - Zone points, distance, time, average HR
  - 10 most recent activities

#### [app/layout.tsx](app/layout.tsx)
Root layout applying global styles and metadata.

---

## Authentication & Authorization

### OAuth 2.0 Flow

1. **User clicks "Connect with Strava"** → `/api/auth/strava`
2. **Backend redirects to Strava** with:
   - `client_id`, `redirect_uri`, `response_type=code`
   - `scope=activity:read_all,read,profile:read_all`
   - `approval_prompt=force`
3. **User authorizes on Strava** → Strava returns authorization code
4. **Callback handler exchanges code for tokens** → POST to Strava OAuth endpoint
5. **Store in database**:
   - Upsert athlete to `athletes` table
   - Upsert tokens to `athlete_tokens` table
6. **Redirect to home** with success message

### Token Management

- **Access tokens** stored in `athlete_tokens.access_token`
- **Refresh tokens** stored in `athlete_tokens.refresh_token`
- **Expiration tracked** in `athlete_tokens.expires_at`
- **Auto-refresh** in `getAthleteAccessToken()`:
  - Proactively refreshes if expiring within 1 hour
  - Updates stored tokens in database

### Authorization Strategy

- **Public endpoints** (leaderboard, athlete details) - no auth required
- **Sync endpoint** requires athlete access token
- **Service role key** for privileged database operations (server-side only)
- **Anon key** for public queries (client-side safe)

---

## Heart Rate Zone Calculation

### Two Calculation Methods

#### Method 1: Custom Zone Boundaries (Preferred)
**Function:** `calculateHRZonesWithCustomBoundaries()` in [lib/strava-zones.ts](lib/strava-zones.ts)

Uses athlete's custom zone configuration from Strava API. Each zone has `min` and `max` boundaries in bpm.

**Algorithm:**
```typescript
for each HR data point:
  duration = time[i+1] - time[i]  // seconds between readings

  if HR >= zone[0].min && HR < zone[1].min → zone_1
  else if HR >= zone[1].min && HR < zone[2].min → zone_2
  else if HR >= zone[2].min && HR < zone[3].min → zone_3
  else if HR >= zone[3].min && HR < zone[4].min → zone_4
  else if HR >= zone[4].min && HR <= zone[4].max → zone_5
```

**Returns:** `{ zone_1, zone_2, zone_3, zone_4, zone_5 }` in seconds

**Key Advantage:** Matches Strava's calculation exactly using athlete's personal zone boundaries.

#### Method 2: Max HR Percentage (Fallback)
**Function:** `calculateSimpleZones()` in [app/api/sync/[athleteId]/route.ts](app/api/sync/[athleteId]/route.ts)

Uses athlete's max HR from activity to calculate percentage-based zones.

**Boundaries:**
- Zone 1: < 60%
- Zone 2: 60-70%
- Zone 3: 70-80%
- Zone 4: 80-90%
- Zone 5: ≥ 90%

**Used when:** Custom zone boundaries are not available from Strava.

### Zone Data Retrieval & Storage

1. **Fetch from Strava:** `fetchAthleteZones(accessToken)` → [lib/strava-zones.ts:3](lib/strava-zones.ts#L3)
2. **Store in database:** `athletes.hr_zones` (JSONB column)
3. **Display on athlete page:** Zone configuration card showing custom/auto and boundaries

### Points Calculation

**Formula:** `zone_points = Σ((zone_X_time_s / 60) * X)`

**Example:** 300 seconds in zone 3 = (300/60) * 3 = 15 points

**Calculated:** Automatically by database trigger after HR zones inserted
**Stored:** In `activities.zone_points` for fast leaderboard queries

---

## Strava API Integration

### OAuth Configuration
- **Client ID & Secret:** From Strava API app settings
- **Webhook Verify Token:** Custom string for webhook security
- **OAuth Scopes Required:**
  - `activity:read_all` - Read all activities including private ones
  - `read` - Read basic athlete profile information
  - `profile:read_all` - **Required to fetch athlete's custom HR zone boundaries**

**Important:** The `profile:read_all` scope is critical for accurate zone calculation. Without it, the app falls back to percentage-based zone calculation (60%, 70%, 80%, 90% of max HR) which will NOT match Strava's zone times. Each athlete must authenticate with all three scopes to ensure their personal zone boundaries are fetched and used for calculations.

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /oauth/authorize` | Initiate OAuth flow |
| `POST /oauth/token` | Exchange code for tokens, refresh tokens |
| `GET /api/v3/athlete/zones` | Fetch athlete's HR zone configuration |
| `GET /api/v3/activities` | List athlete's activities (with filtering) |
| `GET /api/v3/activities/{id}` | Fetch detailed activity data |
| `GET /api/v3/activities/{id}/streams` | Fetch HR and time series data |

### Webhook System

**Verification (GET):**
- Strava sends: `hub.mode=subscribe`, `hub.challenge`, `hub.verify_token`
- Respond with: `{ "hub.challenge": challenge }`

**Event Handling (POST):**
- Receives: `{ object_type, object_id, aspect_type, owner_id, ... }`
- Processes: `activity.create`, `activity.update`, `activity.delete`
- Fetches full data from Strava API
- Stores normalized data in Supabase

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Strava OAuth
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abc123...

# Webhook
STRAVA_WEBHOOK_VERIFY_TOKEN=randomstring123
```

### Setup Steps

1. **Create Supabase project** at https://supabase.com
2. **Run database schema:**
   - Execute [schema_draft.sql](schema_draft.sql) in SQL editor
   - Execute [schema_update_tokens.sql](schema_update_tokens.sql)
   - Execute [add-hr-zones-column.sql](add-hr-zones-column.sql)
3. **Create Strava API app** at https://www.strava.com/settings/api
4. **Configure OAuth redirect URI:** `{app-url}/api/auth/strava/callback`
5. **Configure webhook URL:** `{app-url}/api/strava/webhook`
6. **Copy credentials to `.env.local`**
7. **Deploy to Vercel** and set environment variables in project settings

### Local Development

```bash
npm install
npm run dev  # Runs on http://localhost:3000
```

---

## Key Technical Features

### Smart Database Design
- **Triggers automate calculations** - No manual recalculation needed
- **Pre-computed zone_points** - Fast leaderboard queries
- **Competition window flag** - Easy filtering for active competitions
- **Cascading deletes** - Deleting activity auto-deletes HR zones

### Dual Zone Calculation Methods
- **Primary:** Custom zone boundaries from Strava (accurate)
- **Fallback:** Max HR percentage (when custom config unavailable)
- Both methods seamlessly integrated in sync endpoint

### OAuth Best Practices
- **Service role key** for privileged operations (server-side only)
- **Anon key** for public queries (client-side safe)
- **Token refresh** proactively manages expiration
- **Secure storage** in database with timestamps

### Performance Optimizations
- **Precomputed points** avoid expensive aggregations on every query
- **Database views** for fast leaderboard queries
- **Indexed columns** on athlete_id, start_date, in_competition_window
- **Limited historical data** (90 days or competition start date)

### Error Resilience
- **Fallback calculations** if Strava zones unavailable
- **Detailed error logging** for debugging
- **Graceful failures** in webhook handler
- **Manual sync option** if webhooks fail

---

## Testing & Development

### Current State
- **Main branch:** Clean (no uncommitted changes)
- **Testing period:** November 19 - December 31, 2025
- **Competition period:** January 1 - March 31, 2026

### Testing Data Reset

Use [reset-for-testing.sql](reset-for-testing.sql) to clear test data:
```sql
TRUNCATE TABLE heart_rate_zones CASCADE;
TRUNCATE TABLE activities CASCADE;
UPDATE competition_config
SET start_date = '2025-11-19', end_date = '2025-12-31';
```

### Manual Sync Endpoint

Use when webhooks are not working:
```bash
POST /api/sync/[athleteId]
```

This endpoint:
1. Fetches athlete's recent activities from Strava
2. Calculates HR zones using custom boundaries
3. Updates database with all activity data
4. Returns sync statistics

---

## Recent Development History

### HR Zone Calculation Refinement
- Implemented custom zone boundaries matching Strava exactly
- Added [lib/strava-zones.ts](lib/strava-zones.ts) with `calculateHRZonesWithCustomBoundaries()`
- Athlete page now displays HR zone configuration
- Uses time series data for accurate duration calculation

### Token Management
- Fixed athlete_tokens table schema
- Proper OAuth token refresh implementation
- Proactive token refresh before expiration

### Testing Infrastructure
- Added date filtering for testing periods
- Manual sync endpoint as webhook workaround
- Competition window date validation

### UI/UX Improvements
- Leaderboard sync buttons with real-time feedback
- Athlete detail dashboards with comprehensive stats
- Sport breakdown by discipline
- Zone distribution visualization

---

## Future Enhancements (Potential)

- **Weekly/Monthly leaderboards** - Add time-based filtering
- **Activity insights** - Charts showing zone distribution trends over time
- **Push notifications** - Alert athletes when they drop in rankings
- **Social features** - Activity comments and kudos
- **Goal tracking** - Set and track personal zone time goals
- **Export functionality** - Download competition history as CSV
- **Multiple competitions** - Support for concurrent or sequential competitions
- **Team competitions** - Group athletes into teams with aggregate scoring

---

## Support & Documentation

- **Strava API Docs:** https://developers.strava.com/docs/reference/
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Deployment:** https://vercel.com/docs

---

## Project Metadata

- **Created:** 2025
- **Current Version:** In active development
- **License:** Private (friend group use)
- **Repository:** Local development (not public)
