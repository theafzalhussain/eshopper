# Deployment Configuration Guide

## GitHub Actions Deployment Setup

This project uses GitHub Actions to automatically deploy to both **Render** (backend) and **Vercel** (frontend).

### Required GitHub Secrets

Add these secrets to your GitHub repository: `Settings → Secrets and variables → Actions`

#### 1. For Render Deployment (Backend)
- **`RENDER_DEPLOY_HOOK`**
  - Get from: [Render Dashboard](https://dashboard.render.com/) → Services → Your Service → Deploy Hook
  - Format: `https://api.render.com/deploy/srv-xxxxx?key=xxxxx`

#### 2. For Vercel Deployment (Frontend)
- **`VERCEL_TOKEN`**
  - Get from: [Vercel Settings](https://vercel.com/account/tokens)
  - Create a new token with full access
  
- **`VERCEL_ORG_ID`**
  - Get from: Vercel Dashboard → Settings → Team ID
  - Run: `vercel whoami --token <your-token>`
  
- **`VERCEL_PROJECT_ID`**
  - Get from: Vercel Dashboard → Project Settings → Project ID
  - Or run: `vercel projects list --token <your-token>`

### Setup Steps

#### Step 1: Generate Render Deploy Hook
```bash
# In Render Dashboard
1. Go to your Service/App
2. Click "Settings" tab
3. Find "Deploy Hook" section
4. Copy the webhook URL
5. Add to GitHub Secrets as RENDER_DEPLOY_HOOK
```

#### Step 2: Generate Vercel Token
```bash
# In Vercel Dashboard
1. Go to Settings → Account → Tokens
2. Click "Create Token"
3. Name it "GitHub Actions"
4. Copy the token
5. Add to GitHub Secrets as VERCEL_TOKEN
```

#### Step 3: Get Vercel IDs
```bash
# Run in your project directory
npm install -g vercel
vercel login
vercel link  # Links project
vercel env pull  # Gets project ID
```

Then add to GitHub Secrets:
- `VERCEL_ORG_ID`: Your Vercel team/org ID
- `VERCEL_PROJECT_ID`: Your project ID from Vercel

### How Deployment Works

1. **On every push to `main` branch:**
   - GitHub Actions workflow runs
   - Builds the project to verify no errors
   - Triggers Render deploy hook (backend auto-deploys)
   - Triggers Vercel deployment (frontend auto-deploys)

2. **Deploy Status:**
   - Check GitHub Actions tab for workflow status
   - Check Render Dashboard for backend deployment
   - Check Vercel Dashboard for frontend deployment

### Manual Deployment

If auto-deployment fails, trigger manually:

```bash
# GitHub Actions
gh workflow run deploy.yml --ref main

# Or from GitHub UI
GitHub → Actions → Deploy → Run workflow
```

### Troubleshooting

**Render Deploy Hook not working?**
- Verify webhook URL in Render Dashboard
- Check GitHub Secrets has correct value
- Verify `main` branch is protected/default

**Vercel Token expired?**
- Generate new token in Vercel Settings
- Update GitHub Secret

**Build failing?**
- Check GitHub Actions logs
- Run locally: `npm run build`
- Fix errors before pushing

### Environment Variables

Make sure these are set on both platforms:

**Render (Backend):**
- `MONGODB_URI`
- `JWT_SECRET`
- `FIREBASE_CONFIG_JSON`
- `BREVO_API_KEY`
- `ADMIN_EMAIL`
- `ADMIN_SECRET`
- etc.

**Vercel (Frontend):**
- `REACT_APP_BASE_URL`
- `REACT_APP_API_URL`
- `REACT_APP_ADMIN_SECRET`
- etc.
