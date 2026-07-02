from __future__ import annotations

from pathlib import Path

import tensorflow as tf


OUTPUT_PATH = Path("models/oral-lesion-triage-cnn/1.0.0/model.keras")


def build_model() -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV3Small(
        input_shape=(224, 224, 3),
        include_top=False,
        weights=None,
        pooling="avg",
    )
    inputs = tf.keras.Input(shape=(224, 224, 3), name="image")
    x = base(inputs, training=False)
    x = tf.keras.layers.Dropout(0.2, name="dropout")(x)
    outputs = tf.keras.layers.Dense(3, activation="softmax", name="triage")(x)
    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="oral_lesion_triage_cnn")
    model.compile(
        optimizer="adam",
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    model = build_model()
    model.save(OUTPUT_PATH)
    print(f"Saved technical checkpoint to {OUTPUT_PATH}")
    print("WARNING: This checkpoint is not clinically trained or validated.")


if __name__ == "__main__":
    main()
