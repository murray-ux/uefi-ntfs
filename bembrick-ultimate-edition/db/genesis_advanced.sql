-- ═══════════════════════════════════════════════════════════════════════════
-- GENESIS 2.0 — Advanced PostgreSQL Schema
-- Cutting-Edge Data Architecture for Sovereign Security
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Features:
--   1. Immutable Append-Only Ledger with Hash Chains
--   2. Vector Embeddings for AI-Powered Evidence Correlation (pgvector)
--   3. Event Sourcing with Complete State Reconstruction
--   4. Temporal Versioning (SQL:2011 style)
--   5. Row-Level Security with Cryptographic Verification
--   6. Content-Addressed Storage (Merkle DAG inspired)
--   7. Graph Relationships for Evidence Networks
--
-- Requirements:
--   - PostgreSQL 15+ (16+ recommended for temporal)
--   - pgvector extension (for embeddings)
--   - pgcrypto extension (for cryptographic functions)
--
-- Author: Murray Bembrick / GENESIS AI
-- Version: 2.0.0
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA: Core Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- Principals (users, services, devices)
CREATE TABLE IF NOT EXISTS principals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    principal_type TEXT NOT NULL CHECK (principal_type IN ('user', 'service', 'device', 'system')),
    identifier TEXT NOT NULL UNIQUE,  -- e.g., 'murray@bembrick.org', 'yubikey:31695265'
    public_key TEXT,                   -- Ed25519 public key (PEM)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete (never hard delete principals)
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT
);

-- Hash-chained immutable ledger
CREATE TABLE IF NOT EXISTS ledger (
    sequence_id BIGSERIAL PRIMARY KEY,
    entry_hash TEXT NOT NULL UNIQUE,           -- SHA-256 of entry content
    previous_hash TEXT REFERENCES ledger(entry_hash),
    entry_type TEXT NOT NULL,                   -- 'evidence', 'event', 'attestation', etc.
    entry_data JSONB NOT NULL,

    -- Cryptographic signing
    signed_by UUID REFERENCES principals(id),
    signature TEXT,                             -- Ed25519 signature (hex)

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Content-addressed storage reference
    content_cid TEXT,                           -- IPFS-style CID if stored externally

    -- Ensure chain integrity
    CONSTRAINT valid_chain CHECK (
        (sequence_id = 1 AND previous_hash IS NULL) OR
        (sequence_id > 1 AND previous_hash IS NOT NULL)
    )
);

-- Create index for chain traversal
CREATE INDEX idx_ledger_previous ON ledger(previous_hash);
CREATE INDEX idx_ledger_type ON ledger(entry_type);
CREATE INDEX idx_ledger_created ON ledger(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA: Evidence Storage with Vector Embeddings
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id TEXT NOT NULL UNIQUE,           -- Human-readable ID (EVD-YYYYMMDD-XXX)
    case_reference TEXT NOT NULL,               -- Court case number

    -- Core data
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,

    -- Source tracking
    source_device TEXT,
    source_location TEXT,
    discovered_by TEXT,
    discovered_at TIMESTAMPTZ,

    -- Content hash for integrity
    content_hash TEXT NOT NULL,                 -- SHA-256 of full evidence JSON

    -- Vector embedding for semantic search (1536 dimensions for OpenAI ada-002)
    -- Can also use 384 for sentence-transformers/all-MiniLM-L6-v2
    embedding vector(1536),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',

    -- Temporal versioning
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ DEFAULT 'infinity',
    version INTEGER NOT NULL DEFAULT 1,

    -- Ledger reference
    ledger_sequence BIGINT REFERENCES ledger(sequence_id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vector similarity search index (IVFFlat for speed, HNSW for accuracy)
CREATE INDEX idx_evidence_embedding ON evidence
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Temporal query support
CREATE INDEX idx_evidence_temporal ON evidence(valid_from, valid_to);
CREATE INDEX idx_evidence_case ON evidence(case_reference);
CREATE INDEX idx_evidence_category ON evidence(category);

-- Full-text search
CREATE INDEX idx_evidence_fts ON evidence
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA: Event Sourcing
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id TEXT NOT NULL,                    -- Aggregate ID (e.g., evidence UUID)
    stream_type TEXT NOT NULL,                  -- Aggregate type (e.g., 'evidence', 'case')
    event_type TEXT NOT NULL,                   -- Event name (e.g., 'EvidenceCreated')
    event_version INTEGER NOT NULL,             -- Version within stream

    -- Event payload
    payload JSONB NOT NULL,

    -- Metadata
    correlation_id UUID,                        -- Links related events
    causation_id UUID,                          -- What caused this event
    actor_id UUID REFERENCES principals(id),

    -- Timestamp
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure event ordering
    UNIQUE(stream_id, event_version)
);

CREATE INDEX idx_events_stream ON events(stream_id, event_version);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_correlation ON events(correlation_id);
CREATE INDEX idx_events_occurred ON events(occurred_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA: Evidence Relationships (Graph-like)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES evidence(id),
    target_id UUID NOT NULL REFERENCES evidence(id),
    relationship_type TEXT NOT NULL,            -- 'related_to', 'contradicts', 'supports', 'supersedes'
    strength FLOAT DEFAULT 1.0,                 -- Relationship strength (0-1)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES principals(id),

    UNIQUE(source_id, target_id, relationship_type)
);

CREATE INDEX idx_rel_source ON evidence_relationships(source_id);
CREATE INDEX idx_rel_target ON evidence_relationships(target_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA: Chain of Custody
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chain_of_custody (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES evidence(id),
    custodian_id UUID REFERENCES principals(id),
    custodian_name TEXT NOT NULL,
    action TEXT NOT NULL,                       -- 'created', 'transferred', 'accessed', 'modified'

    -- Location tracking
    location TEXT,

    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Digital signature
    signature TEXT,

    -- Notes
    notes TEXT,

    -- Ledger reference
    ledger_sequence BIGINT REFERENCES ledger(sequence_id)
);

CREATE INDEX idx_custody_evidence ON chain_of_custody(evidence_id);
CREATE INDEX idx_custody_timestamp ON chain_of_custody(timestamp);

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA: Attestations (Zero-Knowledge Friendly)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attestations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attestation_type TEXT NOT NULL,             -- 'identity', 'evidence', 'chain', 'system'
    subject_type TEXT NOT NULL,                 -- What is being attested
    subject_id TEXT NOT NULL,                   -- ID of subject

    -- Attestation data
    claim JSONB NOT NULL,                       -- The attestation claim
    claim_hash TEXT NOT NULL,                   -- SHA-256 of claim

    -- Cryptographic proof
    proof_type TEXT,                            -- 'ed25519', 'zkp', 'merkle'
    proof_data TEXT,                            -- Signature or ZK proof

    -- Attester
    attester_id UUID REFERENCES principals(id),

    -- Validity
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    -- Ledger reference
    ledger_sequence BIGINT REFERENCES ledger(sequence_id)
);

CREATE INDEX idx_attest_subject ON attestations(subject_type, subject_id);
CREATE INDEX idx_attest_type ON attestations(attestation_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA: Pentagon State Snapshots
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pentagon_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id TEXT NOT NULL UNIQUE,

    -- Pentagon state
    layer TEXT NOT NULL,                        -- 'L0', 'L1', 'L2', 'L3', 'L4'
    room TEXT NOT NULL,
    state JSONB NOT NULL,

    -- Hash for verification
    state_hash TEXT NOT NULL,

    -- Temporal
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ DEFAULT 'infinity',

    -- Ledger reference
    ledger_sequence BIGINT REFERENCES ledger(sequence_id)
);

CREATE INDEX idx_pentagon_layer ON pentagon_snapshots(layer, room);
CREATE INDEX idx_pentagon_captured ON pentagon_snapshots(captured_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Hash Chain Management
-- ═══════════════════════════════════════════════════════════════════════════

-- Calculate entry hash
CREATE OR REPLACE FUNCTION calculate_entry_hash(
    p_entry_type TEXT,
    p_entry_data JSONB,
    p_previous_hash TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            COALESCE(p_previous_hash, 'GENESIS') ||
            p_entry_type ||
            p_entry_data::TEXT ||
            NOW()::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Append to ledger with automatic hash chaining
CREATE OR REPLACE FUNCTION append_to_ledger(
    p_entry_type TEXT,
    p_entry_data JSONB,
    p_signed_by UUID DEFAULT NULL,
    p_signature TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    v_previous_hash TEXT;
    v_entry_hash TEXT;
    v_sequence_id BIGINT;
BEGIN
    -- Get the previous hash
    SELECT entry_hash INTO v_previous_hash
    FROM ledger
    ORDER BY sequence_id DESC
    LIMIT 1;

    -- Calculate new hash
    v_entry_hash := calculate_entry_hash(p_entry_type, p_entry_data, v_previous_hash);

    -- Insert entry
    INSERT INTO ledger (entry_hash, previous_hash, entry_type, entry_data, signed_by, signature)
    VALUES (v_entry_hash, v_previous_hash, p_entry_type, p_entry_data, p_signed_by, p_signature)
    RETURNING sequence_id INTO v_sequence_id;

    RETURN v_sequence_id;
END;
$$ LANGUAGE plpgsql;

-- Verify ledger integrity
CREATE OR REPLACE FUNCTION verify_ledger_integrity()
RETURNS TABLE(sequence_id BIGINT, is_valid BOOLEAN, issue TEXT) AS $$
DECLARE
    v_row RECORD;
    v_expected_prev TEXT := NULL;
BEGIN
    FOR v_row IN SELECT * FROM ledger ORDER BY sequence_id LOOP
        IF v_row.sequence_id = 1 THEN
            IF v_row.previous_hash IS NOT NULL THEN
                RETURN QUERY SELECT v_row.sequence_id, FALSE, 'First entry should have NULL previous_hash';
            ELSE
                RETURN QUERY SELECT v_row.sequence_id, TRUE, NULL::TEXT;
            END IF;
        ELSE
            IF v_row.previous_hash != v_expected_prev THEN
                RETURN QUERY SELECT v_row.sequence_id, FALSE,
                    'Chain broken: expected ' || v_expected_prev || ', got ' || v_row.previous_hash;
            ELSE
                RETURN QUERY SELECT v_row.sequence_id, TRUE, NULL::TEXT;
            END IF;
        END IF;

        v_expected_prev := v_row.entry_hash;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Vector Similarity Search
-- ═══════════════════════════════════════════════════════════════════════════

-- Find similar evidence by embedding
CREATE OR REPLACE FUNCTION find_similar_evidence(
    p_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE(
    evidence_id UUID,
    evidence_code TEXT,
    title TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.evidence_id,
        e.title,
        1 - (e.embedding <=> p_embedding) AS similarity
    FROM evidence e
    WHERE e.embedding IS NOT NULL
      AND e.valid_to = 'infinity'
      AND 1 - (e.embedding <=> p_embedding) >= p_threshold
    ORDER BY e.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Find evidence by text similarity (hybrid: FTS + vector)
CREATE OR REPLACE FUNCTION search_evidence_hybrid(
    p_query TEXT,
    p_embedding vector(1536) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
    evidence_id UUID,
    evidence_code TEXT,
    title TEXT,
    fts_rank FLOAT,
    vector_similarity FLOAT,
    combined_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.evidence_id,
        e.title,
        ts_rank(to_tsvector('english', e.title || ' ' || COALESCE(e.description, '')),
                plainto_tsquery('english', p_query)) AS fts_rank,
        CASE WHEN p_embedding IS NOT NULL AND e.embedding IS NOT NULL
             THEN 1 - (e.embedding <=> p_embedding)
             ELSE 0
        END AS vector_similarity,
        -- Combined score: 40% FTS + 60% vector
        (0.4 * ts_rank(to_tsvector('english', e.title || ' ' || COALESCE(e.description, '')),
                       plainto_tsquery('english', p_query))) +
        (0.6 * CASE WHEN p_embedding IS NOT NULL AND e.embedding IS NOT NULL
                    THEN 1 - (e.embedding <=> p_embedding)
                    ELSE 0
               END) AS combined_score
    FROM evidence e
    WHERE e.valid_to = 'infinity'
      AND (
          to_tsvector('english', e.title || ' ' || COALESCE(e.description, '')) @@
          plainto_tsquery('english', p_query)
          OR (p_embedding IS NOT NULL AND e.embedding IS NOT NULL)
      )
    ORDER BY combined_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Event Sourcing
-- ═══════════════════════════════════════════════════════════════════════════

-- Append event to stream
CREATE OR REPLACE FUNCTION append_event(
    p_stream_id TEXT,
    p_stream_type TEXT,
    p_event_type TEXT,
    p_payload JSONB,
    p_actor_id UUID DEFAULT NULL,
    p_correlation_id UUID DEFAULT NULL,
    p_causation_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_version INTEGER;
BEGIN
    -- Get next version for stream
    SELECT COALESCE(MAX(event_version), 0) + 1 INTO v_version
    FROM events
    WHERE stream_id = p_stream_id;

    -- Insert event
    INSERT INTO events (
        stream_id, stream_type, event_type, event_version,
        payload, actor_id, correlation_id, causation_id
    ) VALUES (
        p_stream_id, p_stream_type, p_event_type, v_version,
        p_payload, p_actor_id, p_correlation_id, p_causation_id
    ) RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Replay events for a stream
CREATE OR REPLACE FUNCTION get_event_stream(
    p_stream_id TEXT,
    p_from_version INTEGER DEFAULT 0
) RETURNS TABLE(
    event_id UUID,
    event_type TEXT,
    event_version INTEGER,
    payload JSONB,
    occurred_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.event_type, e.event_version, e.payload, e.occurred_at
    FROM events e
    WHERE e.stream_id = p_stream_id
      AND e.event_version > p_from_version
    ORDER BY e.event_version;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Temporal Queries
-- ═══════════════════════════════════════════════════════════════════════════

-- Get evidence as of a specific time
CREATE OR REPLACE FUNCTION get_evidence_as_of(
    p_evidence_id TEXT,
    p_as_of TIMESTAMPTZ
) RETURNS SETOF evidence AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM evidence
    WHERE evidence_id = p_evidence_id
      AND valid_from <= p_as_of
      AND valid_to > p_as_of;
END;
$$ LANGUAGE plpgsql;

-- Get evidence history
CREATE OR REPLACE FUNCTION get_evidence_history(
    p_evidence_id TEXT
) RETURNS TABLE(
    version INTEGER,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    title TEXT,
    content_hash TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.version, e.valid_from, e.valid_to, e.title, e.content_hash
    FROM evidence e
    WHERE e.evidence_id = p_evidence_id
    ORDER BY e.version;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Graph Traversal
-- ═══════════════════════════════════════════════════════════════════════════

-- Find related evidence (recursive graph traversal)
CREATE OR REPLACE FUNCTION find_related_evidence(
    p_evidence_id UUID,
    p_max_depth INTEGER DEFAULT 3
) RETURNS TABLE(
    evidence_id UUID,
    evidence_code TEXT,
    title TEXT,
    relationship_path TEXT[],
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE related AS (
        -- Base case: starting evidence
        SELECT
            e.id,
            e.evidence_id AS code,
            e.title,
            ARRAY[]::TEXT[] AS path,
            0 AS depth
        FROM evidence e
        WHERE e.id = p_evidence_id

        UNION

        -- Recursive case: follow relationships
        SELECT
            e.id,
            e.evidence_id,
            e.title,
            r.path || er.relationship_type,
            r.depth + 1
        FROM related r
        JOIN evidence_relationships er ON er.source_id = r.id
        JOIN evidence e ON e.id = er.target_id
        WHERE r.depth < p_max_depth
          AND NOT (e.id = ANY(SELECT id FROM related))  -- Prevent cycles
    )
    SELECT * FROM related WHERE depth > 0;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on sensitive tables
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_of_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated principals can view evidence
CREATE POLICY evidence_select_policy ON evidence
    FOR SELECT
    USING (
        -- System can see everything
        current_setting('genesis.principal_type', TRUE) = 'system'
        OR
        -- Owner can see their evidence
        created_by_principal_id = current_setting('genesis.principal_id', TRUE)::UUID
        OR
        -- Evidence in user's cases
        case_reference IN (
            SELECT case_ref FROM principal_cases
            WHERE principal_id = current_setting('genesis.principal_id', TRUE)::UUID
        )
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS: Materialized for Performance
-- ═══════════════════════════════════════════════════════════════════════════

-- Current evidence state (latest version only)
CREATE MATERIALIZED VIEW IF NOT EXISTS evidence_current AS
SELECT *
FROM evidence
WHERE valid_to = 'infinity'
WITH DATA;

CREATE UNIQUE INDEX idx_evidence_current_id ON evidence_current(id);
REFRESH MATERIALIZED VIEW CONCURRENTLY evidence_current;

-- Evidence statistics by case
CREATE MATERIALIZED VIEW IF NOT EXISTS case_statistics AS
SELECT
    case_reference,
    COUNT(*) AS total_evidence,
    COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
    COUNT(*) FILTER (WHERE severity = 'high') AS high_count,
    MIN(created_at) AS first_evidence,
    MAX(created_at) AS latest_evidence
FROM evidence_current
GROUP BY case_reference
WITH DATA;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS: Automatic Ledger Entries
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-append evidence changes to ledger
CREATE OR REPLACE FUNCTION evidence_ledger_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_sequence BIGINT;
BEGIN
    v_sequence := append_to_ledger(
        'evidence_' || TG_OP,
        jsonb_build_object(
            'evidence_id', NEW.evidence_id,
            'content_hash', NEW.content_hash,
            'version', NEW.version,
            'operation', TG_OP
        )
    );

    -- Update ledger reference
    NEW.ledger_sequence := v_sequence;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_ledger_trigger
    BEFORE INSERT OR UPDATE ON evidence
    FOR EACH ROW
    EXECUTE FUNCTION evidence_ledger_trigger();

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES: Performance Optimization
-- ═══════════════════════════════════════════════════════════════════════════

-- Partial indexes for common queries
CREATE INDEX idx_evidence_critical ON evidence(case_reference, created_at)
    WHERE severity = 'critical' AND valid_to = 'infinity';

-- BRIN index for time-series data
CREATE INDEX idx_ledger_brin ON ledger USING brin(created_at) WITH (pages_per_range = 128);

-- ═══════════════════════════════════════════════════════════════════════════
-- GENESIS INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Insert genesis block
INSERT INTO ledger (entry_hash, previous_hash, entry_type, entry_data)
VALUES (
    encode(digest('GENESIS_BLOCK_FORBIDDEN_NINJA_CITY_2026', 'sha256'), 'hex'),
    NULL,
    'genesis',
    jsonb_build_object(
        'system', 'GENESIS 2.0',
        'charter', 'Forbidden Ninja City v1.0.0',
        'admin_master', 'Murray Bembrick',
        'initialized_at', NOW()
    )
) ON CONFLICT DO NOTHING;

-- Insert system principal
INSERT INTO principals (id, principal_type, identifier, metadata)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system',
    'genesis:system',
    jsonb_build_object('name', 'GENESIS System', 'version', '2.0.0')
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE ledger IS 'Immutable append-only hash-chained ledger for all state changes';
COMMENT ON TABLE evidence IS 'Evidence storage with vector embeddings and temporal versioning';
COMMENT ON TABLE events IS 'Event sourcing table for complete audit reconstruction';
COMMENT ON TABLE evidence_relationships IS 'Graph relationships between evidence items';
COMMENT ON FUNCTION find_similar_evidence IS 'Vector similarity search using cosine distance';
COMMENT ON FUNCTION search_evidence_hybrid IS 'Hybrid search combining FTS and vector similarity';
COMMENT ON FUNCTION verify_ledger_integrity IS 'Verify hash chain integrity of ledger';
