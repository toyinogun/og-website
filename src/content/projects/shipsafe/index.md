---
title: ShipSafe, trust scores for AI written code
summary: A self hosted CI tool that checks every pull request, especially AI written ones, and gives it a trust score from 0 to 100.
outcome: Every pull request gets a green, yellow or red trust score and a commit status a team can gate merges on.
kind: personal
client:
  description: Teams merging more AI written code than they can review by hand
role: Sole engineer
start: '2026-02'
end: '2026-02'
stack:
  - go
  - docker
services:
  - ci-cd
  - security
cover: ./cover.png
coverAlt: A semicircle gauge pointing into its green band, on a warm paper background beside the title ShipSafe
metrics:
  - value: '0 to 100'
    label: trust score on every pull request
  - value: '5'
    label: static analyzers
  - value: '3'
    label: Git platforms supported
links:
  - kind: code
    url: https://github.com/toyinogun/shipsafe
order: 30
featured: true
---

## Problem

More and more code reaching a pull request is written by AI, and reviewers cannot read it all as carefully as it deserves. Many teams also cannot send their source to a third party service to have it checked. I wanted a check that runs on the team's own infrastructure and turns "should I trust this change?" into a clear answer.

## Approach

ShipSafe is a single Go binary that runs in the CI pipeline, between the code being written and the merge. It reads the diff and runs five static analyzers over it: complexity, test coverage, leaked secrets, risky imports and known bad patterns. An optional AI review, through any OpenAI compatible endpoint, looks for logic bugs and missed edge cases. The results combine into one score from 0 to 100, rated green, yellow or red against thresholds set in `.shipsafe.yml`.

In CI mode it detects where it is running, posts a comment on the pull request and sets a commit status, so a red score can block the merge. It works with GitHub, GitLab and Forgejo. I kept the AI review optional and off by default, so the tool is useful, and keeps code private, without any model at all.

## Outcome

I released `v0.3.0-alpha` with binaries for Linux and Apple silicon Macs, and ready to copy workflows for GitHub Actions and Forgejo Actions. Adding it to a repository takes one workflow file, and every pull request then gets a trust score and a status check.
