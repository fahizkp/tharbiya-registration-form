# Tharbiya 2026 - Render Deployment Guide

## Frontend Deployment (Static Site)

### 1. Create Static Site on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Static Site**
3. Connect your GitHub repository

### 2. Configure Build Settings

- **Name**: `tharbiya-registration-form-frontend`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build`

### 3. Environment Variables

Add this environment variable:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://your-backend-name.onrender.com` |

**Example**: `https://tharbiya-backend.onrender.com`

### 4. Deploy

Click **Create Static Site** and Render will automatically build and deploy!

---

## Backend Deployment (Web Service)

### 1. Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository

### 2. Configure Build Settings

- **Name**: `tharbiya-backend`
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node app.js`

### 3. Environment Variables

Add all variables from your `backend/.env.example`:

| Key | Value |
|-----|-------|
| `SPREADSHEET_ID` | Your Google Sheet ID |
| `GOOGLE_AUTH_EMAIL` | Service account email |
| `GOOGLE_AUTH_PRIVATE_KEY` | Service account private key |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin password |
| `JWT_SECRET` | Random secret string |
| `PORT` | Leave empty (Render auto-assigns) |

### 4. Deploy

Click **Create Web Service** and wait for deployment!

---

## After Deployment

### Update CORS

Once both services are deployed, update `backend/app.js` CORS config with your frontend URL:

```javascript
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://tharbiya-registration-form-frontend.onrender.com' // Your frontend URL
    ],
    credentials: true,
    optionsSuccessStatus: 200
};
```

Commit and push this change to trigger a new backend deployment.

---

## Testing

1. Visit your frontend URL: `https://your-frontend.onrender.com`
2. Test registration form
3. Go to `/login` and login with admin credentials
4. Check dashboard at `/admin`

---

## Troubleshooting

**Build Fails with TypeScript Error**
- Make sure TypeScript 4.9.5 is in dependencies
- Check package.json has `"typescript": "^4.9.5"`

**CORS Error**
- Verify backend CORS includes your frontend URL
- Redeploy backend after updating CORS

**API Connection Error**
- Check `REACT_APP_API_URL` is set correctly on frontend
- Verify backend is running and accessible

**Google Sheets Not Working**
- Verify all Google credentials in backend env vars
- Ensure private key has proper line breaks (`\n`)
- Check sheet is shared with service account email
