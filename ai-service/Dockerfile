FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

RUN useradd -m -u 1000 user

WORKDIR /home/user/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=user requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY --chown=user app ./app
COPY --chown=user models ./models

USER user

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
