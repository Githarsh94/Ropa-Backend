import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface EnvConfig {
    PORT: number;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    GEMINI_API_KEY: string;
    NODE_ENV: 'development' | 'production' | 'test';
}

// Get environment variables with type checking and default values
export const env: EnvConfig = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development'
};

// Validate required environment variables
const requiredEnvVars: (keyof EnvConfig)[] = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY'];

for (const envVar of requiredEnvVars) {
    if (!env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}