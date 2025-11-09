WORKDIR /app
COPY requirements.txt ./
RUN apt-get update && apt-get install -y --no-install-recommends gcc curl \
 && pip install --no-cache-dir -r requirements.txt \
 && apt-get purge -y gcc && rm -rf /var/lib/apt/lists/*
COPY app/ /app/app/
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
