#!/usr/bin/env python3
"""
FastAPI application entry-point.

Creates the app, wires up middleware, mounts static files,
includes the versioned API router, and registers lifecycle events.
"""

import logging
import time
import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import router as v1_router
from app.core.config import settings
from app.services.pipeline import ensure_pipeline_models
import app.services.pipeline as _pl

logger = logging.getLogger("smc")


# -- OpenAPI tag metadata --

OPENAPI_TAGS = [
    {
        "name": "Health & Info",
        "description": "Server health checks, version info, and configuration.",
    },
    {
        "name": "Pipeline",
        "description": (
            "Automatic multi-model pipeline: detector -> bill reader / coin classifier. "
            "Use **/api/pipeline/infer** to run the full detection-and-classification flow on an image."
        ),
    },
    {
        "name": "Model Management",
        "description": "List, select, and sync model artifacts from S3.",
    },
    {
        "name": "Legacy Inference",
        "description": "Single-model inference using the manually-selected active model.",
    },
]


# -- Application factory --

def create_app() -> FastAPI:
    """Build and return the FastAPI application instance."""
    application = FastAPI(
        title=settings.app_title,
        description=(
            "REST API for the **See My Cash** project.\n\n"
            "Provides:\n"
            "- Automatic **pipeline inference** (detector -> bill reader / coin classifier)\n"
            "- Manual single-model inference (detector *or* classifier)\n"
            "- Model management (list / select / sync from S3)\n\n"
            "Upload a JPEG/PNG image to `/api/pipeline/infer` for end-to-end money recognition."
        ),
        version=settings.app_version,
        openapi_tags=OPENAPI_TAGS,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # -- Middleware --
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -- Static file mounts --
    if settings.static_dir.is_dir():
        application.mount(
            "/static",
            StaticFiles(directory=settings.static_dir),
            name="static",
        )

    rn_dir = settings.rn_dir
    if rn_dir.is_dir():
        rn_expo = rn_dir / "_expo"
        rn_assets = rn_dir / "assets"
        if rn_expo.is_dir():
            application.mount("/_expo", StaticFiles(directory=rn_expo), name="rn_expo")
        if rn_assets.is_dir():
            application.mount("/assets", StaticFiles(directory=rn_assets), name="rn_assets")

    # -- API router (versioned) --
    application.include_router(v1_router, prefix="/api")

    # -- Global exception handlers --
    @application.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Return a consistent JSON error envelope for all HTTPExceptions."""
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """Catch-all for unhandled errors -- always return 500 with detail."""
        logger.error(
            "Unhandled exception on %s %s: %s\n%s",
            request.method,
            request.url.path,
            exc,
            traceback.format_exc(),
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Check server logs for details."},
        )

    # -- Lifecycle events --
    @application.on_event("startup")
    def _startup_event():
        _pl.server_start_time = time.time()
        try:
            ensure_pipeline_models(allow_refresh_from_defaults=True)
            logger.info("Pipeline models loaded on startup.")
        except Exception as exc:
            logger.warning(f"Could not auto-load pipeline on startup: {exc}")

    # -- Root / SPA routes --
    @application.get("/", include_in_schema=False)
    def root_index():
        """Serve the main web UI (static/index.html)."""
        return FileResponse(settings.static_dir / "index.html")

    @application.get("/rn", include_in_schema=False)
    @application.get("/rn/{rest_of_path:path}", include_in_schema=False)
    def rn_index(rest_of_path: str = ""):
        """Serve the React Native (Expo web) SPA -- all client routes return index.html."""
        rn_html = rn_dir / "index.html"
        if not rn_html.is_file():
            raise HTTPException(
                status_code=404, detail="React Native web build not found"
            )
        return FileResponse(rn_html)

    return application


# -- App instance (used by uvicorn: `app.main:app`) --

app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)