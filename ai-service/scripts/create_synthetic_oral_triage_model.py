from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image, ImageDraw, ImageFilter
from tensorflow.keras.applications.mobilenet_v3 import preprocess_input


DEFAULT_OUTPUT = Path("models/oral-lesion-triage-cnn/1.0.0/model.keras")
CLASS_NAMES = ("low", "moderate", "high")
IMAGE_SIZE = 224
SEED = 20260702


def _rng(seed_offset: int) -> random.Random:
    return random.Random(SEED + seed_offset)


def _base_mouth_texture(rng: random.Random) -> Image.Image:
    base_color = (
        rng.randint(172, 220),
        rng.randint(82, 132),
        rng.randint(92, 142),
    )
    image = Image.new("RGB", (IMAGE_SIZE, IMAGE_SIZE), base_color)
    draw = ImageDraw.Draw(image, "RGBA")

    for _ in range(32):
        x0 = rng.randint(-30, IMAGE_SIZE)
        y0 = rng.randint(-30, IMAGE_SIZE)
        x1 = x0 + rng.randint(18, 90)
        y1 = y0 + rng.randint(8, 42)
        color = (
            min(255, base_color[0] + rng.randint(-18, 28)),
            min(255, base_color[1] + rng.randint(-18, 22)),
            min(255, base_color[2] + rng.randint(-18, 22)),
            rng.randint(18, 55),
        )
        draw.ellipse((x0, y0, x1, y1), fill=color)

    return image.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.4, 1.5)))


def _draw_irregular_patch(
    draw: ImageDraw.ImageDraw,
    rng: random.Random,
    center: tuple[int, int],
    radius: int,
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int] | None = None,
) -> None:
    points: list[tuple[float, float]] = []
    for index in range(22):
        angle = 2 * math.pi * index / 22
        jitter = rng.uniform(0.55, 1.25)
        points.append((
            center[0] + math.cos(angle) * radius * jitter,
            center[1] + math.sin(angle) * radius * rng.uniform(0.45, 1.05),
        ))
    draw.polygon(points, fill=fill, outline=outline)


def _sample_image(class_index: int, sample_index: int) -> Image.Image:
    rng = _rng(class_index * 10_000 + sample_index)
    image = _base_mouth_texture(rng)
    draw = ImageDraw.Draw(image, "RGBA")

    if class_index == 0:
        for _ in range(rng.randint(1, 3)):
            x = rng.randint(35, 170)
            y = rng.randint(35, 170)
            draw.ellipse((x, y, x + rng.randint(8, 22), y + rng.randint(5, 16)), fill=(255, 180, 190, 28))

    if class_index == 1:
        center = (rng.randint(70, 155), rng.randint(70, 155))
        _draw_irregular_patch(draw, rng, center, rng.randint(22, 42), (238, 205, 188, 120), (190, 70, 80, 65))
        if rng.random() > 0.35:
            _draw_irregular_patch(draw, rng, (center[0] + rng.randint(-10, 12), center[1] + rng.randint(-8, 12)), rng.randint(10, 22), (220, 55, 65, 80))

    if class_index == 2:
        center = (rng.randint(68, 158), rng.randint(68, 158))
        _draw_irregular_patch(draw, rng, center, rng.randint(30, 56), (126, 28, 42, 150), (75, 15, 24, 120))
        _draw_irregular_patch(draw, rng, (center[0] + rng.randint(-8, 8), center[1] + rng.randint(-8, 8)), rng.randint(12, 28), (235, 220, 198, 120))
        for _ in range(rng.randint(2, 5)):
            x = center[0] + rng.randint(-34, 34)
            y = center[1] + rng.randint(-30, 30)
            draw.ellipse((x, y, x + rng.randint(5, 15), y + rng.randint(4, 13)), fill=(80, 8, 18, 95))

    angle = rng.uniform(-10, 10)
    image = image.rotate(angle, resample=Image.Resampling.BILINEAR, fillcolor=image.getpixel((0, 0)))
    return image.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.0, 0.55)))


def _make_dataset(samples_per_class: int) -> tuple[np.ndarray, np.ndarray]:
    images: list[np.ndarray] = []
    labels: list[int] = []

    for class_index in range(len(CLASS_NAMES)):
        for sample_index in range(samples_per_class):
            image = _sample_image(class_index, sample_index)
            images.append(np.asarray(image, dtype=np.float32))
            labels.append(class_index)

    x = preprocess_input(np.stack(images, axis=0))
    y = tf.keras.utils.to_categorical(np.asarray(labels, dtype=np.int32), num_classes=len(CLASS_NAMES))
    order = np.random.default_rng(SEED).permutation(len(labels))
    return x[order], y[order]


def build_model() -> tf.keras.Model:
    try:
        base = tf.keras.applications.MobileNetV3Small(
            input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
            include_top=False,
            weights="imagenet",
            pooling="avg",
        )
        print("Loaded MobileNetV3Small ImageNet weights.")
    except Exception as exc:
        print(f"Could not load ImageNet weights, using random base: {exc}")
        base = tf.keras.applications.MobileNetV3Small(
            input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
            include_top=False,
            weights=None,
            pooling="avg",
        )

    base.trainable = False
    x = tf.keras.layers.Dropout(0.15, name="triage_dropout")(base.output)
    output = tf.keras.layers.Dense(len(CLASS_NAMES), activation="softmax", name="triage")(x)
    model = tf.keras.Model(inputs=base.input, outputs=output, name="oral_lesion_triage_cnn")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--samples-per-class", type=int, default=80)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--if-missing", action="store_true")
    args = parser.parse_args()

    if args.if_missing and args.output.exists():
        print(f"Checkpoint already exists, keeping {args.output}")
        return

    random.seed(SEED)
    np.random.seed(SEED)
    tf.keras.utils.set_random_seed(SEED)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    x, y = _make_dataset(samples_per_class=args.samples_per_class)
    model = build_model()
    model.fit(x, y, batch_size=24, epochs=args.epochs, validation_split=0.2, verbose=2)
    model.save(args.output)
    print(f"Saved synthetic technical checkpoint to {args.output}")
    print("WARNING: This model is for software integration tests only, not clinical use.")


if __name__ == "__main__":
    main()
