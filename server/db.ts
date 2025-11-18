import * as schema from "@shared/schema";

// Make database connection optional for demo/development mode
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

// Conditionally create database client based on environment
let db: any = null;
let pool: any = null;

if (hasDatabaseUrl) {
  // Check if running in Vercel serverless environment
  const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

  if (isVercel) {
    // Serverless environment: use HTTP-based Neon adapter (no connection pool)
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle: drizzleHttp } = await import('drizzle-orm/neon-http');
    const sql = neon(process.env.DATABASE_URL!);
    db = drizzleHttp(sql, { schema });
    console.log('[DB] Connected to Neon database via HTTP (Vercel serverless mode)');
  } else {
    // Traditional environment: use PostgreSQL connection pool  
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    db = drizzle(pool, { schema });
    console.log('[DB] Connected to PostgreSQL database via connection pool');
  }
} else {
  console.log('[DB] No DATABASE_URL found - database connection disabled (demo mode)');
}

export { db, pool };
