---
lang: "en"
routeSlug: "toggl-slack-tasks"
title: "Toggl Slack Tasks"
description: "A self-deployed task bot that brings Moodle assignments and manual tasks into Slack and starts Toggl time tracking from the same interface."
fromDate: "2026-08"
code: "https://github.com/97kuek/toggl-slack-tasks"
types:
  - "product"
  - "tool"
  - "open-source"
skills:
  - "TypeScript"
  - "Cloudflare Workers"
  - "Cloudflare D1"
  - "Slack API"
  - "Moodle API"
  - "Toggl API"
selected: true
---

## Problem

University assignments lived in Moodle, research and work tasks lived elsewhere, and the time spent on them lived in Toggl Track.
When checking a deadline and starting the work happen in different places, keeping the records becomes work of its own.

I made Slack—the place I already open throughout the day—the task surface, then connected Moodle imports, manual tasks, time tracking, and notifications behind it.

## Design decisions

The center of the system is the task shown in Slack and its local time record, not either external service.
Moodle and Toggl are replaceable integrations, so the rest of the product still works when either one is absent.

Moodle does not provide a webhook for this use case, so Cloudflare Cron Triggers poll for changes every 15 minutes.
Both reconciliation and notification delivery are idempotent, preventing the same assignment from being announced repeatedly and allowing a later run to recover from a temporary failure.

Slack expects an acknowledgement within three seconds. A button press therefore updates D1 and redraws App Home first, then synchronizes with Toggl afterward.
The action feels immediate even when an external API takes several seconds; only a failed synchronization rolls the state back and shows a warning.

## Keeping notifications useful

Notifications are limited to a new assignment, the previous day, and three hours before the deadline. Items due at the same time are always combined into one message.
Quiet hours, a morning digest, and a weekly summary are configurable, while delivery records prevent duplicate messages.

Submitted assignments can complete automatically, and tasks are archived 24 hours after their deadline.
This keeps forgotten completion clicks from turning the task list into a backlog nobody trusts.

## Distribution and credentials

This is intentionally not a multi-tenant service. Each user deploys one environment to their own Cloudflare account, so the project never holds another person's Moodle, Slack, or Toggl credentials.
The architecture is designed to stay within the free tiers of Cloudflare Workers and D1.

Bootstrap scripts guide D1 creation, configuration, migrations, and deployment. Once installed, connection and notification settings are managed from Slack itself.

## Outcome

Moodle deadlines, Slack task actions, and Toggl tracking now form one continuous flow in Slack App Home.
The repository also records the design rationale, failure behavior, and operating procedure so the personal tool remains reproducible rather than depending on one machine or memory.
