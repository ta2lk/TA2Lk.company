"""Phase 5 Migration: Root Cause Analyses and Operational Incidents

Revision ID: 005_phase5_reasoning_engine
Revises: 004_phase4_hybrid_search
Create Date: 2026-09-23 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_phase5_reasoning_engine'
down_revision = '004_phase4_hybrid_search'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Operational Incidents Table
    op.create_table(
        'operational_incidents',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_entity_id', sa.String(length=64), nullable=False),
        sa.Column('error_code', sa.String(length=32), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('telemetry_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='OPEN'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_incidents_tenant', 'operational_incidents', ['tenant_id', 'status'])

    # 2. RCA Analyses Table
    op.create_table(
        'rca_analyses',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('incident_id', sa.String(length=64), sa.ForeignKey('operational_incidents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_entity_id', sa.String(length=64), nullable=False),
        sa.Column('incident_summary', sa.Text(), nullable=False),
        sa.Column('execution_time_ms', sa.Float(), nullable=False),
        sa.Column('root_causes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('recommendations', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('assumptions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('unsupported_claims_detected', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_rca_tenant_incident', 'rca_analyses', ['tenant_id', 'incident_id'])

def downgrade():
    op.drop_table('rca_analyses')
    op.drop_table('operational_incidents')
