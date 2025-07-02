import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database schema for embeddings
export interface EmbeddingDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    url?: string;
    title?: string;
    type?: string;
    topic?: string;
    priority?: number;
  };
  created_at: string;
}

// Table name for our embeddings
export const EMBEDDINGS_TABLE = 'embeddings'; 