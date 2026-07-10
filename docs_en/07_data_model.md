# Data model

## Entity: User

| Field | Type | Required | Description |
|---|---|---|---|
| id | UUID | Yes | Unique identifier |
| name | String | Yes | User name |
| email | String | Yes | Unique email |
| password_hash | String | Yes | Hashed password |
| role | String | Yes | admin/user |
| status | String | Yes | active/inactive |
| created_at | DateTime | Yes | Creation date |

## Rules

- The email must be unique.
- The password is never stored in plain text.
- An inactive user cannot log in.
