---
lang: "en"
routeSlug: "wasa-chat"
title: "WASA Chat"
image: "../../assets/photos/wasa-test-flight.jpg"
description: "A citation-backed RAG chatbot that answers questions across an internal wiki and public documents, running on Cloudflare Pages and Cloud Run."
fromDate: "2026-08"
code: "https://github.com/97kuek/wasa-chat"
url: "https://wasa-chat.pages.dev/"
types:
  - "product"
  - "open-source"
skills:
  - "Go"
  - "Python"
  - "TypeScript"
  - "RAG"
  - "LLM"
  - "Google Cloud Run"
  - "Firestore"
  - "Cloudflare Pages"
  - "Docker"
selected: true
---

## Overview

WASA, the human-powered aircraft project at Waseda University, keeps its knowledge spread across a
handover wiki and a set of public documents. Finding the right page was the bottleneck, so I am
building a chatbot that answers questions about all of it in natural language.

Every answer carries its sources, and the numbered links in the text lead back to the original
document. The index currently covers the handover wiki, the official site, and the flight simulator
guide (FEE).

## Features

- Citation-backed chat, including questions with attached images
- A shared assistant and up to 30 conversations of history
- An admin view for usage, estimated API budget, document updates, and audit logs
- Admin rights granted to individual wiki accounts instead of one shared account

## Architecture

The interface runs on Cloudflare Pages, while authentication, retrieval, answer generation, and the
admin API run on Cloud Run. The index — which contains wiki text — lives in a private Cloud Storage
bucket, and history and usage data go to Firestore.

Rather than fetching from the wiki on every question, the system searches an index built ahead of
time. That keeps answers fast and keeps load and cost on external services low. Admins can check for
changed documents from the dashboard, but rebuilding the index and shipping it to production stays a
deliberate, human-reviewed step.

## Status

The project is in production and in an accuracy-improvement phase. Because it will be handed over to
future members, the reasoning behind each design decision and the operational runbooks are kept as
documentation in the repository.

The code is MIT licensed; the wiki content and retrieved data belong to the WASA project and are not
covered by that license.
