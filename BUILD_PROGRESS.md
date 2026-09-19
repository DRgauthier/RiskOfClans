# Build Progress & Architecture Log

## Overview
This file serves as a persistent work log and architecture reference across development sessions for the asynchronous RTS browser game.

## Core Architecture
- **Rendering:** Phaser 3 (for Home Base square grid and Overworld hex grid)
- **UI:** HTML/CSS DOM overlays (for Auth, building menus, troop training)
- **Backend/State:** Supabase (Server-Side Authority)
- **Build/Deployment:** Vite + GitHub Actions -> GitHub Pages

## Database Engine Principles
1. Client requests actions (e.g., build).
2. Database stores timestamps (`started_at`, `duration`).
3. Resources are calculated server-side on-demand based on `last_collection_time` and `generation_rate`.
4. Crons/Triggers (`pg_cron`) handle asynchronous logic (combat resolution, construction completion).

## Session Log & Milestones

### Session 1 (Current)
**Goal:** Establish rock-solid foundation.
- [x] Clear old prototype files.
- [x] Initialize Vite project (vanilla-ts) and install dependencies (Phaser, Supabase).
- [x] Create this `BUILD_PROGRESS.md` file.
- [x] Set up GitHub Actions for GitHub Pages deployment.
- [x] Write foundational SQL scripts (schemas, seed generator for Hex Overworld, basic RLS).
- [x] Implement UI DOM overlays for Supabase Auth.
- [x] Scaffold Phaser 3 basic scenes (Boot, HomeBase, Overworld).
