---
lang: "en"
routeSlug: "kei-agent"
title: "Kei Agent"
image: "../../assets/photos/dots-architecture-en.webp"
imageAlt: "Requests pass from Slack or a voice call to Dot, then to plugins, Codex Cloud, or Codex on Mac. Results return to Slack for personal review and decisions."
description: "A personal assistant connecting OpenAI Dots to a Mac execution service through MCP, with Python and A2A workers, asynchronous runs, scoped permissions, and external data synchronization."
fromDate: "2026-09"
code: "https://github.com/97kuek/kei-agent"
types:
  - "product"
  - "tool"
  - "open-source"
programmingLanguages:
  - "Python"
skills:
  - "Python"
  - "OpenAI Dots"
  - "MCP"
  - "A2A"
  - "SQLite"
  - "Claude Code"
  - "Codex"
  - "Notion API"
selected: true
---

## Overview

Kei Agent combines conversations and service integrations through OpenAI Dots with code execution and data synchronization on my Mac.
Research, coursework, work, and time tracking are individual modules that can be enabled as needed.

This page describes the architecture and implementation. For everyday workflows and setup, see the separate blog post, [Building a Personal Assistant with OpenAI Dots](/en/blog/kei-agent).

## Architecture

| Layer | Responsibility | Main technologies |
| --- | --- | --- |
| Conversation and integrations | Receive Slack and voice requests, access information through plugins, and delegate local tasks | OpenAI Dots, plugins |
| Execution service | Handle MCP requests, run state, notifications, and schedules | Python, MCP, SQLite |
| Workers | Execute tasks with workspace-specific accounts and permissions | A2A, Claude Code / Codex CLI |
| Import and storage | Import Moodle and Toggl data and synchronize it with services such as Notion | External APIs, Notion gateway |

Local services run under `launchd`. Inter-process communication uses the loopback interface, and Dot reaches the MCP server through Secure MCP Tunnel.
The Mac execution service does not connect directly to Slack; Dot handles replies and posting.

## Asynchronous execution through MCP

The main execution interface consists of `workspaces`, `run`, and `status`.

1. `workspaces` lists available workspaces and execution engines.
2. `run` accepts a workspace, request, and workload level.
3. Short tasks return their result; longer tasks return a request ID.
4. `status` reports queued, running, done, needs-input, or failed state and the result.

The service resolves the worker, account, and permissions from the workspace, then delegates through A2A.
Research uses the Claude Code or Codex CLI; work uses the company Claude Code account.
Run records include the worker, use case, provider, model, elapsed time, cost, and failures.

Notifications are stored in an Outbox and retrieved by Dot through `notices`. They remain pending until successful delivery is acknowledged, distinguishing retrieval from completed delivery.

## Modules and integrations

`module.toml` declares each module, `agents.csv` controls activation and account assignments, and `schedules.csv` controls recurring jobs.
Module API versions, configuration keys, and conflicting use cases or ports are validated during loading.

- **Research and work:** Edit code and run tests in topic- or project-specific directories.
- **Coursework:** Import Moodle deadlines without AI and synchronize submission and exam-completion state when the Moodle API is configured.
- **Time tracking:** Control a timer through MCP and integrate with Toggl and Notion.
- **Notion:** Use a local gateway to restrict each worker to its assigned homes.

Questions about course materials and new reading discovery or summarization are handled by Dot's plugins.
Deterministic synchronization and AI-driven tasks run in separate parts of the system.

## Permissions and execution boundaries

The execution service controls writable locations, denied reads, outbound networking, and the environment variables passed to child processes.
Workers reading company data have outbound networking disabled. Other accounts' workspaces and secret material are also subject to access restrictions.

Claude Code and Codex receive worker-specific configuration instead of inheriting the user's regular settings.
Dot's plugin authentication and local worker credentials are managed separately.

## Operations and extension

`kei-agent setup` prepares configuration and background services; `kei-agent doctor` checks their state.
The CLI also provides module scaffolding, testing, and activation.

When morning planning or evening reviews move to Dot, their local schedules are disabled. Imports that need local credentials, maintenance, and backups remain on the Mac to avoid duplicate execution.
Local execution and synchronization stop while the Mac is asleep, leaving synchronized information at its last imported state.

The implementation and configuration documentation are maintained in the [GitHub repository](https://github.com/97kuek/kei-agent).
