---
lang: "en"
routeSlug: "hrs"
title: "HRS — Hotel Reservation System"
description: "A hotel booking web app where guests handle everything from reservation to check-out themselves, built from UML analysis and design through implementation."
fromDate: "2026-06"
toDate: "2026-07"
code: "https://github.com/97kuek/HRS"
url: "https://hrs-ruddy.vercel.app"
types:
  - "coursework"
  - "product"
skills:
  - "TypeScript"
  - "Next.js"
  - "React"
  - "Prisma"
  - "PostgreSQL"
  - "Vitest"
  - "Vercel"
  - "UML"
selected: true
---

## Overview

HRS is a hotel reservation system built as a team project for the Software Engineering A course.
Guests can book a room, look up or cancel a reservation, check in, and check out entirely on their
own, without going through the front desk.

The point of the assignment was object-oriented analysis and design in UML, and then implementing
exactly what that design described. The repository therefore keeps the design documents and the
implementation side by side.

## Features

| Feature | Description |
| --- | --- |
| Reservation | Book by entering dates, room, and guest details |
| Lookup | Retrieve a reservation by number and lead guest name |
| Cancellation | Cancel a reservation by number and lead guest name |
| Check-in | Verify the reservation and assign a room |
| Check-out | Confirm charges and payment method, then complete the stay |
| Email | Sent on booking, cancellation, the day before arrival, and at check-out |

The day-before reminder runs as a Vercel Cron Job every day at 9:00 JST.

## Stack

The application is TypeScript on Next.js App Router and React, with Route Handlers for the API,
Prisma for data access, and PostgreSQL (Neon or Docker) as the database. Email goes through Resend,
tests run on Vitest, and deployment is Vercel plus Neon.

## What I worked on

The question I spent the most time on was how to keep the implementation from drifting away from the
design. The responsibilities settled in the class and sequence diagrams became the module boundaries
directly, and the rules that matter to the specification — such as matching a reservation by number
and guest name — are pinned down by tests.
