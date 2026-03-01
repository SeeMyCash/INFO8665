FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /repo

# System deps for opencv/ultralytics runtime (headless)
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /repo/requirements.txt
RUN pip install --no-cache-dir -r /repo/requirements.txt

COPY . /repo

# Default to a shell so this image is usable for demos.
CMD ["bash"]
