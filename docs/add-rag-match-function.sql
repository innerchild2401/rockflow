-- Run in Supabase SQL Editor to add the RAG similarity search function.
-- Required for Knowledge Base (chat). Fixes: "Could not find the function app.match_document_chunks in the schema cache"
-- Prerequisites: app.document_chunks table must exist (from main schema). If you get "relation app.document_chunks does not exist", run docs/schema.sql first.
-- Safe to run multiple times (CREATE OR REPLACE).

-- Enable pgvector (required for vector type). Skip if already enabled.
-- If this fails with permission denied, enable "vector" in Supabase Dashboard: Database → Extensions.
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG: similarity search. Call from app with query embedding (1536-dim from text-embedding-3-small).
-- query_embedding_text: JSON array string e.g. '[0.1,-0.2,...]'
CREATE OR REPLACE FUNCTION app.match_document_chunks(
  query_embedding_text TEXT,
  p_company_id UUID,
  match_count INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (id UUID, document_id UUID, content TEXT, chunk_index INT, similarity FLOAT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  query_embedding public.vector(1536);
BEGIN
  query_embedding := query_embedding_text::public.vector(1536);
  RETURN QUERY
  SELECT dc.id, dc.document_id, dc.content, dc.chunk_index,
         (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM app.document_chunks dc
  WHERE dc.company_id = p_company_id
    AND dc.embedding IS NOT NULL
    AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Ensure the function is executable by authenticated users
GRANT EXECUTE ON FUNCTION app.match_document_chunks(TEXT, UUID, INT, FLOAT) TO anon, authenticated, service_role;
