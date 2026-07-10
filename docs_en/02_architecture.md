# System architecture

## Overview

Brief description of how the system works.

## Technology stack

- Frontend:
- Backend:
- Database:
- Authentication:
- Hosting:
- Repository:

## General diagram

User → Frontend → Backend/API → Database

## Main modules

| Module | Responsibility |
|---|---|
| Authentication | Handling of login, logout and session |
| Users | User administration |
| Records | Main CRUD of the system |
| Configuration | General parameters |

## Architecture rules

- Separate frontend, backend and database.
- Do not mix business logic with visual components.
- Do not write direct database queries from the frontend.
- Every new feature must have minimal tests.
- Every relevant change must be associated with an issue or feature document.

## Important decisions

See the `/decisions` folder.
