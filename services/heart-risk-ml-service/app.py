import os
import sys
import numpy as np
import joblib
from flask import Flask, jsonify, request


MODEL_PATH = os.environ.get("MODEL_ARTIFACT_PATH", "/app/model/model.pkl")
THRESHOLD = float(os.environ.get("HEART_RISK_THRESHOLD", "0.43"))
ML_VERSION = os.environ.get("HEART_RISK_ML_VERSION", "heart-risk-v1")
FEATURE_ORDER = [
    "age",
    "sex",
    "chest_pain_type",
    "resting_bp_s",
    "fasting_blood_sugar",
    "max_heart_rate",
    "exercise_angina",
    "old_peak",
    "st_slope",
]

app = Flask(__name__)
model = None
model_load_error = None


def reshape(arr):
    return np.array(arr).reshape(-1, 1, arr.shape[1])


def load_model():
    global model, model_load_error

    if model is not None:
        return model

    try:
        setattr(sys.modules["__main__"], "reshape", reshape)
        model = joblib.load(MODEL_PATH)
        model_load_error = None
    except Exception as exc:
        model = None
        model_load_error = str(exc)

    return model


def get_probability(payload):
    loaded_model = load_model()
    if loaded_model is None:
        raise RuntimeError(f"Model artifact is not available: {model_load_error or 'unknown error'}")

    values = []
    for key in FEATURE_ORDER:
        value = payload.get(key)
        if value is None:
            raise ValueError(f"Missing required field: {key}")
        values.append(value)

    predicted = loaded_model.predict([values])
    if hasattr(predicted, "tolist"):
        predicted = predicted.tolist()

    if isinstance(predicted, list) and predicted and isinstance(predicted[0], list):
        probability = float(predicted[0][0])
    elif isinstance(predicted, list) and predicted:
        probability = float(predicted[0])
    else:
        probability = float(predicted)

    return probability


def risk_level(probability):
    if probability <= THRESHOLD:
        return "low"
    if probability <= 0.80:
        return "medium"
    return "high"


@app.get("/health")
def health():
    load_model()
    return jsonify(
        {
            "status": "ok" if model is not None else "degraded",
            "modelLoaded": model is not None,
            "modelLoadError": model_load_error,
        }
    )


@app.get("/v1/metadata")
def metadata():
    load_model()
    return jsonify(
        {
            "modelKey": "heart_disease_v1",
            "mlVersion": ML_VERSION,
            "threshold": THRESHOLD,
            "featureOrder": FEATURE_ORDER,
            "modelLoaded": model is not None,
        }
    )


@app.post("/v1/predictions")
def predictions():
    payload = request.get_json(silent=True) or {}

    try:
        probability = get_probability(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Prediction failed: {exc}"}), 500

    predicted_class = 1 if probability >= THRESHOLD else 0

    return jsonify(
        {
            "modelKey": "heart_disease_v1",
            "mlVersion": ML_VERSION,
            "predictedClass": predicted_class,
            "probability": probability,
            "riskLevel": risk_level(probability),
            "threshold": THRESHOLD,
            "featureOrder": FEATURE_ORDER,
        }
    )


if __name__ == "__main__":
    load_model()
    app.run(host="0.0.0.0", port=8090, debug=False)
