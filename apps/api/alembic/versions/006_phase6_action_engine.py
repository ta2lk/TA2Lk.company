"""Phase 6 Migration: Action Proposals, Executions, and Feedback Loops

Revision ID: 006_phase6_action_engine
Revises: 005_phase5_reasoning_engine
Create Date: 2026-09-23 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_phase6_action_engine'
down_revision = '005_phase5_reasoning_engine'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Action Proposals Table
    op.create_table(
        'action_proposals',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('target_entity_id', sa.String(length=64), nullable=False),
        sa.Column('target_entity_name', sa.String(length=255), nullable=False),
        sa.Column('system_target', sa.String(length=32), nullable=False),
        sa.Column('command_type', sa.String(length=64), nullable=False),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('required_approval_role', sa.String(length=64), nullable=False),
        sa.Column('approval_status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('approved_by', sa.String(length=255), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('rollback_plan', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('estimated_impact', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_proposals_tenant_status', 'action_proposals', ['tenant_id', 'approval_status'])

    # 2. Action Executions Table
    op.create_table(
        'action_executions',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('proposal_id', sa.String(length=64), sa.ForeignKey('action_proposals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('system_target', sa.String(length=32), nullable=False),
        sa.Column('command_type', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('external_reference_id', sa.String(length=128), nullable=False),
        sa.Column('guardrails_evaluation', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('audit_checksum', sa.String(length=64), nullable=False),
        sa.Column('dispatched_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_executions_tenant', 'action_executions', ['tenant_id', 'proposal_id'])

    # 3. Feedback Loop Verifications Table
    op.create_table(
        'feedback_verifications',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('execution_id', sa.String(length=64), sa.ForeignKey('action_executions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), nullable=False),
        sa.Column('current_sensor_value', sa.Float(), nullable=False),
        sa.Column('target_value', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('rollback_triggered', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_feedback_tenant_exec', 'feedback_verifications', ['tenant_id', 'execution_id'])

def downgrade():
    op.drop_table('feedback_verifications')
    op.drop_table('action_executions')
    op.drop_table('action_proposals')
