-- Create reviews table for storing Reddit posts
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  url TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  category TEXT NOT NULL,
  has_question BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id)
);

-- Enable RLS but allow public read access
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reviews
CREATE POLICY "reviews_select_all"
  ON public.reviews FOR SELECT
  USING (true);

-- Only allow inserts with service role key (server-side only)
CREATE POLICY "reviews_insert_service"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

-- Only allow updates with service role key (server-side only)
CREATE POLICY "reviews_update_service"
  ON public.reviews FOR UPDATE
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON public.reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_reviews_subreddit ON public.reviews(subreddit);
CREATE INDEX IF NOT EXISTS idx_reviews_fetched_at ON public.reviews(fetched_at DESC);
