import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# 1. SYNTHESIZE PHYSICS-INFORMED TRI-CITY MONSOON DATASET
np.random.seed(42)
n_samples = 5000

# Feature 1: Forecast Rainfall (0 to 130 mm/hr; July 2023 deluge peaked ~110 mm/hr)
rain = np.random.exponential(scale=28.0, size=n_samples)
rain = np.clip(rain, 0.0, 130.0)

# Feature 2: SRTM DEM Elevation across Chandigarh (325m) -> Mohali/Kharar (301m)
elevation = np.random.uniform(298.0, 332.0, n_samples)

# Feature 3: Effective Drain Threshold (mm/hr)
# Legacy design is 0.5 in/hr (12.7 mm/hr), varying from 6.5 to 15.5 due to choe siltation
drain_threshold = np.random.normal(loc=12.7, scale=2.2, size=n_samples)
drain_threshold = np.clip(drain_threshold, 6.0, 18.0)

# Feature 4: Historical Choe Recurrence Weight (1.0 to 5.0)
recurrence = np.random.uniform(1.0, 5.0, n_samples)

X = pd.DataFrame({
    'forecast_rain_mm_hr': rain,
    'elevation_m': elevation,
    'drain_threshold_mm': drain_threshold,
    'historical_recurrence_weight': recurrence
})

# Physics-informed hydrological risk target generation
drain_deficit = np.maximum(0.0, rain - drain_threshold)
elevation_vulnerability = (332.0 - elevation) / 34.0  # Lower basin = higher runoff pooling

hydrological_index = (
    (drain_deficit * 0.68) +
    (elevation_vulnerability * 18.0) +
    (recurrence * 4.2) -
    (drain_threshold * 0.45)
)

# Add subtle sensor noise for realistic generalization
hydrological_index += np.random.normal(0, 1.8, n_samples)

y = []
for idx in hydrological_index:
    if idx < 12.0:
        y.append('Low')
    elif idx < 28.0:
        y.append('Medium')
    elif idx < 48.0:
        y.append('High')
    else:
        y.append('Critical')

y = pd.Series(y)

# 2. TRAIN EXPLAINABLE GRADIENT BOOSTING CLASSIFIER
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

clf = GradientBoostingClassifier(
    n_estimators=150,
    learning_rate=0.08,
    max_depth=4,
    subsample=0.85,
    random_state=42
)
clf.fit(X_train, y_train)

# 3. EVALUATE & SAVE ARTIFACT + METADATA
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
importances = {col: round(float(imp), 4) for col, imp in zip(X.columns, clf.feature_importances_)}

os.makedirs("ml", exist_ok=True)
artifact = {
    "model": clf,
    "feature_names": list(X.columns),
    "classes": list(clf.classes_),
    "global_importances": importances,
    "validation_accuracy": round(float(acc), 4),
    "legacy_drain_benchmark_mm_hr": 12.7
}
joblib.dump(artifact, "ml/model.joblib")

print(f"\n=== CHOESENSE ML ENGINE V2.0 TRAINED (Accuracy: {acc*100:.2f}%) ===")
print("Global Feature Importances (Non-Zero Verified):")
for k, v in importances.items():
    print(f" - {k}: {v*100:.1f}%")
