FROM python:3.11-slim

# Install Tesseract OCR and system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY intake-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY intake-service .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
