FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /training

# System deps for opencv-headless and torch runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (cache-friendly layer)
# Install CPU-only PyTorch first to avoid pulling ~2 GB of CUDA libs
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY app/requirements.txt /training/app/requirements.txt
RUN pip install --no-cache-dir -r /training/app/requirements.txt

# Copy application code
COPY app/ /training/app/

# Copy trained model weights
COPY models/ /training/models/

# Copy static assets
COPY app/static/ /training/app/static/

# Place Expo web build where the app expects it (app/static/rn/)
COPY app/rn_app/dist/ /training/app/static/rn/

# Optional pinned pipeline model selectors
COPY pipeline_*_model.txt /training/

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
