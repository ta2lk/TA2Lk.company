"""Phase 2 Migration: Real Data Connectors & Ingestion Pipeline

Revision ID: 002_phase2_connectors
Revises: 001_phase1_core
Create Date: 2026-09-23 13:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_phase2_connectors'
down_revision = '001_phase1_core'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Data Sources Table
    op.create_table(
        'data_sources',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('type', sa.String(length=32), nullable=False), # 'CSV', 'XLSX', 'POSTGRES', 'REST'
        sa.Column('status', sa.String(length=32), nullable=False, server_default='ACTIVE'),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_data_sources_tenant', 'data_sources', ['tenant_id'])

    # 2. Ingestion Jobs Table
    op.create_table(
        'ingestion_jobs',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data_source_id', sa.String(length=64), sa.ForeignKey('data_sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PROCESSING'),
        sa.Column('total_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('valid_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duplicate_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duration_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('initiated_by', sa.String(length=128), nullable=False),
    )
    op.create_index('idx_ingestion_jobs_tenant', 'ingestion_jobs', ['tenant_id', 'started_at'])

    # 3. Normalized Records Table
    op.create_table(
        'normalized_records',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data_source_id', sa.String(length=64), sa.ForeignKey('data_sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_id', sa.String(length=64), sa.ForeignKey('ingestion_jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_type', sa.String(length=64), nullable=False),
        sa.Column('external_id', sa.String(length=128), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('schema_version', sa.String(length=16), nullable=False, server_default='1.0.0'),
        sa.Column('row_checksum', sa.String(length=64), nullable=False),
        sa.Column('ingested_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_normalized_records_tenant_entity', 'normalized_records', ['tenant_id', 'entity_type'])
    op.create_index('idx_normalized_records_checksum', 'normalized_records', ['tenant_id', 'row_checksum'])

    # 4. Dead Letter Queue (DLQ) Table
    op.create_table(
        'dead_letter_queue',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data_source_id', sa.String(length=64), sa.ForeignKey('data_sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_id', sa.String(length=64), sa.ForeignKey('ingestion_jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('row_index', sa.Integer(), nullable=False),
        sa.Column('raw_row', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_code', sa.String(length=64), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=False),
        sa.Column('failed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.create_index('idx_dlq_tenant', 'dead_letter_queue', ['tenant_id', 'resolved'])

def downgrade():
    op.drop_table('dead_letter_queue')
    op.drop_table('normalized_records')
    op.drop_table('ingestion_jobs')
    op.drop_table('data_sources')
