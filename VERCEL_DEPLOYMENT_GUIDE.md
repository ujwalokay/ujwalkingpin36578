# Vercel Deployment Guide

This guide will help you deploy your fullstack gaming center management application to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. A Neon PostgreSQL database (or compatible PostgreSQL provider)
3. GitHub account with your repository

## Architecture Overview

The application has been optimized for Vercel's serverless platform:

- **Frontend**: React + Vite → Static files served from `/dist`
- **Backend**: Express API → Serverless functions in `/api`
- **Database**: Neon PostgreSQL with HTTP adapter (optimized for serverless)
- **Session**: Mock sessions for demo mode (no persistent sessions)

## Quick Deployment Steps

### 1. Push Your Code to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Import Project to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will auto-detect the configuration from `vercel.json`

### 3. Configure Environment Variables

In the Vercel dashboard, go to **Settings → Environment Variables** and add:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | Secret for session encryption | `your-random-secret-key-min-32-chars` |
| `NODE_ENV` | Environment mode | `production` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `*` (all origins) |
| `ADMIN_USERNAME` | Initial admin username | (none) |
| `ADMIN_PASSWORD` | Initial admin password | (none) |

#### Twilio (for WhatsApp notifications - Optional)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio WhatsApp number |

#### Google OAuth (Optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL (https://your-domain.vercel.app/api/auth/google/callback) |

#### OpenAI/Gemini (for AI features - Optional)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for AI predictions |
| `GEMINI_API_KEY` | Google Gemini API key (alternative to OpenAI) |

### 4. Database Setup

After deploying, you need to push the database schema:

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Push database schema
npm run db:push
```

Alternatively, you can use Drizzle Studio to manage your database:

```bash
npx drizzle-kit studio
```

### 5. Deploy

```bash
# Deploy to production
vercel --prod
```

Or simply push to your `main` branch - Vercel will automatically deploy!

## Deployment Configuration Files

### `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/server.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/server"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### `.vercelignore`
Excludes unnecessary files from deployment to reduce bundle size.

## Important Notes

### Session Management

This deployment uses **mock sessions** for demo purposes. In production, you should:

1. Use Vercel KV (Redis) for session storage, OR
2. Use JWT tokens for stateless authentication, OR
3. Use a database-backed session store with proper connection pooling

### Database Connection

The application uses `@neondatabase/serverless` for better serverless performance:
- HTTP-based connections (no WebSocket overhead)
- Automatic connection pooling
- Works with Vercel's edge network

### Cold Starts

First request after inactivity may take 2-3 seconds due to serverless cold starts. Subsequent requests will be fast.

### Limitations on Vercel Free Tier

- Function execution: 10 seconds max (Pro: 30 seconds)
- Memory: 1024 MB
- Bandwidth: 100 GB/month
- Builds: 6000 minutes/month

## Troubleshooting

### 404 Errors on API Routes

**Problem**: All `/api/*` routes return 404

**Solution**: Ensure `vercel.json` has the correct rewrites configuration

### Database Connection Errors

**Problem**: `P1001: Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` is set in Vercel environment variables
2. Ensure your Neon database accepts connections from `0.0.0.0/0`
3. Check that connection string includes `?sslmode=require`

### Build Failures

**Problem**: Build fails with module errors

**Solutions**:
1. Clear build cache: Vercel Dashboard → Deployments → Redeploy → Clear Cache
2. Check that all dependencies are in `dependencies` (not `devDependencies`)
3. Verify Node.js version compatibility (18.x or higher)

### CORS Errors

**Problem**: CORS errors when accessing API from frontend

**Solution**: Set `ALLOWED_ORIGINS` environment variable to your Vercel domain:
```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Mock Session Issues

**Problem**: Authentication not working

**Note**: The Vercel deployment uses mock sessions (always logged in as demo admin). To implement real authentication:

1. Add session store (Vercel KV recommended)
2. Update `api/server.ts` to use real session middleware
3. Remove `mockSessionMiddleware`

## Monitoring & Logs

View your application logs:

```bash
# Real-time logs
vercel logs --follow

# Logs for specific deployment
vercel logs [deployment-url]
```

Or view in Vercel Dashboard → Your Project → Logs

## Custom Domain

To use a custom domain:

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. Update `GOOGLE_CALLBACK_URL` if using OAuth

## Database Migrations

When you update the schema:

```bash
# 1. Update schema in shared/schema.ts
# 2. Push changes to database
npm run db:push

# Or push with force (if schema conflicts)
npm run db:push --force
```

## Performance Optimization

1. **Enable Edge Functions** (if your plan supports it)
2. **Use Vercel Analytics** for monitoring
3. **Enable caching** for static assets
4. **Optimize images** using Vercel Image Optimization

## Security Checklist

- [ ] Set strong `SESSION_SECRET` (32+ random characters)
- [ ] Configure `ALLOWED_ORIGINS` to only allow your domain
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Rotate API keys regularly
- [ ] Use environment variables for all secrets
- [ ] Review and update CORS policy
- [ ] Implement rate limiting (already configured)

## Support

For issues specific to:
- **Vercel Platform**: https://vercel.com/support
- **Neon Database**: https://neon.tech/docs
- **Application Code**: Check GitHub issues

## Next Steps

After successful deployment:

1. ✅ Verify all API endpoints work
2. ✅ Test booking creation and management
3. ✅ Configure WhatsApp notifications (if using Twilio)
4. ✅ Set up Google OAuth (if using)
5. ✅ Enable AI features (if using OpenAI/Gemini)
6. ✅ Configure custom domain
7. ✅ Set up monitoring and alerts

---

**Deployed Successfully?** 🎉

Your application should now be live at `https://your-project.vercel.app`!
