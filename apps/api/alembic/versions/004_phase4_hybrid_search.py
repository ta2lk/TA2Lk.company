"""Phase 4 Migration: Industrial Documents, Chunks, and Hybrid Search

Revision ID: 004_phase4_hybrid_search
Revises: 003_phase3_knowledge_graph
Create Date: 2026-09-23 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_phase4_hybrid_search'
down_revision = '003_phase3_knowledge_graph'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Documents Table
    op.create_table(
        'documents',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=256), nullable=False),
        sa.Column('doc_type', sa.String(length=32), nullable=False),
        sa.Column('source_file', sa.String(length=256), nullable=True),
        sa.Column('mime_type', sa.String(length=64), nullable=False, server_default='text/plain'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('linked_entity_ids', postgresql.ARRAY(sa.String(length=64)), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_documents_tenant_type', 'documents', ['tenant_id', 'doc_type'])

    # 2. Document Chunks Table
    op.create_table(
        'document_chunks',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('document_id', sa.String(length=64), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('section_header', sa.String(length=256), nullable=True),
        sa.Column('is_table', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('table_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_codes', postgresql.ARRAY(sa.String(length=32)), nullable=False, server_default='{}'),
        sa.Column('technical_specs', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('linked_entity_ids', postgresql.ARRAY(sa.String(length=64)), nullable=False, server_default='{}'),
        sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('token_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('checksum', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_chunks_tenant_doc', 'document_chunks', ['tenant_id', 'document_id'])
    op.create_index('idx_chunks_error_codes', 'document_chunks', ['error_codes'], postgresql_using='gin')

def downgrade():
    op.drop_table('document_chunks')
    op.drop_table('documents')
