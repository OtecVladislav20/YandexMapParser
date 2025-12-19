FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      chromium-driver \
      xvfb \
      xauth \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["sh","-lc","xvfb-run -a -s '-screen 0 1920x1080x24' uvicorn app.main:app --host 0.0.0.0 --port 8000"]
