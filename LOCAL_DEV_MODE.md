# Local Development Without Authentication

This document explains how to run the application in local development mode without authentication.

## Overview

For faster local development, you can bypass the Entra ID authentication flow by setting the `LOCAL_DEV_MODE` flag. This is useful when:
- You want to test frontend features without setting up authentication
- You're working on non-auth related features
- You don't have access to the Entra ID tenant

## How to Enable

### Frontend

Edit `frontend/.env.local` and set:
```bash
VITE_LOCAL_DEV_MODE=true
```

### Backend

Edit `backend/WebApp.Api/.env` and set:
```bash
LOCAL_DEV_MODE=true
```

## What Changes

### Frontend
- MSAL (Microsoft Authentication Library) is not initialized
- No authentication redirects occur
- A mock user identity is used: `{ name: 'Local Developer', username: 'dev@local' }`
- Token acquisition returns a mock token: `mock-token-local-dev`

### Backend
- JWT validation is bypassed
- Authorization policies always allow requests
- A mock claims principal is created with:
  - Name: "Local Developer"
  - Object ID: "local-dev-user-id"

## Using the Start Script

The `start-local-dev.ps1` script automatically sets `LOCAL_DEV_MODE=true` for the backend:

```powershell
.\deployment\scripts\start-local-dev.ps1
```

This will:
1. Set backend environment variable `LOCAL_DEV_MODE=true`
2. Start backend on port 8080 without auth
3. Start frontend on port 5173 without auth
4. Open browser to http://localhost:5173

## Production Deployment

**Important**: These environment variables are only for local development. They are NOT set in production.

When deploying to Azure:
- `azd up` or `.\deployment\scripts\deploy.ps1` do NOT set these variables
- Full authentication is always enabled in production
- MSAL and JWT validation work normally

## Security Notes

⚠️ **Never deploy to production with LOCAL_DEV_MODE enabled**

- This mode completely bypasses authentication
- It should only be used on localhost
- The `.env` files are gitignored to prevent accidental commits

## Switching Between Modes

To switch from local dev mode to authenticated mode:

1. Edit `frontend/.env.local`:
   ```bash
   VITE_LOCAL_DEV_MODE=false
   ```

2. Edit `backend/WebApp.Api/.env`:
   ```bash
   LOCAL_DEV_MODE=false
   ```

3. Restart both servers

## Troubleshooting

### "VITE_ENTRA_SPA_CLIENT_ID is not set" error
- If you set `VITE_LOCAL_DEV_MODE=false`, you need valid Entra ID credentials
- Run `azd up` to generate proper `.env` files with real credentials

### Backend returns 401 Unauthorized
- Verify `LOCAL_DEV_MODE=true` is set in `backend/WebApp.Api/.env`
- Check the backend terminal output for "[Program] Running in LOCAL DEV MODE"

### Frontend shows "Signing in..."
- Verify `VITE_LOCAL_DEV_MODE=true` is set in `frontend/.env.local`
- Check browser console for "[main] Running in LOCAL DEV MODE"
- Hard refresh the browser (Ctrl+Shift+R)
