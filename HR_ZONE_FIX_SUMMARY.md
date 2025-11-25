# Heart Rate Zone Data Fix - Summary

## Problem Identified

The heart rate zone data in the database **does not match** what Strava shows because:

1. ❌ The app was using **percentage-based zone calculation** (fallback method)
2. ❌ OAuth scope was missing `profile:read_all` permission
3. ❌ Could not fetch **athlete-specific custom zone boundaries** from Strava
4. ❌ Each athlete has unique zones, but app was calculating zones based on activity max HR percentages

### Why This Matters

Each athlete has **different HR zone boundaries** based on their individual max heart rate and fitness level. For example:

**Your zones (approximate):**
- Zone 2: 138-155 bpm
- Zone 3: 155-172 bpm

**Fallback calculation was using:**
- For activity with max HR 150: Zone 3 = 105-120 bpm (70-80% of 150)
- For activity with max HR 172: Zone 3 = 120-138 bpm (70-80% of 172)

This creates **completely incorrect zone times** that don't match what Strava displays!

---

## Root Cause

### Missing OAuth Scope

**Before:** `scope=activity:read_all,read`
**After:** `scope=activity:read_all,read,profile:read_all`

Without `profile:read_all`, the app cannot call `GET /api/v3/athlete/zones` to fetch your custom zone configuration.

---

## What Was Fixed

### 1. Updated OAuth Scope
**File:** [app/api/auth/strava/route.ts](app/api/auth/strava/route.ts:15)

```typescript
// OLD
const scope = 'activity:read_all,read';

// NEW
const scope = 'activity:read_all,read,profile:read_all';
```

### 2. Updated Documentation
**File:** [claude.md](claude.md)

- Clarified that HR zone boundaries are **athlete-specific**
- Added warning about the `profile:read_all` scope requirement
- Explained fallback vs. custom zone calculation methods

---

## How to Verify the Fix

### Step 1: Re-authenticate with Strava

The dev server is running at: **http://localhost:3005**

1. **Open the app:** http://localhost:3005
2. **Click "Connect with Strava"** button
3. **Authorize the app** - you'll see it now requests `profile:read_all` permission
4. **Wait for redirect** back to the app

### Step 2: Verify Zone Data is Fetched

Run this command to check if your zones were stored:

```bash
node check-zones.js
```

You should see:
```
Athlete: Steven Carter
HR Zones: {
  "custom_zones": true,
  "zones": [
    { "min": 0, "max": 138 },
    { "min": 138, "max": 155 },
    ...
  ]
}
```

### Step 3: Re-sync Your Activities

On the app at http://localhost:3005:
1. Find your name on the leaderboard
2. Click the **"Sync"** button next to your name
3. Wait for sync to complete

OR use the browser directly:
- Open http://localhost:3005
- Click the sync button for your athlete row

### Step 4: Verify Corrected Zone Calculations

Run the analysis script:

```bash
node analyze-zone-issue.js
```

This will show:
- Your custom zone boundaries from Strava
- Recalculated zone times using YOUR zones
- Comparison with database values
- Should now show that calculations match Strava

### Step 5: Check Database Values

```bash
node check-zones.js
```

Compare the zone times in the database with what Strava shows at:
- https://www.strava.com/activities/16508595128
- https://www.strava.com/activities/16507818452

They should now **match exactly**!

---

## Technical Details

### Zone Calculation Flow (After Fix)

```
1. Athlete authenticates → OAuth with profile:read_all scope
                          ↓
2. Fetch athlete zones → GET /api/v3/athlete/zones
                          ↓
3. Store in database → athletes.hr_zones (JSONB)
                          ↓
4. Sync activities → POST /api/sync/[athleteId]
                          ↓
5. For each activity:
   - Fetch HR stream data
   - Use calculateHRZonesWithCustomBoundaries()
   - Apply athlete's custom zone boundaries
   - Store accurate zone times
                          ↓
6. Database trigger → Calculate zone_points
                          ↓
7. Display on leaderboard → Accurate points!
```

### Custom vs Fallback Methods

**Custom Boundaries (Now Working):**
```typescript
// Uses athlete's actual zones from Strava
if (hr >= 138 && hr < 155) → Zone 2
if (hr >= 155 && hr < 172) → Zone 3
// etc.
```

**Fallback (Old Way):**
```typescript
// Uses percentage of activity's max HR
const hrPercent = (hr / maxHR) * 100;
if (hrPercent >= 60 && hrPercent < 70) → Zone 2
if (hrPercent >= 70 && hrPercent < 80) → Zone 3
// WRONG! Each activity has different max HR
```

---

## For Other Athletes

When other athletes join the competition:

1. They must authenticate with the app
2. App automatically fetches **their unique zone boundaries**
3. All calculations use **their personal zones**
4. No manual configuration needed!

Each athlete's zones are stored independently in the `athletes.hr_zones` column.

---

## Verification Checklist

- [ ] Dev server running at http://localhost:3005
- [ ] Re-authenticated with Strava (with new scope)
- [ ] `athletes.hr_zones` column populated with your zones
- [ ] Activities re-synced
- [ ] Zone times in database match Strava
- [ ] Points on leaderboard are accurate
- [ ] Athlete detail page shows correct zone distribution

---

## Need Help?

If zone data still doesn't match after following these steps:

1. Check the browser console for errors during sync
2. Run `node debug-zones.js` to verify token has correct scope
3. Verify your Strava profile actually has HR zones configured
4. Check that activities have HR data (some activities may not have HR streams)

---

## Files Modified

- ✅ [app/api/auth/strava/route.ts](app/api/auth/strava/route.ts) - Added `profile:read_all` scope
- ✅ [claude.md](claude.md) - Updated documentation to clarify athlete-specific zones

## Files for Testing

- `check-zones.js` - View current database zone data
- `test-strava-zones.js` - Compare calculations with Strava API
- `check-token.js` - Verify and refresh access token
- `debug-zones.js` - Debug token permissions and API access
- `analyze-zone-issue.js` - Detailed zone calculation analysis
