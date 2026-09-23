"""Phase 3 Migration: Industrial Knowledge Graph & Entity Resolution

Revision ID: 003_phase3_knowledge_graph
Revises: 002_phase2_connectors
Create Date: 2026-09-23 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_phase3_knowledge_graph'
down_revision = '002_phase2_connectors'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Graph Nodes Table
    op.create_table(
        'graph_nodes',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('canonical_id', sa.String(length=128), nullable=False),
        sa.Column('entity_type', sa.String(length=64), nullable=False),
        sa.Column('category', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('source_refs', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_graph_nodes_tenant', 'graph_nodes', ['tenant_id', 'canonical_id'])
    op.create_index('idx_graph_nodes_type', 'graph_nodes', ['tenant_id', 'entity_type'])

    # 2. Graph Edges Table (Bi-directional & Time-Aware)
    op.create_table(
        'graph_edges',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_id', sa.String(length=64), sa.ForeignKey('graph_nodes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_id', sa.String(length=64), sa.ForeignKey('graph_nodes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('relation_type', sa.String(length=64), nullable=False),
        sa.Column('properties', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('valid_from', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('valid_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_graph_edges_out', 'graph_edges', ['tenant_id', 'source_id', 'relation_type'])
    op.create_index('idx_graph_edges_in', 'graph_edges', ['tenant_id', 'target_id', 'relation_type'])

    # 3. Human Review Queue Table
    op.create_table(
        'human_review_queue',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('tenant_id', sa.String(length=64), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('primary_node_id', sa.String(length=64), sa.ForeignKey('graph_nodes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('candidate_node_id', sa.String(length=64), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('match_reasons', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('proposed_merged_node', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('reviewed_by', sa.String(length=128), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('decision_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_review_queue_tenant_status', 'human_review_queue', ['tenant_id', 'status'])

def downgrade():
    op.drop_table('human_review_queue')
    op.drop_table('graph_edges')
    op.drop_table('graph_nodes')
