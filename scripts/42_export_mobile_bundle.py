#!/usr/bin/env python3
"""Export the current See My Cash pipeline into Android-friendly ONNX assets.

Outputs:
- quantized detector ONNX wrapped with byte-input pre/post processing
- quantized bill + coin classifier ONNX models wrapped with byte-input pre-processing
- optional quantized spoof-guard detector ONNX
- a manifest consumed by the React Native Android app

The resulting bundle is copied into `training/app/rn_app/assets/models/` by default.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
from typing import Any, Iterable, Optional

import onnx
from onnxruntime.quantization import QuantType, quantize_dynamic
from onnxruntime_extensions.tools import add_pre_post_processing_to_model as ppp
import torch
import torch.nn as nn
from torchvision import models
from ultralytics import YOLO


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODELS_DIR = REPO_ROOT / "training" / "models"
DEFAULT_ASSETS_DIR = REPO_ROOT / "training" / "app" / "rn_app" / "assets" / "models"
WORK_DIR_NAME = "mobile-build"
MANIFEST_NAME = "mobile-model-manifest.json"
DEFAULT_WORK_DIR = REPO_ROOT / "outputs" / WORK_DIR_NAME

PIPELINE_DEFAULTS = {
    "detector_conf_threshold": 0.20,
    "detector_iou_threshold": 0.45,
    "detector_max_det": 20,
    "detector_bill_min_conf": 0.20,
    "detector_coin_min_conf": 0.35,
    "detector_min_box_side_px": 6.0,
    "detector_min_box_area_ratio": 0.0015,
    "detector_max_box_area_ratio": 0.92,
    "detector_coin_min_aspect": 0.35,
    "detector_coin_max_aspect": 2.85,
    "detector_duplicate_iou": 0.88,
    "detector_duplicate_cross_class_iou": 0.96,
    "pipeline_coin_route_min_conf": 0.35,
    "pipeline_giant_coin_area_ratio": 0.65,
    "pipeline_max_topk_targets": 5,
    "spoof_guard_threshold": 0.80,
    "spoof_guard_block_on_detect": True,
}

IMAGENET_NORMALIZE = [
    (0.485, 0.229),
    (0.456, 0.224),
    (0.406, 0.225),
]


@dataclass(frozen=True)
class ExportPaths:
    pt_weights: Path
    float_onnx: Path
    quantized_onnx: Path
    wrapped_onnx: Path


def _parse_run_tag(name: str) -> tuple[int, str]:
    digits = "".join(ch for ch in name if ch.isdigit())
    return (len(digits), digits)


def _pick_latest(paths: Iterable[Path]) -> Optional[Path]:
    items = [p for p in paths if p.exists()]
    if not items:
        return None
    return max(
        items,
        key=lambda p: (_parse_run_tag(p.name), "__best.pt" in p.name.lower(), p.name),
    )


def _is_detector_name(name: str) -> bool:
    lowered = name.lower()
    if not lowered.endswith(".pt"):
        return False
    if "spoof" in lowered or "screen-guard" in lowered:
        return False
    return "__best.pt" in lowered or "detector" in lowered or "det-" in lowered


def _is_coin_classifier_name(name: str) -> bool:
    lowered = name.lower()
    return lowered.endswith("__model.pt") and "coin" in lowered


def _is_bill_classifier_name(name: str) -> bool:
    lowered = name.lower()
    return lowered.endswith("__model.pt") and "coin" not in lowered and (
        "bill" in lowered or "banknote" in lowered
    )


def _is_spoof_guard_name(name: str) -> bool:
    lowered = name.lower()
    return lowered.endswith(".pt") and ("spoof" in lowered or "screen-guard" in lowered or "antispoof" in lowered)


def _auto_select_models(models_dir: Path) -> dict[str, Optional[Path]]:
    all_paths = sorted(models_dir.glob("*.pt"))
    detector = _pick_latest(p for p in all_paths if _is_detector_name(p.name))
    bill = _pick_latest(p for p in all_paths if _is_bill_classifier_name(p.name))
    coin = _pick_latest(p for p in all_paths if _is_coin_classifier_name(p.name))
    spoof = _pick_latest(p for p in all_paths if _is_spoof_guard_name(p.name))
    return {
        "detector": detector,
        "bill_reader": bill,
        "coin_classifier": coin,
        "spoof_guard": spoof,
    }


def _build_classifier(backbone: str, num_classes: int) -> nn.Module:
    if backbone == "mobilenetv3_small":
        model = models.mobilenet_v3_small(weights=None)
        model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, num_classes)
        return model
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _copy_to_assets(source: Path, assets_dir: Path) -> Path:
    assets_dir.mkdir(parents=True, exist_ok=True)
    dest = assets_dir / source.name
    shutil.copy2(source, dest)
    return dest


def _export_classifier_bundle(
    checkpoint_path: Path,
    output_stem: str,
    work_dir: Path,
) -> dict[str, Any]:
    ckpt = torch.load(checkpoint_path, map_location="cpu")
    classes = [str(item) for item in ckpt["classes"]]
    image_size = int(ckpt.get("image_size", 256))
    backbone = str(ckpt.get("backbone", "resnet18"))
    normalize_imagenet = bool(ckpt.get("normalize_imagenet", True))

    model = _build_classifier(backbone, len(classes))
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    paths = ExportPaths(
        pt_weights=checkpoint_path,
        float_onnx=work_dir / f"{output_stem}.onnx",
        quantized_onnx=work_dir / f"{output_stem}.int8.onnx",
        wrapped_onnx=work_dir / f"{output_stem}.mobile.onnx",
    )
    _ensure_parent(paths.float_onnx)

    example = torch.zeros(1, 3, image_size, image_size)
    torch.onnx.export(
        model,
        example,
        paths.float_onnx,
        input_names=["input"],
        output_names=["logits"],
        opset_version=18,
        dynamo=False,
    )

    quantize_dynamic(
        str(paths.float_onnx),
        str(paths.quantized_onnx),
        weight_type=QuantType.QInt8,
    )

    base_model = onnx.load(str(paths.quantized_onnx))
    inputs = [ppp.create_named_value("image", onnx.TensorProto.UINT8, ["num_bytes"])]
    pipeline = ppp.PrePostProcessor(inputs, 18)
    pre_steps: list[Any] = [
        ppp.ConvertImageToBGR(),
        ppp.ReverseAxis(axis=2, dim_value=3, name="BGR_to_RGB"),
        ppp.Resize((image_size, image_size), policy="not_larger"),
        ppp.LetterBox(target_shape=(image_size, image_size)),
        ppp.ImageBytesToFloat(),
        ppp.ChannelsLastToChannelsFirst(),
    ]
    if normalize_imagenet:
        pre_steps.append(ppp.Normalize(IMAGENET_NORMALIZE, layout="CHW"))
    pre_steps.append(ppp.Unsqueeze([0]))
    pipeline.add_pre_processing(pre_steps)
    pipeline.add_post_processing([ppp.Softmax(name="ClassifierSoftmax")])

    wrapped_model = pipeline.run(base_model)
    onnx.save_model(wrapped_model, str(paths.wrapped_onnx))

    return {
        "file": paths.wrapped_onnx.name,
        "checkpoint": checkpoint_path.name,
        "classes": classes,
        "image_size": image_size,
        "backbone": backbone,
        "normalize_imagenet": normalize_imagenet,
        "input_name": "image",
        "output_name": "probabilities",
        "quantized": True,
        "size_bytes": paths.wrapped_onnx.stat().st_size,
    }


def _build_detector_mobile_model(
    base_onnx_path: Path,
    output_path: Path,
    image_size: int,
    num_classes: int,
) -> None:
    model = onnx.load(str(base_onnx_path))
    output_shape = [
        dim.dim_value if dim.HasField("dim_value") else -1
        for dim in model.graph.output[0].type.tensor_type.shape.dim
    ]
    postprocessed_boxes = (
        len(output_shape) == 3
        and output_shape[0] == 1
        and output_shape[-1] == 6
    )

    if not postprocessed_boxes:
        ppp.yolo_detection(
            base_onnx_path,
            output_path,
            output_format="jpg",
            onnx_opset=18,
            num_classes=num_classes,
            input_shape=[image_size, image_size],
            output_as_image=False,
        )
        return

    inputs = [ppp.create_named_value("image", onnx.TensorProto.UINT8, ["num_bytes"])]
    pipeline = ppp.PrePostProcessor(inputs, 18)
    pipeline.add_pre_processing(
        [
            ppp.ConvertImageToBGR(),
            ppp.Resize((image_size, image_size), policy="not_larger"),
            ppp.LetterBox(target_shape=(image_size, image_size)),
            ppp.ChannelsLastToChannelsFirst(),
            ppp.ImageBytesToFloat(),
            ppp.Unsqueeze([0]),
        ]
    )
    pipeline.add_post_processing(
        [
            ppp.Squeeze([0]),
            (
                ppp.ScaleNMSBoundingBoxesAndKeyPoints(name="ScaleBoundingBoxes"),
                [
                    ppp.utils.IoMapEntry("ConvertImageToBGR", producer_idx=0, consumer_idx=1),
                    ppp.utils.IoMapEntry("Resize", producer_idx=0, consumer_idx=2),
                    ppp.utils.IoMapEntry("LetterBox", producer_idx=0, consumer_idx=3),
                ],
            ),
        ]
    )
    wrapped = pipeline.run(model)
    onnx.save_model(wrapped, str(output_path))


def _export_detector_bundle(
    checkpoint_path: Path,
    output_stem: str,
    work_dir: Path,
    image_size: int = 640,
) -> dict[str, Any]:
    yolo = YOLO(str(checkpoint_path))
    class_names = [str(yolo.names[i]) for i in sorted(yolo.names)]

    paths = ExportPaths(
        pt_weights=checkpoint_path,
        float_onnx=work_dir / f"{output_stem}.onnx",
        quantized_onnx=work_dir / f"{output_stem}.int8.onnx",
        wrapped_onnx=work_dir / f"{output_stem}.mobile.onnx",
    )
    _ensure_parent(paths.float_onnx)

    exported = Path(
        yolo.export(
            format="onnx",
            imgsz=image_size,
            dynamic=False,
            opset=18,
        )
    )
    if exported.resolve() != paths.float_onnx.resolve():
        if paths.float_onnx.exists():
            paths.float_onnx.unlink()
        exported.replace(paths.float_onnx)

    quantize_dynamic(
        str(paths.float_onnx),
        str(paths.quantized_onnx),
        weight_type=QuantType.QInt8,
    )
    _build_detector_mobile_model(
        paths.quantized_onnx,
        paths.wrapped_onnx,
        image_size=image_size,
        num_classes=len(class_names),
    )

    return {
        "file": paths.wrapped_onnx.name,
        "checkpoint": checkpoint_path.name,
        "class_names": class_names,
        "input_name": "image",
        "output_name": "nms_output_with_scaled_boxes_and_keypoints",
        "image_size": image_size,
        "quantized": True,
        "size_bytes": paths.wrapped_onnx.stat().st_size,
    }


def _write_manifest(manifest_path: Path, payload: dict[str, Any]) -> None:
    _ensure_parent(manifest_path)
    manifest_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Export the current pipeline into bundled mobile ONNX assets")
    parser.add_argument("--models-dir", default=str(DEFAULT_MODELS_DIR), help="Directory containing .pt checkpoints")
    parser.add_argument("--assets-dir", default=str(DEFAULT_ASSETS_DIR), help="Target RN assets/models directory")
    parser.add_argument("--work-dir", default=str(DEFAULT_WORK_DIR), help="Intermediate export directory")
    parser.add_argument("--detector", default="", help="Override detector .pt path")
    parser.add_argument("--bill-reader", default="", help="Override bill classifier .pt path")
    parser.add_argument("--coin-classifier", default="", help="Override coin classifier .pt path")
    parser.add_argument("--spoof-guard", default="", help="Optional override spoof-guard .pt path")
    parser.add_argument("--detector-imgsz", type=int, default=640, help="Detector export resolution")
    args = parser.parse_args()

    models_dir = Path(args.models_dir).resolve()
    assets_dir = Path(args.assets_dir).resolve()
    work_dir = Path(args.work_dir).resolve()
    work_dir.mkdir(parents=True, exist_ok=True)

    selected = _auto_select_models(models_dir)
    if args.detector:
        selected["detector"] = Path(args.detector).resolve()
    if args.bill_reader:
        selected["bill_reader"] = Path(args.bill_reader).resolve()
    if args.coin_classifier:
        selected["coin_classifier"] = Path(args.coin_classifier).resolve()
    if args.spoof_guard:
        selected["spoof_guard"] = Path(args.spoof_guard).resolve()

    required = ("detector", "bill_reader", "coin_classifier")
    missing = [name for name in required if not selected.get(name)]
    if missing:
        raise SystemExit(f"Missing required checkpoints for: {', '.join(missing)}")

    detector_meta = _export_detector_bundle(
        selected["detector"],  # type: ignore[arg-type]
        output_stem="detector-android",
        work_dir=work_dir,
        image_size=int(args.detector_imgsz),
    )
    bill_meta = _export_classifier_bundle(
        selected["bill_reader"],  # type: ignore[arg-type]
        output_stem="bill-reader-android",
        work_dir=work_dir,
    )
    coin_meta = _export_classifier_bundle(
        selected["coin_classifier"],  # type: ignore[arg-type]
        output_stem="coin-classifier-android",
        work_dir=work_dir,
    )

    spoof_meta: Optional[dict[str, Any]] = None
    if selected.get("spoof_guard") is not None:
        spoof_meta = _export_detector_bundle(
            selected["spoof_guard"],  # type: ignore[arg-type]
            output_stem="spoof-guard-android",
            work_dir=work_dir,
            image_size=int(args.detector_imgsz),
        )

    copied_files = {
        "detector": _copy_to_assets(work_dir / detector_meta["file"], assets_dir).name,
        "bill_reader": _copy_to_assets(work_dir / bill_meta["file"], assets_dir).name,
        "coin_classifier": _copy_to_assets(work_dir / coin_meta["file"], assets_dir).name,
    }
    if spoof_meta is not None:
        copied_files["spoof_guard"] = _copy_to_assets(work_dir / spoof_meta["file"], assets_dir).name

    detector_meta["file"] = copied_files["detector"]
    bill_meta["file"] = copied_files["bill_reader"]
    coin_meta["file"] = copied_files["coin_classifier"]
    if spoof_meta is not None:
        spoof_meta["file"] = copied_files["spoof_guard"]

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "assets_dir": str(assets_dir.as_posix()),
        "pipeline_defaults": PIPELINE_DEFAULTS,
        "models": {
            "detector": detector_meta,
            "bill_reader": bill_meta,
            "coin_classifier": coin_meta,
            "spoof_guard": spoof_meta,
        },
    }

    manifest_path = assets_dir / MANIFEST_NAME
    _write_manifest(manifest_path, manifest)
    print(f"manifest={manifest_path}")
    print(f"detector_asset={assets_dir / detector_meta['file']}")
    print(f"bill_reader_asset={assets_dir / bill_meta['file']}")
    print(f"coin_classifier_asset={assets_dir / coin_meta['file']}")
    if spoof_meta is not None:
        print(f"spoof_guard_asset={assets_dir / spoof_meta['file']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
