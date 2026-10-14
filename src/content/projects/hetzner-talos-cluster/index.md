---
title: Production Kubernetes on Hetzner Cloud
summary: A four node Talos Linux cluster on Hetzner Cloud, built entirely in Terraform, that runs my own apps and self hosted services.
outcome: One Terraform repository rebuilds a hardened, monitored cluster that my apps deploy to through Git.
kind: personal
client:
  description: My own products and the self hosted tools I rely on every day
role: Sole engineer
start: '2024-10'
stack:
  - kubernetes
  - talos
  - terraform
  - hetzner
  - argocd
  - cilium
  - longhorn
  - prometheus
  - grafana
services:
  - infrastructure
  - platform-engineering
  - observability
  - security
cover: ./cover.png
coverAlt: Four connected squares, one control plane and three workers, on a warm paper background beside the title Production Kubernetes on Hetzner Cloud
metrics:
  - value: '4'
    label: nodes, 32 cores and 64 GB of memory
  - value: '28'
    label: Terraform files, six providers
  - value: '2'
    label: replicas of every storage volume
order: 10
featured: true
---

## Problem

My apps and the tools I use every day (Git hosting, workflow automation, single sign on, Postgres) had outgrown a single machine at home. I wanted somewhere real to run them: a cluster I could rebuild from scratch, that told me when something was wrong, and that I would trust with production data. I also wanted to practise the work the way a team does it, with everything written down as code rather than clicked together in a dashboard.

## Approach

I chose Talos Linux on Hetzner Cloud. Talos has no shell and no SSH, so every node is configured through its API and nothing drifts by hand. Hetzner gives me predictable European pricing. The whole cluster, one control plane and three workers, is described in Terraform: 28 files, six providers and about 200 variables. Destroying it and building it again is one command.

On top of that:

- **Networking:** Cilium replaces kube proxy with eBPF, encrypts traffic between nodes with WireGuard, enforces network policies, and shows me live traffic through Hubble.
- **Storage:** Longhorn keeps two replicas of every volume, on a dedicated Hetzner volume per worker, and exposes its own metrics.
- **Traffic in:** NGINX Ingress with cert-manager, so every service gets a Let's Encrypt certificate that renews itself.
- **Delivery:** Argo CD syncs the cluster from Git. If it is not in a repository, it is not running.
- **Seeing what happens:** Prometheus and Grafana, installed with Helm, with alert rules that post to Discord.
- **Security:** LUKS2 disk encryption, OIDC sign in through Authentik, my own RBAC roles and bindings, and pod security standards on every namespace.

## Outcome

The cluster runs my own products, including Vowmory, an event photo sharing app, with autoscaling and monitoring, alongside Forgejo, n8n, Authentik and CloudNativePG. Changes reach it through a pull request and Argo CD, alerts land in Discord, and a full rebuild is a Terraform run rather than a weekend.
