FROM python:3.9-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY model ./model

EXPOSE 8090

CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:8090", "app:app", "--timeout", "120"]
