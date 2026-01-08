import type { AppData, Area, Project, Task } from '@/types/data'

// -----------------------------------------------------------------------------
// Sample Data
// -----------------------------------------------------------------------------

export const appData: AppData = {
  areas: [
    {
      id: 'health',
      title: 'Health',
      status: 'active',
      type: 'life-area',
      notes: `## Overview

Health is the foundation everything else is built on. When I neglect this area, everything else suffers—my focus at work, my patience with people I care about, my ability to think clearly.

## Current Focus

Right now I'm prioritizing:
- **Sleep quality** over sleep quantity (aiming for consistent 7h rather than inconsistent 8h)
- **Movement throughout the day** rather than just gym sessions
- **Meal prep** to avoid decision fatigue and poor choices when tired

## Key Metrics

- Morning energy levels (subjective 1-10 scale)
- Weekly workout completion rate
- Sleep consistency (bedtime variance)`,
    },
    {
      id: 'finance',
      title: 'Finance',
      status: 'active',
      type: 'life-area',
      notes: `## Philosophy

I'm not trying to get rich—I'm trying to build enough financial margin that money stops being a source of stress. That means:
1. Spending less than I earn (obvious but hard)
2. Having enough runway to handle surprises
3. Not checking my portfolio obsessively

## Current Situation

Emergency fund is at 4 months of expenses. Goal is 6 months by end of Q2. Investment contributions are automated, which removes the temptation to time the market.

## Annual Review

Tax prep starts in January. Need to be more organized this year—last year was a scramble.`,
    },
    {
      id: 'coding',
      title: 'Coding',
      status: 'active',
      type: 'life-area',
      notes: `## Why This Matters

Coding isn't just my job—it's how I think through problems. The side projects keep my skills sharp and give me space to experiment with things I can't try at work.

## Current Interests

- **Rust**: Systems programming, finally understanding ownership
- **Local-first software**: CRDTs, sync engines, offline-capable apps
- **Developer tools**: Building things that make other developers' lives easier

## Learning Approach

I learn best by building. Tutorials are fine for syntax, but real understanding comes from hitting walls and figuring out how to get around them.`,
    },
    {
      id: 'family-friends',
      title: 'Family & Friends',
      status: 'active',
      type: 'life-area',
      notes: `## The People Who Matter

It's easy to let relationships slide when work gets busy. This area exists to make sure I don't.

## Recurring Commitments

- **Weekly family calls**: Sunday evenings, non-negotiable
- **Monthly friend catchups**: Rotating through the core group
- **Quarterly visits**: Try to see parents/siblings in person

## Things I Want to Be Better At

- Remembering birthdays without calendar reminders
- Being present during conversations (phone away)
- Initiating plans instead of always waiting for others`,
    },
    {
      id: 'marketing-sales',
      title: 'Marketing & Sales',
      status: 'active',
      type: 'work',
      notes: `## Context

This covers the marketing and sales efforts for my indie products. Currently focused on growing the newsletter and preparing for the Q2 product launch.

## Strategy

1. **Content-first approach**: Build audience through genuinely useful content
2. **Email over social**: Own the relationship, don't rent it
3. **Customer conversations**: Talk to users constantly, not just when something's broken

## Key Numbers

- Newsletter subscribers: ~2,400
- Open rate: 42% (good but could be better)
- Conversion to paid: 3.2%`,
    },
    {
      id: 'dating',
      title: 'Dating',
      status: 'active',
      type: 'life-area',
      notes: `## Current Status

In a relationship for 8 months now. This area has shifted from "finding someone" to "building something together."

## Priorities

- Regular quality time (not just existing in the same space)
- Trying new things together
- Maintaining individual identities while growing as a couple

## Notes

We've settled into comfortable patterns, which is nice but also means we need to be intentional about novelty and adventure.`,
    },
  ],

  projects: [
    // Health projects
    {
      id: 'health-1',
      title: 'Morning Workout Routine',
      areaId: 'health',
      status: 'in-progress',
      description: 'Establish a consistent morning exercise habit',
      startDate: '2025-11-01',
      notes: `## Goal

Build a sustainable morning workout routine that I actually stick to. Not trying to become a bodybuilder—just want consistent movement to start the day.

## The Plan

- **Wake up**: 6:30 AM (non-negotiable)
- **Workout**: 6:45-7:30 AM (45 min including warmup/cooldown)
- **Rotation**: Push/Pull/Legs/Cardio/Rest

## What's Working

The home gym setup has been a game-changer. Removing the friction of going to a gym means I actually do it.

## What's Not Working

Weekends are inconsistent. Need to figure out a modified routine that works when the schedule is different.`,
    },
    {
      id: 'health-2',
      title: 'Meal Prep Sundays',
      areaId: 'health',
      status: 'in-progress',
      description: 'Weekly meal preparation system',
      startDate: '2025-10-15',
      notes: `## Why This Matters

When I don't meal prep, I make bad food choices. It's that simple. Tired brain + no prepared food = ordering pizza.

## Current System

**Sunday afternoon (2-3 hours):**
1. Prep proteins (usually chicken + one other)
2. Roast vegetables (big sheet pan)
3. Cook grains (rice cooker does the work)
4. Portion into containers

## Recipes in Rotation

- Chicken shawarma bowls
- Beef and broccoli
- Turkey meatballs with roasted veg
- Salmon with quinoa (prep day-of, doesn't store well)

## Shopping

Costco run every 2 weeks. Trader Joe's for specialty items.`,
    },
    {
      id: 'health-3',
      title: 'Sleep Optimization',
      areaId: 'health',
      status: 'in-progress',
      description: 'Improve sleep quality and consistency',
      startDate: '2025-09-01',
      notes: `## Background

I was averaging 5.5 hours of broken sleep. That's not sustainable. This project is about fixing that.

## Changes Made

- **Environment**: Blackout curtains, cooler room (67°F), white noise
- **Behavior**: No screens after 10 PM (mostly successful), no caffeine after 2 PM
- **Timing**: Consistent bedtime even on weekends (this was the hardest)

## Results So Far

Average sleep is up to 7.1 hours. More importantly, I'm waking up before my alarm most days, which suggests better sleep quality.

## Next Steps

Want to experiment with sleep tracking to see if there are patterns I'm missing.`,
    },
    {
      id: 'health-4',
      title: 'Annual Checkups',
      areaId: 'health',
      status: 'planning',
      description: 'Schedule and complete all annual health appointments',
      notes: `## Appointments Needed

- [ ] Primary care physical
- [ ] Dentist (cleaning + checkup)
- [ ] Eye exam
- [ ] Dermatologist (skin check)

## Insurance Notes

New plan year started. Deductible reset. HSA has enough to cover all copays.

## Scheduling Strategy

Try to batch these in January/February before work gets crazy in Q2.`,
    },

    // Finance projects
    {
      id: 'finance-1',
      title: 'Monthly Budget Review',
      areaId: 'finance',
      status: 'in-progress',
      description: 'Regular financial health checks',
      startDate: '2025-01-01',
      notes: `## Process

First weekend of each month:
1. Export transactions from all accounts
2. Categorize anything that wasn't auto-categorized
3. Compare actual vs. budget
4. Adjust next month's budget if needed
5. Update net worth spreadsheet

## Tools

- **Banking**: Mostly automated through bank's categorization
- **Tracking**: Simple spreadsheet (tried YNAB, too much overhead)
- **Investments**: Vanguard dashboard

## Red Flags to Watch

- Dining out creeping above $400/month
- Subscription creep (audit quarterly)
- Impulse purchases over $50`,
    },
    {
      id: 'finance-2',
      title: 'Emergency Fund',
      areaId: 'finance',
      status: 'in-progress',
      description: 'Build 6-month expense runway',
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      notes: `## Target

6 months of essential expenses = $24,000

## Current Status

- Current balance: $16,000
- Monthly contribution: $1,500
- On track to hit target by end of May

## Where It Lives

High-yield savings account at 4.5% APY. Separate from checking to reduce temptation.

## Rules

This is for true emergencies only:
- Job loss
- Major medical expense
- Critical home/car repair

NOT for:
- Vacations
- "Good deals"
- Predictable irregular expenses (those go in sinking funds)`,
    },
    {
      id: 'finance-3',
      title: 'Investment Portfolio',
      areaId: 'finance',
      status: 'planning',
      description: 'Review and rebalance investment strategy',
      notes: `## Current Allocation

- 80% equities (mostly index funds)
- 15% bonds
- 5% alternatives (REITs)

## Questions to Answer

1. Is my risk tolerance still appropriate for my timeline?
2. Should I increase international exposure?
3. Are my expense ratios as low as they can be?

## Timeline

Want to do a thorough review in Q1, then set and forget for the year. The less I look at it, the better my returns historically.`,
    },
    {
      id: 'finance-4',
      title: 'Tax Preparation 2025',
      areaId: 'finance',
      status: 'planning',
      startDate: '2025-01-15',
      endDate: '2025-04-15',
      description: 'Gather documents and file taxes',
      notes: `## Documents Needed

**Income:**
- W-2 from employer
- 1099s from freelance work
- 1099-INT/DIV from investments

**Deductions:**
- HSA contributions (1099-SA)
- Charitable donations (need to pull receipts)
- Home office expenses (if still applicable)

## Timeline

- January: Gather documents as they arrive
- February: Review with accountant
- March: File (aiming for mid-March)
- April: Deadline buffer

## Notes from Last Year

Almost missed the HSA contribution deadline. Set reminder for April 1 this year.`,
    },

    // Coding projects
    {
      id: 'coding-1',
      title: 'Learn Rust',
      areaId: 'coding',
      status: 'in-progress',
      description: 'Build proficiency in Rust programming',
      startDate: '2025-10-01',
      notes: `## Why Rust?

- Memory safety without garbage collection
- Great tooling (cargo is a joy)
- Growing ecosystem for CLI tools and systems programming
- Tauri uses it (relevant for the task app project)

## Learning Path

1. ~~The Rust Book (chapters 1-10)~~ ✓
2. ~~Rustlings exercises~~ ✓
3. Build something real (in progress)
4. Contribute to an open source Rust project

## Current Project

Building a CLI tool for managing markdown task files. Practical application of what I'm learning.

## Struggles

- Borrow checker still trips me up
- Async Rust is confusing
- Lifetimes feel like dark magic`,
    },
    {
      id: 'coding-2',
      title: 'Side Project: Task App',
      areaId: 'coding',
      status: 'in-progress',
      description: 'Build a local-first task management app',
      startDate: '2025-11-15',
      notes: `## Vision

A task manager that:
- Stores everything as local markdown files
- Works offline-first
- Syncs via git (no proprietary cloud)
- Has keyboard-driven UI like Things 3

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri (Rust backend)
- **Styling**: Tailwind + shadcn/ui
- **Data**: Markdown files with YAML frontmatter

## Current Phase

UI exploration. Building out the interface before connecting to the Tauri backend.

## Design Principles

1. Fast above all else
2. Keyboard-navigable
3. Minimal chrome, maximum content
4. Works without internet`,
    },
    {
      id: 'coding-3',
      title: 'Open Source Contributions',
      areaId: 'coding',
      status: 'in-progress',
      description: 'Contribute to projects I use',
      startDate: '2025-06-01',
      notes: `## Philosophy

I use a lot of open source software. Contributing back is both ethical and great for learning.

## Contributions This Year

- **shadcn/ui**: Documentation fixes, one component improvement
- **Tauri**: Bug report + reproduction case
- **Various**: Small typo fixes (counts!)

## Projects I Want to Contribute To

- Helix editor (need to level up Rust first)
- Zed editor (same)
- Obsidian plugins (more realistic short-term)

## Approach

1. Start by using the project extensively
2. File good bug reports
3. Fix documentation issues (low barrier)
4. Graduate to code contributions`,
    },
    {
      id: 'coding-4',
      title: 'Blog Technical Articles',
      areaId: 'coding',
      status: 'paused',
      description: 'Write and publish technical blog posts',
      startDate: '2025-03-01',
      notes: `## Status: On Hold

Pausing this to focus on the task app. Will revisit in Q2.

## Draft Posts

1. "Building a CLI in Rust: Lessons Learned" (60% done)
2. "Why I Switched from Electron to Tauri" (outline only)
3. "Local-First Software: A Practical Guide" (research phase)

## When I Resume

Focus on finishing post #1 first. It's the most complete and would be good to ship something.`,
    },

    // Family & Friends projects
    {
      id: 'family-1',
      title: 'Weekly Family Calls',
      areaId: 'family-friends',
      status: 'in-progress',
      description: 'Maintain regular family connection',
      startDate: '2025-01-01',
      notes: `## Schedule

Sunday evenings, 7 PM. Usually 30-45 minutes.

## Rotation

- Week 1: Parents (together or separately depending on their schedules)
- Week 2: Sister + her family
- Week 3: Brother
- Week 4: Extended family or catch-up with whoever we missed

## Topics to Remember

Dad's interested in the coding projects. Mom wants to hear about relationships. Sister loves travel stories. Keep a mental note of what's going on with each person.`,
    },
    {
      id: 'family-2',
      title: 'Birthday Gift Planning',
      areaId: 'family-friends',
      status: 'planning',
      description: 'Stay ahead of birthday gifts',
      notes: `## Upcoming Birthdays

- **Mom**: March 15 - Thinking cooking class experience
- **Dad**: May 2 - New golf accessories? Check with mom
- **Sister**: July 20 - She mentioned wanting a specific book
- **Partner**: September 8 - Start thinking NOW

## General Strategy

- Set reminder 3 weeks before each birthday
- Experiences > stuff (usually)
- Keep a running note when people mention things they want`,
    },
    {
      id: 'family-3',
      title: 'Summer Vacation 2025',
      areaId: 'family-friends',
      status: 'blocked',
      description: 'Plan summer trip with family',
      startDate: '2025-06-01',
      endDate: '2025-08-31',
      notes: `## Ideas

1. **Beach house rental**: Everyone chips in, week together
2. **National park trip**: Yellowstone has been on the list
3. **International**: Portugal? More logistics but could be amazing

## Constraints

- Need dates that work for everyone (sister's kids' school schedule)
- Budget: ~$2000 per person for a week
- Dad's mobility—nothing too strenuous

## Next Steps

Float dates to the family group chat. See what works before committing to location.`,
    },
    {
      id: 'family-4',
      title: 'Game Night Hosting',
      areaId: 'family-friends',
      status: 'done',
      description: 'Host regular game nights with friends',
      startDate: '2025-09-01',
      endDate: '2025-12-15',
      notes: `## Summary

Successfully hosted 6 game nights over the fall. Great way to maintain friendships without always going out.

## What Worked

- Rotating game selection (everyone brings one)
- Simple snacks (cheese board, not elaborate cooking)
- Set end time (10:30 PM on work nights)

## Favorite Games

- Wavelength (great for larger groups)
- Codenames (classic)
- The Crew (surprising hit)

## Next Chapter

Taking a break for the holidays. Will resume in February with the same crew.`,
    },

    // Marketing & Sales projects
    {
      id: 'marketing-1',
      title: 'Content Calendar',
      areaId: 'marketing-sales',
      status: 'in-progress',
      description: 'Plan and execute content strategy',
      startDate: '2025-01-01',
      notes: `## Publishing Schedule

- **Newsletter**: Weekly (Tuesdays)
- **Blog**: 2x per month
- **Twitter/X**: Daily-ish (when I have something to say)

## Content Pillars

1. Productivity systems (40%)
2. Indie hacking journey (30%)
3. Technical tutorials (30%)

## Planning Process

End of each month:
1. Review what performed well
2. Brainstorm topics for next month
3. Outline at least 2 weeks ahead
4. Batch write when possible`,
    },
    {
      id: 'marketing-2',
      title: 'Newsletter Growth',
      areaId: 'marketing-sales',
      status: 'in-progress',
      description: 'Grow newsletter to 5,000 subscribers',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      notes: `## Goal

5,000 quality subscribers by end of year. Currently at 2,400.

## Growth Strategies

1. **SEO content**: Evergreen posts that rank and have newsletter CTAs
2. **Cross-promotion**: Guest posts, podcast appearances
3. **Lead magnets**: Free resources in exchange for email
4. **Consistency**: Best growth hack is just showing up every week

## Metrics

- Current: 2,400 subscribers
- Growth rate: ~150/month
- Need to increase to ~220/month to hit goal

## What I Won't Do

- Buy subscribers
- Engagement bait
- Clickbait subject lines`,
    },
    {
      id: 'marketing-3',
      title: 'Product Launch Q2',
      areaId: 'marketing-sales',
      status: 'planning',
      startDate: '2025-04-01',
      endDate: '2025-06-30',
      description: 'Launch new digital product',
      notes: `## The Product

A comprehensive course on building local-first applications. Based on what I'm learning with the task app.

## Launch Plan

1. **Pre-launch (April)**: Build waitlist, share behind-the-scenes
2. **Launch week (May)**: Limited-time discount, heavy promotion
3. **Post-launch (June)**: Gather feedback, iterate

## Pricing Strategy

- Early bird: $99
- Regular: $149
- Bundle with future products: TBD

## Content to Create

- Landing page
- Sales emails (sequence of 5)
- Demo videos
- Sample lessons for preview`,
    },
    {
      id: 'marketing-4',
      title: 'Customer Interviews',
      areaId: 'marketing-sales',
      status: 'done',
      description: 'Talk to customers to understand needs',
      startDate: '2025-10-01',
      endDate: '2025-12-01',
      notes: `## Summary

Conducted 12 customer interviews over 2 months. Hugely valuable for product direction.

## Key Insights

1. **Pain point**: Existing tools are too complicated or too simple
2. **Desire**: People want to own their data
3. **Willingness to pay**: Higher than expected for the right solution
4. **Feature requests**: Keyboard shortcuts, quick capture, file-based storage

## How This Shapes the Roadmap

Validated the task app concept. People really want local-first + good UX. Most competitors sacrifice one for the other.

## Quotes to Remember

> "I just want my tasks in plain text files that I can grep"

> "Why does every app need to be a subscription?"`,
    },

    // Dating projects
    {
      id: 'dating-1',
      title: 'Profile Optimization',
      areaId: 'dating',
      status: 'done',
      description: 'Dating profile improvements',
      startDate: '2025-01-01',
      endDate: '2025-04-15',
      notes: `## Status: Complete

Met my partner through the app in April. Profile work paid off.

## What Worked

- Authentic photos (no filters, variety of contexts)
- Specific prompts (not generic "I love to travel")
- Clear about what I was looking for

## Lessons Learned

- Quality over quantity (fewer matches, better conversations)
- First message should reference their profile specifically
- Move to a real date quickly (apps are exhausting)`,
    },
    {
      id: 'dating-2',
      title: 'Weekly Date Nights',
      areaId: 'dating',
      status: 'in-progress',
      description: 'Regular quality time with partner',
      startDate: '2025-05-01',
      notes: `## The Commitment

One dedicated date night per week. Not negotiable unless there's a real conflict.

## What Counts as a Date

- Going somewhere together (not just couch + Netflix)
- Phones away
- Intentional conversation

## Recent Favorites

- Cooking class (Italian)
- Comedy show
- New restaurant exploration
- Sunset hike + picnic

## Ideas to Try

- Pottery class
- Drive-in movie (weather permitting)
- Day trip to wine country`,
    },
    {
      id: 'dating-3',
      title: 'New Activities to Try',
      areaId: 'dating',
      status: 'planning',
      description: 'Shared experiences and adventures',
      notes: `## Bucket List

Things we've talked about doing together:

1. **Travel**: Weekend trip to a city neither has visited
2. **Learning**: Take a class together (cooking? dancing?)
3. **Adventure**: Kayaking, rock climbing, something physical
4. **Culture**: More live music, theater

## For 2025

Pick 3-4 of these and actually schedule them. Don't let them stay as "someday" items.`,
    },

    // Projects with NO area
    {
      id: 'home-office-setup',
      title: 'Home Office Setup',
      status: 'in-progress',
      description: 'Optimize workspace for productivity and comfort',
      startDate: '2025-11-01',
      notes: `## Goal

Create a workspace that:
- Reduces physical strain (better ergonomics)
- Minimizes distractions
- Looks good on video calls

## Completed

- Standing desk (Uplift V2)
- Monitor arm
- Better lighting for video calls

## Still Needed

- Cable management (it's a mess)
- Acoustic treatment (echo is bad)
- Plants (something low-maintenance)

## Budget

~$500 remaining. Prioritize acoustic panels.`,
    },
    {
      id: 'reading-challenge',
      title: '2025 Reading Challenge',
      status: 'in-progress',
      description: 'Read 24 books in 2025',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      notes: `## Goal

24 books = 2 per month. Mix of fiction, non-fiction, and technical.

## Progress

Currently at 0 books (just started tracking).

## To Read Stack

1. "Tomorrow, and Tomorrow, and Tomorrow" - Gabrielle Zevin
2. "The Rust Programming Language" (counts as a book!)
3. "Four Thousand Weeks" - Oliver Burkeman
4. "Project Hail Mary" - Andy Weir (re-read)

## Rules

- Audiobooks count
- Re-reads count
- DNF doesn't count against the total

## Tracking

Update monthly in this note.`,
    },
  ],

  tasks: [
    // ==========================================================================
    // INBOX - Newly captured, not yet processed
    // ==========================================================================
    {
      id: 'inbox-1',
      title: 'Research protein powder brands',
      status: 'inbox',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
    },
    {
      id: 'inbox-2',
      title: 'Call mom about Christmas plans',
      status: 'inbox',
      createdAt: '2025-12-29T09:30:00',
      updatedAt: '2025-12-29T09:30:00',
    },
    {
      id: 'inbox-3',
      title: 'Look into that podcast app someone recommended',
      status: 'inbox',
      createdAt: '2025-12-29T14:22:00',
      updatedAt: '2025-12-29T14:22:00',
    },
    {
      id: 'inbox-4',
      title: 'Book recommendation from Twitter thread',
      status: 'inbox',
      createdAt: '2025-12-30T08:15:00',
      updatedAt: '2025-12-30T08:15:00',
      notes: `Someone mentioned "Thinking in Systems" by Donella Meadows. Sounded interesting.`,
    },
    {
      id: 'inbox-5',
      title: 'Check if car registration is due',
      status: 'inbox',
      createdAt: '2025-12-30T09:00:00',
      updatedAt: '2025-12-30T09:00:00',
    },

    // ==========================================================================
    // Tasks for Morning Workout Routine (health-1)
    // ==========================================================================
    {
      id: 'health-1-task-1',
      title: 'Buy new running shoes',
      status: 'done',
      projectId: 'health-1',
      createdAt: '2025-12-01T08:00:00',
      updatedAt: '2025-12-15T14:00:00',
      completedAt: '2025-12-15T14:00:00',
      notes: `Went with Brooks Ghost 15. Great cushioning, good for my neutral gait.`,
    },
    {
      id: 'health-1-task-2',
      title: 'Create 4-week workout plan',
      status: 'done',
      projectId: 'health-1',
      createdAt: '2025-12-01T08:00:00',
      updatedAt: '2025-12-10T09:00:00',
      completedAt: '2025-12-10T09:00:00',
    },
    {
      id: 'health-1-task-3',
      title: 'Set up home gym corner',
      status: 'in-progress',
      projectId: 'health-1',
      createdAt: '2025-12-10T10:00:00',
      updatedAt: '2025-12-28T11:00:00',
      scheduled: '2025-12-30',
      notes: `Need to clear out the spare room corner. Ordered:
- Adjustable dumbbells (arriving tomorrow)
- Yoga mat
- Pull-up bar (door-mounted)`,
    },
    {
      id: 'health-1-task-4',
      title: 'Download and set up workout tracking app',
      status: 'ready',
      projectId: 'health-1',
      createdAt: '2025-12-15T09:00:00',
      updatedAt: '2025-12-15T09:00:00',
    },
    {
      id: 'health-1-task-5',
      title: 'Order resistance bands',
      status: 'done',
      projectId: 'health-1',
      createdAt: '2025-12-18T10:00:00',
      updatedAt: '2025-12-20T11:00:00',
      completedAt: '2025-12-20T11:00:00',
    },
    {
      id: 'health-1-task-6',
      title: 'Find good warm-up routine on YouTube',
      status: 'ready',
      projectId: 'health-1',
      createdAt: '2025-12-22T09:00:00',
      updatedAt: '2025-12-22T09:00:00',
    },

    // ==========================================================================
    // Tasks for Meal Prep Sundays (health-2)
    // ==========================================================================
    {
      id: 'health-2-task-1',
      title: 'Buy meal prep containers (glass, not plastic)',
      status: 'done',
      projectId: 'health-2',
      createdAt: '2025-10-15T10:00:00',
      updatedAt: '2025-10-20T14:00:00',
      completedAt: '2025-10-20T14:00:00',
    },
    {
      id: 'health-2-task-2',
      title: 'Create rotation of 10 reliable recipes',
      status: 'in-progress',
      projectId: 'health-2',
      createdAt: '2025-10-15T10:00:00',
      updatedAt: '2025-12-15T09:00:00',
      notes: `Current count: 7 recipes that work well. Need 3 more.

**Working recipes:**
1. Chicken shawarma bowls
2. Beef and broccoli
3. Turkey meatballs
4. Lemon herb salmon
5. Black bean tacos
6. Stir-fry (various proteins)
7. Greek chicken with orzo`,
    },
    {
      id: 'health-2-task-3',
      title: 'Meal prep this Sunday',
      status: 'ready',
      projectId: 'health-2',
      createdAt: '2025-12-27T10:00:00',
      updatedAt: '2025-12-27T10:00:00',
      scheduled: '2026-01-05',
    },

    // ==========================================================================
    // Tasks for Sleep Optimization (health-3)
    // ==========================================================================
    {
      id: 'health-3-task-1',
      title: 'Install blackout curtains',
      status: 'done',
      projectId: 'health-3',
      createdAt: '2025-09-01T10:00:00',
      updatedAt: '2025-09-10T15:00:00',
      completedAt: '2025-09-10T15:00:00',
    },
    {
      id: 'health-3-task-2',
      title: 'Set up bedtime automation on phone',
      status: 'done',
      projectId: 'health-3',
      createdAt: '2025-09-01T10:00:00',
      updatedAt: '2025-09-05T20:00:00',
      completedAt: '2025-09-05T20:00:00',
      notes: `iPhone Focus mode kicks in at 10 PM. Grayscale + blocked apps.`,
    },
    {
      id: 'health-3-task-3',
      title: 'Research sleep tracking options',
      status: 'ready',
      projectId: 'health-3',
      createdAt: '2025-12-20T09:00:00',
      updatedAt: '2025-12-20T09:00:00',
      notes: `Options to consider:
- Oura Ring (expensive but well-reviewed)
- Whoop (subscription model, not sure about that)
- Apple Watch sleep tracking (already have the watch)`,
    },
    {
      id: 'health-3-task-4',
      title: 'Try magnesium supplement for 2 weeks',
      status: 'in-progress',
      projectId: 'health-3',
      createdAt: '2025-12-15T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      notes: `Started Dec 15. Taking magnesium glycinate before bed. Too early to tell if it's helping.`,
    },

    // ==========================================================================
    // Tasks for Annual Checkups (health-4)
    // ==========================================================================
    {
      id: 'health-4-task-1',
      title: 'Schedule primary care physical',
      status: 'ready',
      projectId: 'health-4',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      scheduled: '2026-01-06',
    },
    {
      id: 'health-4-task-2',
      title: 'Schedule dentist appointment',
      status: 'ready',
      projectId: 'health-4',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
    },
    {
      id: 'health-4-task-3',
      title: 'Schedule eye exam',
      status: 'ready',
      projectId: 'health-4',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
    },

    // ==========================================================================
    // Tasks for Side Project: Task App (coding-2)
    // ==========================================================================
    {
      id: 'coding-2-task-1',
      title: 'Design data model for tasks',
      status: 'done',
      projectId: 'coding-2',
      createdAt: '2025-12-20T14:00:00',
      updatedAt: '2025-12-28T16:00:00',
      completedAt: '2025-12-28T16:00:00',
    },
    {
      id: 'coding-2-task-2',
      title: 'Implement sidebar navigation',
      status: 'done',
      projectId: 'coding-2',
      createdAt: '2025-12-22T10:00:00',
      updatedAt: '2025-12-29T11:00:00',
      completedAt: '2025-12-29T11:00:00',
    },
    {
      id: 'coding-2-task-3',
      title: 'Build task list component',
      status: 'in-progress',
      projectId: 'coding-2',
      createdAt: '2025-12-28T09:00:00',
      updatedAt: '2025-12-30T10:00:00',
      scheduled: '2025-12-30',
    },
    {
      id: 'coding-2-task-4',
      title: 'Add keyboard navigation',
      status: 'ready',
      projectId: 'coding-2',
      createdAt: '2025-12-29T14:00:00',
      updatedAt: '2025-12-29T14:00:00',
      notes: `Key shortcuts to implement:
- j/k: Navigate up/down
- Enter: Open task
- x: Toggle complete
- n: New task
- /: Search`,
    },
    {
      id: 'coding-2-task-5',
      title: 'Integrate with Tauri backend',
      status: 'blocked',
      projectId: 'coding-2',
      createdAt: '2025-12-29T15:00:00',
      updatedAt: '2025-12-29T15:00:00',
      notes: `Blocked on: finalizing the file format spec. Need to nail down the data model before building the Rust file parser.`,
    },
    {
      id: 'coding-2-task-6',
      title: 'Create realistic sample data',
      status: 'in-progress',
      projectId: 'coding-2',
      createdAt: '2025-12-30T09:00:00',
      updatedAt: '2025-12-30T10:00:00',
      scheduled: '2025-12-30',
    },
    {
      id: 'coding-2-task-7',
      title: 'Implement task detail view',
      status: 'ready',
      projectId: 'coding-2',
      createdAt: '2025-12-30T10:00:00',
      updatedAt: '2025-12-30T10:00:00',
    },
    {
      id: 'coding-2-task-8',
      title: 'Add markdown rendering for notes',
      status: 'ready',
      projectId: 'coding-2',
      createdAt: '2025-12-30T10:00:00',
      updatedAt: '2025-12-30T10:00:00',
    },

    // ==========================================================================
    // Tasks for Learn Rust (coding-1)
    // ==========================================================================
    {
      id: 'coding-1-task-1',
      title: 'Complete Rust Book chapters 1-10',
      status: 'done',
      projectId: 'coding-1',
      createdAt: '2025-10-01T10:00:00',
      updatedAt: '2025-11-15T14:00:00',
      completedAt: '2025-11-15T14:00:00',
    },
    {
      id: 'coding-1-task-2',
      title: 'Finish Rustlings exercises',
      status: 'done',
      projectId: 'coding-1',
      createdAt: '2025-10-15T10:00:00',
      updatedAt: '2025-12-01T16:00:00',
      completedAt: '2025-12-01T16:00:00',
    },
    {
      id: 'coding-1-task-3',
      title: 'Build CLI file parser prototype',
      status: 'in-progress',
      projectId: 'coding-1',
      createdAt: '2025-12-05T10:00:00',
      updatedAt: '2025-12-28T11:00:00',
      notes: `Working on a CLI tool that parses markdown files with YAML frontmatter. Using:
- clap for argument parsing
- serde for YAML
- walkdir for file traversal`,
    },
    {
      id: 'coding-1-task-4',
      title: 'Read Rust async book',
      status: 'icebox',
      projectId: 'coding-1',
      createdAt: '2025-12-10T10:00:00',
      updatedAt: '2025-12-10T10:00:00',
      deferUntil: '2026-02-01',
      notes: `Async isn't needed for the current project. Deferring until Q2.`,
    },

    // ==========================================================================
    // Tasks for Tax Preparation (finance-4)
    // ==========================================================================
    {
      id: 'finance-4-task-1',
      title: 'Gather W-2 forms',
      status: 'ready',
      projectId: 'finance-4',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      due: '2025-01-31',
      deferUntil: '2026-01-15',
    },
    {
      id: 'finance-4-task-2',
      title: 'Collect 1099 statements',
      status: 'ready',
      projectId: 'finance-4',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      due: '2025-01-31',
      deferUntil: '2026-01-15',
    },
    {
      id: 'finance-4-task-3',
      title: 'Pull charitable donation receipts',
      status: 'ready',
      projectId: 'finance-4',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
    },
    {
      id: 'finance-4-task-4',
      title: 'Schedule appointment with accountant',
      status: 'icebox',
      projectId: 'finance-4',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      deferUntil: '2026-02-01',
    },
    {
      id: 'finance-4-task-5',
      title: 'Max out HSA contribution before deadline',
      status: 'ready',
      projectId: 'finance-4',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      due: '2026-04-15',
      scheduled: '2026-04-01',
    },

    // ==========================================================================
    // Tasks for Emergency Fund (finance-2)
    // ==========================================================================
    {
      id: 'finance-2-task-1',
      title: 'Set up automatic monthly transfer',
      status: 'done',
      projectId: 'finance-2',
      createdAt: '2025-01-05T10:00:00',
      updatedAt: '2025-01-10T14:00:00',
      completedAt: '2025-01-10T14:00:00',
    },
    {
      id: 'finance-2-task-2',
      title: 'Review and adjust contribution amount',
      status: 'ready',
      projectId: 'finance-2',
      createdAt: '2025-12-15T10:00:00',
      updatedAt: '2025-12-15T10:00:00',
      scheduled: '2026-01-15',
      notes: `Might be able to increase from $1,500 to $1,750 based on updated budget.`,
    },

    // ==========================================================================
    // Tasks for Newsletter Growth (marketing-2)
    // ==========================================================================
    {
      id: 'marketing-2-task-1',
      title: "Write this week's newsletter",
      status: 'in-progress',
      projectId: 'marketing-2',
      createdAt: '2025-12-29T09:00:00',
      updatedAt: '2025-12-30T08:00:00',
      due: '2025-12-31',
      scheduled: '2025-12-30',
      notes: `Topic: Year in review + 2026 plans. Draft is 60% done.`,
    },
    {
      id: 'marketing-2-task-2',
      title: 'Create lead magnet PDF',
      status: 'ready',
      projectId: 'marketing-2',
      createdAt: '2025-12-15T10:00:00',
      updatedAt: '2025-12-15T10:00:00',
      notes: `Idea: "The Local-First Starter Kit" - curated list of tools and resources.`,
    },
    {
      id: 'marketing-2-task-3',
      title: 'Reach out to 3 newsletters for cross-promotion',
      status: 'ready',
      projectId: 'marketing-2',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      scheduled: '2026-01-10',
    },

    // ==========================================================================
    // Tasks for Weekly Date Nights (dating-2)
    // ==========================================================================
    {
      id: 'dating-2-task-1',
      title: "Book restaurant for New Year's Eve",
      status: 'done',
      projectId: 'dating-2',
      createdAt: '2025-12-15T10:00:00',
      updatedAt: '2025-12-20T14:00:00',
      completedAt: '2025-12-20T14:00:00',
      notes: `Got a reservation at that Italian place she's been wanting to try. 8 PM.`,
    },
    {
      id: 'dating-2-task-2',
      title: 'Research pottery class options',
      status: 'ready',
      projectId: 'dating-2',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      notes: `She mentioned wanting to try this. Would make a fun date.`,
    },
    {
      id: 'dating-2-task-3',
      title: 'Plan January date nights',
      status: 'ready',
      projectId: 'dating-2',
      createdAt: '2025-12-29T10:00:00',
      updatedAt: '2025-12-29T10:00:00',
      scheduled: '2026-01-02',
    },

    // ==========================================================================
    // Tasks for Home Office Setup (no area)
    // ==========================================================================
    {
      id: 'office-task-1',
      title: 'Order acoustic panels',
      status: 'ready',
      projectId: 'home-office-setup',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      notes: `Looking at the foam panels on Amazon. Need about 12 to cover the wall behind me.`,
    },
    {
      id: 'office-task-2',
      title: 'Cable management cleanup',
      status: 'ready',
      projectId: 'home-office-setup',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      scheduled: '2026-01-04',
    },
    {
      id: 'office-task-3',
      title: 'Buy a low-maintenance plant',
      status: 'ready',
      projectId: 'home-office-setup',
      createdAt: '2025-12-22T10:00:00',
      updatedAt: '2025-12-22T10:00:00',
      notes: `Pothos or snake plant. Something I can't kill.`,
    },
    {
      id: 'office-task-4',
      title: 'Install monitor light bar',
      status: 'done',
      projectId: 'home-office-setup',
      createdAt: '2025-12-01T10:00:00',
      updatedAt: '2025-12-10T14:00:00',
      completedAt: '2025-12-10T14:00:00',
    },

    // ==========================================================================
    // Tasks for Reading Challenge (no area)
    // ==========================================================================
    {
      id: 'reading-task-1',
      title: "Start 'Tomorrow and Tomorrow and Tomorrow'",
      status: 'ready',
      projectId: 'reading-challenge',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      scheduled: '2026-01-01',
    },
    {
      id: 'reading-task-2',
      title: 'Set up Goodreads 2025 challenge',
      status: 'ready',
      projectId: 'reading-challenge',
      createdAt: '2025-12-29T10:00:00',
      updatedAt: '2025-12-29T10:00:00',
    },

    // ==========================================================================
    // Tasks with DIRECT AREA reference (no project)
    // ==========================================================================
    {
      id: 'health-direct-1',
      title: 'Research standing desk mat options',
      status: 'ready',
      areaId: 'health',
      createdAt: '2025-12-27T09:00:00',
      updatedAt: '2025-12-27T09:00:00',
      notes: `Feet hurt after standing for long periods. Need something with more cushion.`,
    },
    {
      id: 'health-direct-2',
      title: 'Look into local gym memberships',
      status: 'icebox',
      areaId: 'health',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      deferUntil: '2026-03-01',
      notes: `Home gym is working for now. Revisit in spring if I want more equipment variety.`,
    },
    {
      id: 'finance-direct-1',
      title: 'Review credit card rewards programs',
      status: 'ready',
      areaId: 'finance',
      createdAt: '2025-12-15T10:00:00',
      updatedAt: '2025-12-15T10:00:00',
      notes: `Might be leaving money on the table. Check if there's a better card for my spending patterns.`,
    },
    {
      id: 'finance-direct-2',
      title: 'Update beneficiaries on retirement accounts',
      status: 'ready',
      areaId: 'finance',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      due: '2026-01-31',
    },
    {
      id: 'coding-direct-1',
      title: 'Clean up GitHub profile README',
      status: 'ready',
      areaId: 'coding',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
    },
    {
      id: 'family-direct-1',
      title: 'Send thank you notes for Christmas gifts',
      status: 'ready',
      areaId: 'family-friends',
      createdAt: '2025-12-26T10:00:00',
      updatedAt: '2025-12-26T10:00:00',
      due: '2026-01-05',
    },
    {
      id: 'family-direct-2',
      title: "RSVP to cousin's wedding",
      status: 'ready',
      areaId: 'family-friends',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      due: '2026-01-15',
      notes: `Wedding is in May. Need to check if partner can take time off.`,
    },

    // ==========================================================================
    // ORPHAN tasks - No project, no area
    // ==========================================================================
    {
      id: 'orphan-1',
      title: 'Renew passport',
      status: 'ready',
      createdAt: '2025-12-15T10:00:00',
      updatedAt: '2025-12-15T10:00:00',
      due: '2026-03-01',
      notes: `Expires in 6 months. Need new photos.`,
    },
    {
      id: 'orphan-2',
      title: 'Get car inspected',
      status: 'ready',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      due: '2026-01-31',
    },
    {
      id: 'orphan-3',
      title: 'Cancel unused Spotify family plan',
      status: 'ready',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      notes: `Only I'm using it now. Switch to individual plan and save $10/month.`,
    },
    {
      id: 'orphan-4',
      title: 'Backup photos to external drive',
      status: 'ready',
      createdAt: '2025-12-22T10:00:00',
      updatedAt: '2025-12-22T10:00:00',
      scheduled: '2026-01-01',
    },
    {
      id: 'orphan-5',
      title: 'Update home insurance policy',
      status: 'icebox',
      createdAt: '2025-12-10T10:00:00',
      updatedAt: '2025-12-10T10:00:00',
      deferUntil: '2026-06-01',
      notes: `Policy renews in June. Compare quotes a month before.`,
    },
    {
      id: 'orphan-6',
      title: 'Fix the squeaky door in bathroom',
      status: 'ready',
      createdAt: '2025-12-25T10:00:00',
      updatedAt: '2025-12-25T10:00:00',
      notes: `Just needs WD-40. Been procrastinating.`,
    },

    // ==========================================================================
    // Dropped tasks (for realism)
    // ==========================================================================
    {
      id: 'dropped-1',
      title: 'Learn piano',
      status: 'dropped',
      createdAt: '2025-06-01T10:00:00',
      updatedAt: '2025-09-15T10:00:00',
      completedAt: '2025-09-15T10:00:00',
      notes: `Bought a keyboard, practiced twice. Just not a priority right now. Maybe someday.`,
    },
    {
      id: 'dropped-2',
      title: 'Start a YouTube channel',
      status: 'dropped',
      projectId: 'marketing-2',
      createdAt: '2025-08-01T10:00:00',
      updatedAt: '2025-10-01T10:00:00',
      completedAt: '2025-10-01T10:00:00',
      notes: `The time investment is too high for uncertain return. Sticking with written content.`,
    },

    // ==========================================================================
    // DEFERRED tasks (no scheduled, only deferUntil) - for calendar view testing
    // ==========================================================================
    {
      id: 'deferred-1',
      title: 'Follow up on job application',
      status: 'ready',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      deferUntil: '2025-12-30',
      notes: `Applied two weeks ago. Wait until after holidays to follow up.`,
    },
    {
      id: 'deferred-2',
      title: 'Check on package delivery status',
      status: 'ready',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      deferUntil: '2025-12-31',
      notes: `Expected delivery by Dec 31. Check tracking if not arrived.`,
    },
    {
      id: 'deferred-3',
      title: 'Review gym membership trial',
      status: 'ready',
      areaId: 'health',
      createdAt: '2025-12-15T10:00:00',
      updatedAt: '2025-12-15T10:00:00',
      deferUntil: '2026-01-02',
      notes: `Free trial ends Jan 5. Decide if worth keeping.`,
    },
    {
      id: 'deferred-4',
      title: 'Send invoice for December work',
      status: 'ready',
      areaId: 'finance',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      deferUntil: '2026-01-01',
      notes: `Wait until new year to invoice.`,
    },

    // ==========================================================================
    // OVERDUE tasks (scheduled + due date in past) - for calendar view testing
    // ==========================================================================
    {
      id: 'overdue-1',
      title: 'Submit expense report',
      status: 'ready',
      areaId: 'finance',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      scheduled: '2025-12-30',
      due: '2025-12-28',
      notes: `Was due before Christmas, still need to do it.`,
    },
    {
      id: 'overdue-2',
      title: 'Reply to client email',
      status: 'ready',
      projectId: 'marketing-1',
      createdAt: '2025-12-26T10:00:00',
      updatedAt: '2025-12-26T10:00:00',
      scheduled: '2025-12-31',
      due: '2025-12-29',
      notes: `Should have replied by now. Urgent.`,
    },

    // ==========================================================================
    // Tasks with DUE dates this week (for due date indicator testing)
    // ==========================================================================
    {
      id: 'due-indicator-1',
      title: 'Pay electricity bill',
      status: 'ready',
      areaId: 'finance',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      due: '2025-12-31',
      notes: `Auto-pay didn't go through, need to pay manually.`,
    },
    {
      id: 'due-indicator-2',
      title: 'Submit Q4 report',
      status: 'ready',
      projectId: 'marketing-1',
      createdAt: '2025-12-20T10:00:00',
      updatedAt: '2025-12-20T10:00:00',
      due: '2025-12-31',
    },
    {
      id: 'due-indicator-3',
      title: 'Renew domain registration',
      status: 'ready',
      areaId: 'coding',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      due: '2026-01-02',
    },
    {
      id: 'due-indicator-4',
      title: 'Send birthday card to mom',
      status: 'ready',
      areaId: 'family-friends',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      due: '2026-01-03',
    },

    // ==========================================================================
    // Tasks scheduled for THIS WEEK
    // ==========================================================================
    {
      id: 'week-task-1',
      title: 'Review 2024 and set 2025 goals',
      status: 'ready',
      createdAt: '2025-12-28T10:00:00',
      updatedAt: '2025-12-28T10:00:00',
      scheduled: '2025-12-31',
      notes: `End of year reflection. What worked, what didn't, what to change.`,
    },
    {
      id: 'week-task-2',
      title: 'Prepare for Monday standup',
      status: 'ready',
      projectId: 'marketing-1',
      createdAt: '2025-12-30T08:00:00',
      updatedAt: '2025-12-30T08:00:00',
      scheduled: '2026-01-05',
    },

    // ==========================================================================
    // Tasks with TODAY scheduled
    // ==========================================================================
    {
      id: 'today-1',
      title: 'Finish data structure exploration',
      status: 'in-progress',
      projectId: 'coding-2',
      createdAt: '2025-12-30T08:00:00',
      updatedAt: '2025-12-30T10:00:00',
      scheduled: '2025-12-30',
    },
    {
      id: 'today-2',
      title: '30 minute walk after lunch',
      status: 'ready',
      areaId: 'health',
      createdAt: '2025-12-30T08:00:00',
      updatedAt: '2025-12-30T08:00:00',
      scheduled: '2025-12-30',
    },
    {
      id: 'today-3',
      title: "Reply to Alex's email about project collab",
      status: 'ready',
      createdAt: '2025-12-30T09:00:00',
      updatedAt: '2025-12-30T09:00:00',
      scheduled: '2025-12-30',
      notes: `He reached out about potentially working together on an open source project. Need to think through bandwidth.`,
    },
  ],
}

// -----------------------------------------------------------------------------
// Lookup Helpers
// -----------------------------------------------------------------------------

export function getAreaById(id: string): Area | undefined {
  return appData.areas.find((a) => a.id === id)
}

export function getProjectById(id: string): Project | undefined {
  return appData.projects.find((p) => p.id === id)
}

export function getTaskById(id: string): Task | undefined {
  return appData.tasks.find((t) => t.id === id)
}

// -----------------------------------------------------------------------------
// Relationship Helpers
// -----------------------------------------------------------------------------

/**
 * Get all projects belonging to an area.
 */
export function getProjectsByAreaId(areaId: string): Project[] {
  return appData.projects.filter((p) => p.areaId === areaId)
}

/**
 * Get all projects that have no area.
 */
export function getOrphanProjects(): Project[] {
  return appData.projects.filter((p) => !p.areaId)
}

/**
 * Get all tasks belonging to a project.
 */
export function getTasksByProjectId(projectId: string): Task[] {
  return appData.tasks.filter((t) => t.projectId === projectId)
}

/**
 * Get the effective area ID for a task.
 * Prefers the task's direct areaId, falls back to the project's areaId.
 */
export function getEffectiveAreaId(task: Task): string | undefined {
  if (task.areaId) return task.areaId
  if (task.projectId) {
    const project = getProjectById(task.projectId)
    return project?.areaId ?? undefined
  }
  return undefined
}

/**
 * Get all tasks belonging to an area (directly or via project).
 */
export function getTasksByAreaId(areaId: string): Task[] {
  return appData.tasks.filter((t) => getEffectiveAreaId(t) === areaId)
}

/**
 * Get all tasks that have no project and no area.
 */
export function getOrphanTasks(): Task[] {
  return appData.tasks.filter((t) => !t.projectId && !t.areaId)
}

/**
 * Get all tasks that have an area but no project.
 */
export function getAreaDirectTasks(areaId: string): Task[] {
  return appData.tasks.filter((t) => t.areaId === areaId && !t.projectId)
}

// -----------------------------------------------------------------------------
// Derived Value Helpers
// -----------------------------------------------------------------------------

/**
 * Calculate completion percentage for a project based on its tasks.
 * Returns 0-100, or 0 if no tasks exist.
 */
export function getProjectCompletion(projectId: string): number {
  const tasks = getTasksByProjectId(projectId)
  if (tasks.length === 0) return 0

  const completedCount = tasks.filter(
    (t) => t.status === 'done' || t.status === 'dropped'
  ).length

  return Math.round((completedCount / tasks.length) * 100)
}

/**
 * Get tasks filtered by status.
 */
export function getTasksByStatus(status: Task['status']): Task[] {
  return appData.tasks.filter((t) => t.status === status)
}

/**
 * Get tasks scheduled for a specific date.
 */
export function getTasksScheduledFor(date: string): Task[] {
  return appData.tasks.filter((t) => t.scheduled === date)
}

/**
 * Get tasks due on or before a specific date.
 */
export function getTasksDueBy(date: string): Task[] {
  return appData.tasks.filter((t) => t.due && t.due <= date)
}

/**
 * Get active (non-archived) areas.
 */
export function getActiveAreas(): Area[] {
  return appData.areas.filter((a) => a.status !== 'archived')
}

/**
 * Get active projects (not done or paused) for an area.
 */
export function getActiveProjectsByAreaId(areaId: string): Project[] {
  return appData.projects.filter(
    (p) => p.areaId === areaId && p.status !== 'done' && p.status !== 'paused'
  )
}

/**
 * Get all active tasks (not done, dropped, or deferred past today).
 */
export function getActiveTasks(today: string): Task[] {
  return appData.tasks.filter((t) => {
    if (t.status === 'done' || t.status === 'dropped') return false
    if (t.deferUntil && t.deferUntil > today) return false
    return true
  })
}
