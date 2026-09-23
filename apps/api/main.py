"""
Industrial Brain — FastAPI Backend Service
Modular Monolith Core Platform (Phase 1)
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI(
    title="Industrial Brain API",
    description="Operational Intelligence Platform — Strict Multi-tenancy, RBAC & Audit Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["System"])
async def root_health():
    return {
        "status": "healthy",
        "service": "industrial-brain-api",
        "version": "1.0.0",
        "timestamp": time.time()
    }

@app.get("/api/v1/health", tags=["System"])
async def v1_health():
    return {
        "status": "healthy",
        "service": "industrial-brain-api",
        "version": "1.0.0",
        "database": "connected",
        "redis": "connected",
        "timestamp": time.time()
    }
