# Deployment Guide

This guide covers deploying the Multilingual Video Call application to various platforms.

## 🚀 Deploy to Render (Recommended)

Render is the **best choice** for this application because it fully supports persistent WebSocket connections required by Socket.io.

### Prerequisites

1. A GitHub account
2. Your code pushed to a GitHub repository
3. A Render account (free tier available)

### Step-by-Step Deployment

#### Option 1: Using Render Dashboard (Easiest)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Go to Render Dashboard**:
   - Visit [render.com](https://render.com)
   - Sign up or log in (you can use GitHub to sign in)

3. **Create a New Web Service**:
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub repository
   - Select the repository containing this project

4. **Configure the Service**:
   - **Name**: `multilingual-video-call` (or any name you prefer)
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (or `./` if needed)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose a paid plan)

5. **Add Environment Variables**:
   - Scroll down to "Environment Variables"
   - Click "Add Environment Variable"
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyDw96LmFWPxMLM-dm6Z6Tm2CtJhlM0pDjM`
   - Click "Add"

6. **Deploy**:
   - Scroll down and click "Create Web Service"
   - Render will start building and deploying your application
   - Wait for the deployment to complete (usually 2-5 minutes)

7. **Get Your URL**:
   - Once deployed, you'll see a URL like: `https://multilingual-video-call.onrender.com`
   - Your app is now live! 🎉

#### Option 2: Using render.yaml (Advanced)

If you have `render.yaml` in your repository:

1. Push your code to GitHub (with `render.yaml` included)
2. Go to Render Dashboard → "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and configure the service
5. Add the `GEMINI_API_KEY` environment variable in the dashboard
6. Deploy!

### Render Configuration

The `render.yaml` file includes:
- Service type: Web Service
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

### Important Notes for Render

- **Free Tier**: Services on the free tier spin down after 15 minutes of inactivity. The first request after spin-down may take 30-60 seconds.
- **WebSocket Support**: Render fully supports WebSocket connections, so Socket.io will work perfectly!
- **HTTPS**: All Render services come with HTTPS enabled automatically
- **Auto-Deploy**: Render automatically deploys when you push to your connected branch

### Testing After Deployment

1. Visit your Render URL (e.g., `https://your-app.onrender.com`)
2. Test the translation feature
3. Test video call functionality (should work perfectly!)
4. Share the same Room ID with another user to test the full experience

---

## Alternative: Deploy to Railway

Railway also supports persistent connections:

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**:
   ```bash
   railway login
   ```

3. **Initialize Project**:
   ```bash
   railway init
   ```

4. **Set Environment Variable**:
   ```bash
   railway variables set GEMINI_API_KEY=AIzaSyDw96LmFWPxMLM-dm6Z6Tm2CtJhlM0pDjM
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

---

## Troubleshooting

### Translation Not Working
- ✅ Check that `GEMINI_API_KEY` is set correctly in environment variables
- ✅ Verify the API key is valid and has proper permissions
- ✅ Check server logs in Render dashboard

### Socket.io/WebRTC Issues
- ✅ Ensure you're using Render or Railway
- ✅ Check that both users are using the same Room ID
- ✅ Verify WebSocket connections are not blocked by firewall

### Build Errors
- ✅ Make sure all dependencies are in `package.json`
- ✅ Check Node.js version compatibility (Node 14+)
- ✅ Review build logs in Render dashboard

### Connection Timeouts (Render Free Tier)
- ✅ First request after inactivity may take 30-60 seconds (this is normal)
- ✅ Consider upgrading to a paid plan for always-on service

### Video/Audio Not Working
- ✅ Ensure browser permissions for camera/microphone are granted
- ✅ Use HTTPS (Render provides this automatically)
- ✅ Try Chrome or Edge browser for best WebRTC support

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `PORT` | Server port (auto-set by Render) | No |
| `NODE_ENV` | Environment (production) | No |

---

## Support

For issues specific to:
- **Render**: Check [Render Documentation](https://render.com/docs)
- **Application**: Check server logs in Render dashboard
- **WebRTC**: Ensure both users are on HTTPS and have proper permissions
