# API

## POST /api/login

### Purpose

Allow a user to log in.

### Request

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

### Successful response

```json
{
  "userId": "123",
  "name": "Demo User",
  "role": "admin"
}
```

### Errors

| Code | Cause |
|---|---|
| 400 | Incomplete data |
| 401 | Invalid credentials |
| 403 | Inactive user |

### Related requirements

- FR-001
- NFR-001
- NFR-002
