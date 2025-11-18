import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if running in Vercel serverless environment
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

// Conditionally create database client based on environment
let db: any;
let pool: any = null;

if (isVercel) {
  // Serverless environment: use HTTP-based Neon adapter (no connection pool)
  const { neon } = await import('@neondatabase/serverless');
  const { drizzle: drizzleHttp } = await import('drizzle-orm/neon-http');
  const sql = neon(process.env.DATABASE_URL);
  db = drizzleHttp(sql, { schema });
  // pool remains null - no Pool created on Vercel
} else {
  // Traditional environment: use PostgreSQL connection pool  
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  
  // Only create Pool in non-Vercel environments
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  db = drizzle(pool, { schema });
}

export { db, pool };
