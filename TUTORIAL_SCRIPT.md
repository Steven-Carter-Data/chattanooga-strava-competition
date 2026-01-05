# Bourbon Chasers App Tutorial Script
## Athlete Detail Page Deep Dive

**Duration:** ~10-12 minutes
**Focus:** Understanding your personal training dashboard, how metrics are calculated, and how to interpret each one
**Tone:** Contemplative, precise, building understanding through careful reasoning

---

## INTRO (45 seconds)

"So. Let's take a moment to really understand what we're looking at here. This is your athlete dashboard—and I want to walk you through it in some detail, because I think there's real value in understanding not just *what* these numbers are, but *how* they're derived."

"Everything you see here flows directly from Strava. Your activities. Your heart rate data. Your personal zone configurations. We're not inventing anything. What we're doing is taking that raw information and applying well-established principles from exercise physiology to surface insights that might otherwise remain hidden in the noise of daily training."

"And I think once you see how transparent these calculations are, you'll find it much easier to trust what the data is telling you. So let's begin."

---

## GETTING TO YOUR DASHBOARD (15 seconds)

"To arrive here, you simply click your name on the leaderboard. And what opens up is, in a sense, a mirror—a reflection of how you've been spending your time and energy over the course of this competition."

---

## SECTION 1: Weekly Progress Chart (2 minutes)

"Let's start with the Weekly Progress chart. This is your point history, week by week, and it tells a story about consistency and effort over time."

### How Points Are Calculated

"But before we look at the chart itself, it's worth pausing to consider how these points actually come into existence. Because the methodology here is quite precise."

"When you complete an activity in Strava—a run, a ride, whatever it might be—and you're wearing a heart rate monitor, Strava captures that data as a stream. A series of heart rate readings, second by second. And what this app does is analyze that stream in its entirety. Each moment of your workout is examined and assigned to a heart rate zone—*your* heart rate zones, as you've configured them in Strava, not some generic formula that ignores your individual physiology."

"The points then follow a simple logic:"
- "Zone 1, your recovery zone: 1 point per minute"
- "Zone 2, endurance: 2 points per minute"
- "Zone 3, tempo: 3 points per minute"
- "Zone 4, threshold: 4 points per minute"
- "Zone 5, VO2 max: 5 points per minute"

"So if you spend 30 minutes in Zone 2 and 30 minutes in Zone 3, the math is straightforward: 60 plus 90 equals 150 points. There's no mystery here. It's just arithmetic applied to physiology."

"Now, swimming presents an interesting problem. Heart rate monitors don't function reliably in water. So the group made a decision—and I think it was the right one—to use a flat multiplier. Four points per minute of swimming. A 30-minute swim yields 120 points. It's a reasonable approximation given the constraints."

### The Chart and Its Features

"The chart itself shows your weekly totals. You can hover over any point to see the precise numbers. And notice the toggle in the upper right: you can view this as weekly points or as a cumulative total. The weekly view reveals your consistency—or lack thereof. The cumulative view shows your trajectory toward the finish line."

"The summary statistics above the chart give you four numbers worth attending to:"

- "**This Week** — What you've earned so far in the current week."
- "**Week Change** — How this week compares to last. A positive number isn't inherently good, nor is a negative number bad. It depends entirely on what you're trying to accomplish."
- "**Avg/Week** — Your baseline. If you're above it, you're having a strong week relative to your own history."
- "**Best Week** — The ceiling you've established. Something to aim for, or at least stay near."

"On the chart, the gold dot marks the current week. The green dot marks your best. Everything else appears in white. Simple visual language for a simple question: where are you, and where have you been?"

---

## SECTION 2: Personal Bests (2.5 minutes)

"The next section is called Personal Bests, and it's really a collection of micro-achievements. Things worth noticing about your own training history."

### Tab 1: Records

"The Records tab surfaces your standout performances:"

- "**Highest Points** — Your single most productive activity by the metric we care about in this competition. The activity that, for whatever combination of duration and intensity, generated the most points."
- "**Longest Activity** — Simply the workout where you spent the most time moving. This comes directly from Strava's moving time field."
- "**Longest Distance** — Your farthest single effort. Strava records this in meters; we convert it to miles for display."

"Below these, you'll find:"
- "**Best Week Ever** — Your highest-scoring week, with dates and activity count."
- "**Activity Streaks** — And this is interesting. Three numbers: your longest streak of consecutive training days, your current streak, and your total active days."

### How Streaks Are Calculated

"The streak calculation is worth understanding. We're looking at calendar days. If you train on Monday, Tuesday, and Wednesday, that's a three-day streak. Miss Thursday, and it resets. We don't use 24-hour windows—so a late-night session on Monday and an early morning session on Tuesday both count as separate days in your streak."

"If you have an active streak going, you'll see a small badge with a flame icon. There's something psychologically powerful about not wanting to break a streak. Use that."

### Tab 2: Zone PRs

"The Zone PRs tab shows your personal records for time spent in each heart rate zone—within a single activity."

"For each zone, you'll see: the zone name, your record time, and which activity produced it."

"What we're doing here is scanning every activity and identifying, for each zone independently, the single session where you accumulated the most time in that zone. A high Zone 2 PR suggests you've done serious aerobic base work. A high Zone 5 PR indicates you've pushed into genuinely uncomfortable territory at some point."

### Tab 3: Milestones

"The Milestones tab tracks your progress toward preset thresholds. Points milestones at 100, 250, 500, 1000, and beyond. Activity counts. Total training hours."

"The app simply compares your cumulative totals to these thresholds and shows you what you've achieved and how far you are from the next one. It's a form of gamification, certainly, but it can be motivating to see concrete markers of progress."

---

## SECTION 3: Training Profile (2 minutes)

"Now we come to the Training Profile. This is a radar chart—sometimes called a spider chart—and it attempts to capture six dimensions of your training in a single visual."

### The Radar Chart

"The logic is straightforward: each axis represents a different aspect of how you train. A larger, more symmetrical shape suggests balanced, well-rounded training. Spikes and valleys reveal where you're strong and where you might be neglecting something."

### The Six Dimensions and How They're Calculated

"Let me explain each dimension and, importantly, how it's actually calculated:"

**1. Volume**
"This is simply how many hours per week you're training, on average. We take your total training time and divide by the number of weeks you've been active. A score of 100 corresponds to 10 or more hours per week. Elite 70.3 athletes often train 15 to 20 hours weekly. Most recreational athletes fall between 6 and 10."

**2. Intensity**
"This measures how hard you train on average, expressed as points per minute. We divide your total zone points by your total training minutes. A score of 100 means you're averaging 3 or more points per minute. If you're doing mostly Zone 2 work—which, for the record, is physiologically quite valuable—you'll see something in the 1.5 to 2.5 range."

**3. Consistency**
"What percentage of days have you trained? We count days with at least one activity, divide by total days, multiply by 100. A score of 100 means you trained on at least two-thirds of available days. Training 4 to 5 days per week typically yields 60 to 70 percent consistency."

**4. Endurance**
"This captures the proportion of your training time spent in Zone 2—the aerobic base-building zone. Zone 2 time divided by total zone time. The famous 80/20 rule suggests that elite endurance athletes spend 80 percent of their training in Zones 1 and 2. This metric reflects that principle."

**5. Power**
"The inverse, in a sense. What proportion of time are you spending in Zone 4 and Zone 5? High-intensity work that builds speed and raises your lactate threshold. For 70.3 preparation, something like 10 to 20 percent in these zones during the build phase is typical."

**6. Variety**
"How many different sport types appear in your training? A count of unique activities. Core triathlon gives you three: swim, bike, run. Add strength work, yoga, rowing, and you increase this score."

### Why This Matters

"These dimensions aren't arbitrary. They reflect principles that exercise scientists have validated over decades. Volume and consistency build aerobic capacity. Zone 2 work develops metabolic efficiency. High-intensity work expands your ceiling. Variety reduces injury risk and builds functional fitness."

---

## SECTION 4: Pace Analysis (2 minutes)

"Pace Analysis tracks your speed trends over time. And speed, of course, is what we ultimately care about on race day."

### How Pace Is Calculated

"The underlying data comes from Strava: distance in meters, moving time in seconds. We convert this to familiar units:"

- "For running: minutes per mile"
- "For cycling: miles per hour"
- "For swimming: minutes per 100 meters"

"We use moving time rather than elapsed time, so stops—at traffic lights, for water, whatever—don't contaminate the calculation."

### The Main Stats

"Four metrics appear prominently:"

**1. Current Avg**
"Your average pace across your five most recent activities in that sport. A snapshot of where you are right now."

**2. Improvement**
"This compares your recent five activities to your first five. The calculation accounts for the fact that, in running and swimming, a *lower* number is better, while in cycling, *higher* is better. A positive green percentage means you're getting faster."

**3. Best**
"Your single fastest effort. The pace PR to chase."

**4. Trend**
"A comparison of your last five activities to the five before that. If you're at least 2 percent faster, the trend shows as improving. At least 2 percent slower, declining. Otherwise, stable."

"The chart shows weekly average pace over 12 weeks. The dashed line indicates your overall trajectory. You can see at a glance whether you're progressing, plateauing, or regressing."

---

## SECTION 5: Training Insights (3 minutes)

"Training Insights is perhaps the most directly relevant section for race preparation. It has two components: Sport Balance and Race Readiness."

### Sport Balance

"The pie chart visualizes how your training time distributes across disciplines:"

- "Blue represents swimming"
- "Amber represents outdoor cycling"
- "Orange represents indoor cycling—trainer work"
- "Green represents running"

### How It's Calculated

"We categorize each activity by its sport type from Strava. Swims go in one bucket. Road rides, gravel rides, mountain bike rides go in outdoor cycling. Virtual rides and trainer workouts go in indoor cycling. Runs—road, trail, treadmill—go in the run bucket."

"Then we calculate each category as a percentage of your total triathlon training time. Other activities—yoga, strength work—are excluded from this particular calculation because we're specifically asking: of your swim-bike-run time, how is it distributed?"

### The Ideal Distribution

"For a 70.3, there's a natural distribution that emerges from the race itself:"
- "The 1.2-mile swim takes roughly 30 to 40 minutes—about 18 percent of race time"
- "The 56-mile bike takes 2.5 to 3.5 hours—about 55 percent"
- "The 13.1-mile run takes 1.5 to 2.5 hours—about 27 percent"

"Training in roughly these proportions isn't a commandment, but it's a reasonable heuristic."

### The Balance Score

"Your Balance Score quantifies how close you are to this ideal. For each discipline, we calculate the absolute deviation from ideal. We subtract the sum of those deviations from 100. A perfect match gives you 100 percent. Large deviations drop your score."

---

### Race Readiness

"The Race Readiness gauge attempts something more ambitious: an overall estimate of your preparedness for race day."

"The semicircular meter is color-coded. Red on the left indicates more work is needed. Yellow suggests you're building your base. Blue means you're on track. Green on the right means you're race ready."

### How It's Calculated

"This is a weighted composite of five factors, each scored from 0 to 100:"

**1. Volume (30% weight)**
"Based on your chronic training load—your 28-day rolling average. A chronic load of 500 or more yields a perfect score. Below that, it scales proportionally."

**2. Balance (20% weight)**
"Your sport balance score, as described above."

**3. Consistency (25% weight)**
"Active days in the last 28 days. Twenty or more active days gives you 100. Fewer days, lower score."

**4. Recovery (15% weight)**
"Based on your Acute:Chronic Workload Ratio, which we'll discuss in detail shortly. A ratio between 0.8 and 1.3 scores highest—that's the optimal zone. Outside that range, your score drops because you're either overreaching or undertraining."

**5. Intensity (10% weight)**
"The percentage of time in Zone 4 and Zone 5. The sweet spot is 10 to 20 percent. Too little high-intensity work, or too much, reduces this score."

"The final calculation is simply: each factor's score multiplied by its weight, then summed. Transparent and reproducible."

"Expand the Readiness Breakdown to see how each factor contributes. And note the Recommendations section—specific suggestions generated by identifying which factors are pulling your score down."

---

## SECTION 6: Training Load (2.5 minutes)

"The final section may be the most important from an injury prevention standpoint. Training Load tells you whether you're training intelligently—pushing hard enough to improve, but not so hard that you break down."

### The Science Behind It

"This is built on a concept called the Acute:Chronic Workload Ratio, developed by sports scientist Tim Gabbett. It's widely used by professional teams and elite athletes to monitor injury risk and optimize training periodization."

"The fundamental insight is this: your body can handle training stress that it has adapted to. Problems emerge when you suddenly do significantly more—or significantly less—than what you're conditioned for. It's the spike that injures, not the load itself."

### How Training Load Is Calculated

"We first calculate a 'load' for each activity by weighting time spent in each zone:"

- "Zone 1: Time multiplied by 1.0"
- "Zone 2: Time multiplied by 1.5"
- "Zone 3: Time multiplied by 2.0"
- "Zone 4: Time multiplied by 3.0"
- "Zone 5: Time multiplied by 4.0"

"So: 30 minutes in Zone 2 plus 15 minutes in Zone 4 equals (30 × 1.5) + (15 × 3.0) = 45 + 45 = 90 load units. Higher zones carry more weight because they impose greater physiological stress."

### Acute and Chronic Load

"We then compute two rolling averages:"

- "**Acute Load**: Average daily load over the last 7 days. Think of this as your current fatigue."
- "**Chronic Load**: Average daily load over the last 28 days. Think of this as your fitness base—what your body has adapted to handle."

### The Workload Ratio

"The Acute:Chronic Workload Ratio is simply acute load divided by chronic load. And the interpretation is well-established:"

- "**Below 0.8**: Undertraining. You're doing less than your body is adapted to. Fine for planned recovery, problematic if sustained."
- "**0.8 to 1.3**: The sweet spot. Training matches fitness. Optimal for steady, sustainable improvement."
- "**1.3 to 1.8**: Productive overreaching. Elevated, but manageable for short periods."
- "**1.8 to 2.2**: Pushing limits. Proceed with caution."
- "**Above 2.2**: Injury risk zone. You're asking your body to do far more than it's prepared for."

"These thresholds are adjusted for endurance athletes. General research suggests tighter ranges, but triathlon training requires sustained higher loads than, say, team sports."

### The Status Card

"The colored status box translates your ratio into plain language:"

- "Green: Optimal zone. ACWR 0.8 to 1.3."
- "Yellow: Pushing hard. ACWR 1.3 to 2.2."
- "Blue: Recovery mode. ACWR below 0.8."
- "Red: Caution. ACWR above 2.2."

### Why This Matters

"The research is quite clear: athletes who consistently push their ACWR above 1.5 experience significantly higher injury rates. But athletes who never push above 1.0 don't improve as rapidly as they could."

"The key is strategic variation. Most weeks in the 0.8 to 1.3 range. Occasional planned hard weeks pushing toward 1.5. Then recovery weeks dropping below 0.8. This isn't about training less—it's about training intelligently and giving your body the time it needs to adapt to the stress you're imposing."

---

## CLOSING (45 seconds)

"So. That's your athlete dashboard. Every number you see emerges from actual data—your Strava activities, your personal heart rate zones, and calculations grounded in exercise physiology."

"Here's how I'd suggest using each section:"

1. "**Weekly Progress** — Attend to consistency. Week over week, are you showing up?"
2. "**Personal Bests** — Establish benchmarks. Then try to surpass them."
3. "**Training Profile** — Identify imbalances. Where are you strong? Where are you neglecting something?"
4. "**Pace Analysis** — Track whether you're actually getting faster."
5. "**Training Insights** — Balance your disciplines. Monitor your readiness for race day."
6. "**Training Load** — Perhaps most importantly: ensure you're training hard enough to adapt, but not so hard that you injure yourself."

"The calculations are transparent. You now understand exactly how each metric is derived. Trust the data. Listen to your body. And use these tools to train more intelligently than you otherwise would."

"Check back regularly. Watch how your numbers evolve. Train smart. Train hard. And let's see what we're capable of in Chattanooga."

---

## SCREEN RECORDING NOTES

**Suggested visual flow:**
1. Click into an athlete profile from the leaderboard
2. Scroll to Weekly Progress
   - Toggle between Weekly and Cumulative views
   - Hover over data points to show tooltips
   - Point out the summary stats
3. Go to Personal Bests
   - Click through all three tabs (Records, Zone PRs, Milestones)
   - Highlight the streak badge if visible
4. Scroll to Training Profile radar chart
   - Hover over different dimensions
   - Expand "Understanding Your Profile" to show the detailed explanations
5. Navigate to Pace Analysis
   - Switch between sports if available
   - Hover over the chart
   - Highlight the improvement percentage
6. Scroll to Training Insights
   - Pause on the pie chart, explain the colors
   - Show the ideal percentages in gold
   - Move to the readiness gauge
   - Expand the Readiness Breakdown to show all five factors
7. Finally, scroll to Training Load
   - Highlight the status card color and message
   - Point out the ACWR ratio
   - Hover over the tooltip for detailed explanation
   - Expand "How is this calculated?" to show the zone weightings

**Key talking points to emphasize:**
- All data comes from Strava—nothing manufactured
- Heart rate zones are YOUR personal zones, not generic formulas
- Point calculation is second-by-second analysis
- Training Load is based on published sports science (Gabbett ACWR research)
- Race Readiness uses weighted factors based on triathlon-specific training principles
- Sport Balance uses actual 70.3 race time ratios

**Tone guidance:**
- Measured, contemplative pace—don't rush
- Build understanding through careful reasoning
- Acknowledge complexity without obscuring it
- Use precise language; avoid hyperbole
- Occasional philosophical asides about what the numbers mean
- Trust the audience's intelligence

**Production tips:**
- Pause on each section for 5-10 seconds before narrating
- Use the expand/collapse toggles to show hidden content
- Hover over tooltips (the little info icons) to show the helper text
- Consider zooming the browser to 110-125% for better video readability
- Total runtime should be approximately 12-14 minutes with the calculation explanations
