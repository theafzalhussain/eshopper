# ⚡ Auto-Deployment Setup - Quick Start

## 🎯 Current Status
✅ GitHub Actions workflows configured  
❌ GitHub Secrets NOT yet configured  
❌ Render webhook NOT yet set  
❌ Vercel tokens NOT yet set  

---

## 🚀 3-Step Setup to Enable Auto-Deployment

### Step 1️⃣: Get Render Deploy Hook
**In Render Dashboard:**
1. Go to `https://dashboard.render.com`
2. Select your backend service
3. Click **"Settings"**
4. Scroll down to **"Deploy"**
5. Copy the **"Deploy hook"** URL
6. Example: `https://api.render.com/deploy/srv-xxxxx?key=xxxxx`

### Step 2️⃣: Add GitHub Secrets (RENDER_DEPLOY_HOOK)
**In GitHub:**
1. Go to your repository
2. Click **"Settings"** → **"Secrets and variables"** → **"Actions"**
3. Click **"New repository secret"**
4. Name: `RENDER_DEPLOY_HOOK`
5. Value: (paste the Render hook URL from Step 1)
6. Click **"Add secret"**

---

### Step 3️⃣: Configure Vercel (Frontend)
**In Vercel Dashboard:**
1. Go to `https://vercel.com/account/tokens`
2. Click **"Create"** token
3. Name: `github-actions`
4. Scopes: Select all
5. Copy token

**In GitHub Settings:**
1. Add new secret `VERCEL_TOKEN` with the token value

**For Vercel IDs (ORG_ID and PROJECT_ID):**

Option A - Auto-link:
```bash
npm install -g vercel
vercel login --token YOUR_VERCEL_TOKEN
vercel link
```

Option B - Manual:
1. Go to your Vercel project
2. Click **"Settings"** → **"General"**
3. Copy **"Project ID"**
4. Go to **Vercel Account Settings** → **Team Settings**
5. Copy **"Team ID"** (this is ORG_ID)

**Add these to GitHub:**
1. New secret `VERCEL_ORG_ID` = (your Vercel Team ID)
2. New secret `VERCEL_PROJECT_ID` = (your Project ID)
3. New secret `VERCEL_TOKEN` = (your token from above)

---

## ✅ Verification

After adding all secrets, verify in GitHub:
```
Settings → Secrets and variables → Actions
```

You should see:
- ✅ `RENDER_DEPLOY_HOOK`
- ✅ `VERCEL_ORG_ID`
- ✅ `VERCEL_PROJECT_ID`
- ✅ `VERCEL_TOKEN`

---

## 🔄 How It Works

From now on:
1. **Push to `main` branch** = Auto-deployment triggered
2. **GitHub Actions runs** = Builds and tests code
3. **Render backend** = Auto-deploys if webhook works
4. **Vercel frontend** = Auto-deploys with Vercel action
5. **Takes ~5-10 minutes** = Check dashboards for status

---

## 🧪 Test Deployment

Once secrets are set:
```bash
# Merge this PR to main (or create a dummy commit)
git checkout main
git pull origin main

# Push a small change to main
echo "# Test" >> README.md
git add README.md
git commit -m "Test deployment"
git push origin main

# Watch the magic ✨
# Check: GitHub → Actions → Deploy workflow
# Check: Render Dashboard for backend
# Check: Vercel Dashboard for frontend
```

---

## 🆘 Troubleshooting

**Deploy workflow won't start?**
- Check: GitHub → Actions → view logs
- Need to merge PR to `main` first (PR branch doesn't trigger deploy)

**Render not deploying?**
- Check `RENDER_DEPLOY_HOOK` is correct
- Verify webhook URL in Render Settings
- Check Render deploy logs

**Vercel not deploying?**
- Check all 3 Vercel secrets are set correctly
- Verify project is linked in Vercel
- Check Vercel deployment logs

**Secrets not showing?**
- Need repo **Owner** or **Admin** access
- Go to: Settings → Secrets and variables → Actions

---

## 📚 Full Documentation

See [DEPLOYMENT_SETUP.md](./DEPLOYMENT_SETUP.md) for detailed instructions.

---

## 🎉 That's It!

Once setup is done:
- ✅ Auto-deploy on every `main` push
- ✅ Deploy logs visible in GitHub Actions
- ✅ Fully automated CI/CD pipeline!
