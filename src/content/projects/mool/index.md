---
title: Mool, a self hosted screen recorder
summary: My own version of Loom, a browser based screen recorder that runs on a home server and stores recordings in Cloudflare R2, for a fraction of the cost.
outcome: Record in the browser, share a short link, and pay mostly for storage, with nothing exposed on my home network.
kind: personal
client:
  description: Me, and anyone I send a quick screen recording to
role: Sole engineer
start: '2026-05'
end: '2026-05'
stack:
  - typescript
  - nodejs
  - postgres
  - cloudflare-r2
  - docker
services:
  - backend
  - frontend
  - security
cover: ./cover.png
coverAlt: A round record button inside a browser window outline, on a warm paper background beside the title Mool
links:
  - kind: code
    url: https://github.com/toyinogun/mool
order: 40
---

## Problem

I send a lot of short screen recordings, and paying a monthly subscription per seat for that felt like too much for what it is. I wanted the same flow, record, get a link, send it, on hardware I already own, without opening ports on my home network.

## Approach

The browser does the recording with `getDisplayMedia` and `MediaRecorder`, then uploads the video straight to Cloudflare R2 with a presigned URL. A small Node and Express server only hands out those URLs and keeps track of the recordings, so video never passes through my home connection on the way up or on the way back.

Each recording gets a short six character link. The bucket is private: the viewer page asks the server for a short lived signed link every time it loads. Sign in is by magic link email through Resend, with no passwords to store. Postgres, through Drizzle, holds users and recordings, and its migrations run at start up. A Cloudflare Tunnel puts the app on the internet with no port forwarding and no exposed home IP.

## Outcome

Mool reached v0.4 with accounts, a library of my recordings, private storage and Postgres. It runs as one Docker Compose stack on my home server, and the main running cost is R2 storage, which has a free tier.
