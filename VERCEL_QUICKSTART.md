# Vercel Deployment - Quick Start

Deploy your gaming center management system to Vercel in 5 minutes!

## 🚀 Quick Deploy

### Step 1: Prepare Database
Create a free PostgreSQL database on [Neon](https://neon.tech):
```
1. Sign up at neon.tech
2. Create a new project
3. Copy the connection string
```

### Step 2: Deploy to Vercel

Click the button below or follow manual steps:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR-USERNAME/YOUR-REPO)

**Manual Deployment:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

**Required:**
- `DATABASE_URL` = Your Neon connection string

**Optional (for admin access):**
- `ADMIN_USERNAME` = admin
- `ADMIN_PASSWORD` = (min 8 characters)
- `ADMIN_EMAIL` = admin@example.com

### Step 4: Redeploy

After adding environment variables:
```bash
vercel --prod
```

Or trigger a redeploy in the Vercel dashboard.

## ✅ That's It!

Your application is now live at `https://your-app.vercel.app`

## 📝 What Happens on First Deploy

The application automatically:
- Creates all database tables
- Sets up default device configs (10 PCs, 8 PS5s)
- Creates default pricing (PC: ₹10-30, PS5: ₹15-45)
- Adds sample food items
- Creates admin user (if credentials provided)

## 🔧 Common Tasks

### Update Code
```bash
git push origin main  # Auto-deploys if connected to Git
# or
vercel --prod  # Manual deployment
```

### View Logs
```bash
vercel logs
# or check Vercel Dashboard → Deployments → Logs
```

### Add Custom Domain
1. Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update DNS as instructed

## 💡 Tips

- **Free Tier**: Vercel's Hobby plan is free for personal projects
- **Database**: Neon free tier includes 10GB storage
- **Performance**: Serverless functions auto-scale with traffic
- **No Maintenance**: Zero server management required

## 📚 Full Documentation

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete guide.

## 🆘 Troubleshooting

**Build fails?**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `dependencies` section of package.json

**Database connection error?**
- Verify DATABASE_URL is set in Vercel environment variables
- Use Neon's serverless connection string (not pooled)

**API not working?**
- Check function logs in Vercel dashboard
- Verify serverless function hasn't timed out (increase maxDuration if needed)

## 🎮 Demo Mode

The Vercel deployment runs in demo mode:
- Mock authentication (all users are "Demo User")
- Full functionality for testing
- For production, consider adding real authentication

Ready to deploy? Let's go! 🚀
