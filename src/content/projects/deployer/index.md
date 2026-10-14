---
title: Deployer, a deploy platform for AI coding agents
summary: A small internal platform that lets an AI coding agent deploy the app it just wrote onto my Kubernetes cluster, over MCP, and get back a working HTTPS address.
outcome: An agent goes from source code to a live, fenced HTTPS app with one tool call, and nobody touches kubectl.
kind: personal
client:
  description: AI coding agents, and the people who run them on my cluster
role: Sole engineer
start: '2026-08'
stack:
  - go
  - kubernetes
  - sqlite
  - argocd
  - mcp
services:
  - platform-engineering
  - backend
  - security
cover: ./cover.png
coverAlt: A row of boxes joined by arrows, from source to build to a live address, on a warm paper background beside the title Deployer
metrics:
  - value: '1'
    label: tool call from source to a live URL
  - value: '12'
    label: named failure reasons
links:
  - kind: code
    url: https://github.com/toyinogun/deployer
order: 20
featured: true
---

## Problem

AI coding agents can write a working app in minutes, then stop at the hard part: getting it running somewhere real. Handing an agent `kubectl` and cluster credentials is not safe, and doing the deploy by hand every time defeats the point. I wanted the agent to deploy on its own, inside limits I set.

## Approach

Deployer is one Go binary running as a single pod inside the cluster. The agent uploads a source tarball and calls one MCP tool, `deploy_app`. The platform then:

1. Checks the archive before unpacking it, refusing absolute paths, `..`, links and device files, and anything over the size and file count limits.
2. Builds the image in a Kubernetes Job, with Cloud Native Buildpacks, or with rootless BuildKit when the project ships its own Dockerfile.
3. Refuses any image that runs as root.
4. Pushes it to a registry inside the cluster and writes the Deployment, Service and Ingress field by field in Go, not from YAML templates.
5. Waits for the app to answer, then returns its HTTPS address.

The rest grew from using it. The deploy call returns straight away and a `deployment_status` tool reports progress, so a slow build never hits a client timeout. Every failure carries one of twelve named reasons instead of raw build output. `get_logs` lets the agent read its own app's output with secrets blanked out. Every app namespace gets a default deny network policy, so an agent's app cannot reach my other apps or the cluster's own services. Accounts, API tokens and per app configuration came next.

I kept the stack small on purpose: the standard library's HTTP server, SQLite with generated queries, and `client-go`. Argo CD delivers the platform itself, pinned to the image CI built.

## Outcome

An agent now goes from source to a running HTTPS app with one call, and redeploying under the same name keeps the same address. It stays a personal homelab project and is still early, but the safety rules (no root images, fenced networks, checked uploads) are in place from the first slice, not added later.
