# Vercel Deployment Guide

This application is fully configured for deployment on Vercel. Follow these steps to deploy your gaming center management system.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (for testing locally): 
   ```bash
   npm install -g vercel
   ```
3. **Database**: A PostgreSQL database (Neon recommended for serverless)

## Environment Variables

Before deploying, you need to configure these environment variables in your Vercel project:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (use Neon for best serverless performance) | `postgresql://user:pass@host/db` |
| `NODE_ENV` | Environment (set automatically by Vercel) | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USERNAME` | Admin user username | - |
| `ADMIN_PASSWORD` | Admin user password (min 8 characters) | - |
| `STAFF_USERNAME` | Staff user username | - |
| `STAFF_PASSWORD` | Staff user password (min 8 characters) | - |
| `ADMIN_EMAIL` | Admin user email | - |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | Auto-configured |

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Import Your Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure Project**
   - Vercel will auto-detect the configuration from `vercel.json`
   - Framework Preset: **Other**
   - Build Command: `npm run build` (auto-configured)
   - Output Directory: `dist/public` (auto-configured)

3. **Set Environment Variables**
   - In Project Settings → Environment Variables
   - Add `DATABASE_URL` and other required variables
   - Make sure to select the appropriate environment (Production, Preview, Development)

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - You'll receive a production URL like `https://your-app.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add DATABASE_URL production
   # Enter your database URL when prompted
   
   vercel env add ADMIN_USERNAME production
   # Enter admin username
   
   vercel env add ADMIN_PASSWORD production
   # Enter admin password
   ```

3. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Database Setup

### Using Neon (Recommended)

Neon is optimized for serverless environments like Vercel:

1. **Create a Neon Database**
   - Go to [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string

2. **Set Database URL**
   - Add the Neon connection string to Vercel environment variables as `DATABASE_URL`

3. **Push Schema**
   - The application will automatically create tables on first deployment
   - Or run manually: `npx drizzle-kit push`

### Using Other PostgreSQL Providers

You can use any PostgreSQL provider (Supabase, Railway, etc.):
- Ensure the connection string uses `postgresql://` protocol
- For best serverless performance, use providers with HTTP connection support

## Testing Locally with Vercel Environment

To test the serverless environment locally:

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Run development server with Vercel environment
vercel dev
```

This will simulate the Vercel serverless environment on your local machine.

## Architecture Notes

### Serverless Configuration

The application is configured to work optimally in Vercel's serverless environment:

- **API Handler**: `api/server.ts` exports an Express app for Vercel Functions
- **Database**: Automatically uses Neon's HTTP adapter in serverless mode (no connection pooling)
- **Session Management**: Uses mock sessions in demo mode (traditional sessions don't work in serverless)
- **Frontend**: Built as static files served from `dist/public`

### Request Routing

- `/api/*` → Serverless function (`api/server.ts`)
- `/*` → Static frontend files (SPA with client-side routing)

### Memory & Duration Limits

Current configuration in `vercel.json`:
- Memory: 1024 MB
- Max Duration: 30 seconds

Adjust these if needed based on your usage.

## Post-Deployment

### Initial Setup

After deployment, the application will:
1. Automatically create database tables
2. Initialize default device configurations (PC, PS5)
3. Create default pricing and food items
4. Create admin/staff users if credentials are provided

### Accessing the Application

1. Open your Vercel deployment URL
2. Log in with the admin credentials you configured
3. The application runs in "Demo Mode" on Vercel (mock sessions)

### Custom Domain

To add a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed by Vercel

## Troubleshooting

### Database Connection Errors

If you see database connection errors:
- Verify `DATABASE_URL` is set correctly in Vercel environment variables
- Ensure your database allows connections from Vercel's IP ranges
- For Neon, ensure you're using the serverless connection string (not pooling)

### Build Failures

If the build fails:
- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `dependencies` (not `devDependencies`)
- Verify Node.js version compatibility

### API Timeouts

If API requests timeout:
- Increase max duration in `vercel.json` under functions config
- Optimize slow database queries
- Consider upgrading your Vercel plan for higher limits

### Session Issues

The Vercel deployment uses mock sessions (demo mode):
- All users appear as "Demo User" with admin role
- No authentication is enforced in serverless mode
- For production with real auth, consider using JWT or OAuth

## Monitoring

Monitor your deployment:
- **Logs**: View in Vercel Dashboard → Deployments → Function Logs
- **Analytics**: Enable Vercel Analytics for traffic insights
- **Errors**: Check Vercel's error reporting in the dashboard

## Scaling

Vercel automatically scales your application:
- Serverless functions scale to zero when not in use
- Pay only for actual usage
- Handles traffic spikes automatically
- No server management required

## Support

For issues specific to:
- **Vercel Platform**: [Vercel Documentation](https://vercel.com/docs)
- **Database (Neon)**: [Neon Documentation](https://neon.tech/docs)
- **This Application**: Check the main README.md

## Security Considerations

For production deployments:
1. Use strong passwords for admin/staff accounts
2. Enable HTTPS (automatic with Vercel)
3. Configure `ALLOWED_ORIGINS` to restrict CORS
4. Keep environment variables secure
5. Consider implementing real authentication instead of mock sessions
6. Regularly update dependencies

## Cost Optimization

To optimize costs on Vercel:
- Use Neon's free tier for development
- Monitor function execution time
- Optimize API queries to reduce execution time
- Use Vercel's caching headers for static assets
- Consider serverless-friendly database queries
