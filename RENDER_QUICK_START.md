# 🚀 Quick Start: Deploy to Render

## Prerequisites Checklist
- [ ] GitHub account
- [ ] Code pushed to GitHub repository
- [ ] Render account (sign up at render.com - free tier available)

## 5-Minute Deployment

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Ready for Render deployment"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Create Render Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account (if not already connected)
4. Select your repository

### Step 3: Configure Service

Fill in these settings:

- **Name**: `multilingual-video-call` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: (leave empty)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free` (or choose a paid plan)

### Step 4: Add Environment Variable

Scroll down to **"Environment Variables"** section:

- Click **"Add Environment Variable"**
- **Key**: `GEMINI_API_KEY`
- **Value**: `AIzaSyDw96LmFWPxMLM-dm6Z6Tm2CtJhlM0pDjM`
- Click **"Add"**

### Step 5: Deploy

1. Scroll to bottom
2. Click **"Create Web Service"**
3. Wait 2-5 minutes for deployment
4. Your app will be live at: `https://your-app-name.onrender.com`

## ✅ Verify Deployment

1. Visit your Render URL
2. You should see the app interface
3. Test by creating a room and checking translation

## 🎉 Done!

Your multilingual video call app is now live on Render!

## 📝 Important Notes

- **Free Tier**: Services spin down after 15 min inactivity (first request may take 30-60 sec)
- **HTTPS**: Automatically enabled
- **Auto-Deploy**: Deploys automatically on git push
- **WebSocket**: Fully supported! Video calls will work perfectly

## 🆘 Need Help?

- Check `DEPLOYMENT.md` for detailed troubleshooting
- View logs in Render dashboard → Your Service → Logs
- Check Render docs: [render.com/docs](https://render.com/docs)



