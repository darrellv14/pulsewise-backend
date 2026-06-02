# Heart Risk ML Service

Service ini adalah microservice resmi untuk second machine learning PulseWise.

## Ringkasan

- model key: `heart_disease_v1`
- ml version default: `heart-risk-v1` (`HEART_RISK_ML_VERSION`)
- port default: `8090`
- framework: Flask + Gunicorn
- artefak model: `model/model.pkl`

## Kontrak Input

Service menerima tepat 9 fitur berikut:

1. `age`
2. `sex`
3. `chest_pain_type`
4. `resting_bp_s`
5. `fasting_blood_sugar`
6. `max_heart_rate`
7. `exercise_angina`
8. `old_peak`
9. `st_slope`

## Endpoint

### `GET /health`

Health check service.

### `GET /v1/metadata`

Metadata model, threshold, dan urutan fitur.

### `POST /v1/predictions`

Menjalankan prediksi risiko `heart disease`.

Contoh body:

```json
{
  "age": 58,
  "sex": 0,
  "chest_pain_type": 3,
  "resting_bp_s": 151,
  "fasting_blood_sugar": 0,
  "max_heart_rate": 118,
  "exercise_angina": 0,
  "old_peak": 0,
  "st_slope": 2
}
```

Contoh response:

```json
{
  "modelKey": "heart_disease_v1",
  "mlVersion": "heart-risk-v1",
  "predictedClass": 0,
  "probability": 0.3695482015609741,
  "riskLevel": "low",
  "threshold": 0.43,
  "featureOrder": [
    "age",
    "sex",
    "chest_pain_type",
    "resting_bp_s",
    "fasting_blood_sugar",
    "max_heart_rate",
    "exercise_angina",
    "old_peak",
    "st_slope"
  ]
}
```

## Build Lokal

```bash
docker build -t pulsewise-heart-risk-ml-service ./services/heart-risk-ml-service
```

## Run Lokal

```bash
docker run -d --name pulsewise-heart-risk-local -p 8090:8090 pulsewise-heart-risk-ml-service
```
