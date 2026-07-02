# ============================================================
# Dockerfile.deploy  —  Imagen optimizada para Render free tier
# Sin TensorFlow (usa ContractFallbackModel para demo)
# Build time: ~2 min | Image size: ~300 MB (vs 2 GB con TF)
# ============================================================

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

RUN useradd -m -u 1000 user

WORKDIR /home/user/app

# Solo libs del sistema necesarias para Pillow
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libjpeg-dev \
       libpng-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=user requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY --chown=user app ./app
COPY --chown=user models ./models

USER user

EXPOSE 8000

# Health check para que Render sepa cuando está listo
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
