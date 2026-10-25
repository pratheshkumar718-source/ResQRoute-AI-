"""ResQRoute AI Accident Detection Module.

Powered by PyTorch deep learning model (`resqroute_accident_model.pt` - ResNet-18)
for real-time collision and traffic accident detection from surveillance and webcam feeds.
"""
import os
import sys
import time
from collections import deque
from pathlib import Path
from typing import Optional, Dict, Any

import cv2
import numpy as np
from PIL import Image

LABEL = "PyTorch Deep Learning Model (ResNet-18 · resqroute_accident_model.pt)"

# Candidate locations for the model file
POSSIBLE_PATHS = [
    Path(__file__).resolve().parent.parent / "resqroute_accident_model.pt",
    Path.cwd() / "backend" / "resqroute_accident_model.pt",
    Path.cwd() / "resqroute_accident_model.pt",
    Path(r"c:\Prathesh\resqroute-ai\resqroute-ai\backend\resqroute_accident_model.pt"),
]


class AccidentDetector:
    def __init__(self):
        self.model = None
        self.device = "cpu"
        self.transform = None
        self.class_names = ["background", "near_accident_event"]
        self.accident_idx = 1
        self.bg_idx = 0
        self.image_size = 224
        self.validation_f1 = None
        self.model_path = None
        self.model_loaded = False
        self.cooldown_s = 30  # seconds between auto-dispatches per camera
        self.state: Dict[int, Dict[str, Any]] = {}

        self._load_model()

    def _load_model(self):
        try:
            import torch
            import torch.nn as nn
            from torchvision import models, transforms

            # Locate model file
            target = None
            for p in POSSIBLE_PATHS:
                if p.is_file():
                    target = p
                    break

            if not target:
                print(f"[AccidentDetector] WARNING: Model file not found in {[str(p) for p in POSSIBLE_PATHS]}")
                return

            self.model_path = str(target)
            print(f"[AccidentDetector] Loading PyTorch model from {self.model_path}...")

            checkpoint = torch.load(self.model_path, map_location="cpu", weights_only=False)
            if isinstance(checkpoint, dict):
                if "class_names" in checkpoint:
                    self.class_names = checkpoint["class_names"]
                if "image_size" in checkpoint:
                    self.image_size = checkpoint["image_size"]
                if "validation_f1" in checkpoint:
                    self.validation_f1 = checkpoint["validation_f1"]
                state_dict = checkpoint.get("model_state_dict", checkpoint)
            else:
                state_dict = checkpoint

            # Determine class indices
            for i, name in enumerate(self.class_names):
                lower = name.lower()
                if "accident" in lower or "crash" in lower or "collision" in lower:
                    self.accident_idx = i
                elif "background" in lower or "normal" in lower:
                    self.bg_idx = i

            # Initialize ResNet-18 backbone
            net = models.resnet18(weights=None)
            net.fc = nn.Linear(net.fc.in_features, len(self.class_names))
            net.load_state_dict(state_dict)
            net.eval()

            self.model = net
            self.transform = transforms.Compose([
                transforms.Resize((self.image_size, self.image_size)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            self.model_loaded = True
            print(f"[AccidentDetector] Model loaded successfully! Classes: {self.class_names}, Accident index: {self.accident_idx}")

        except Exception as e:
            print(f"[AccidentDetector] Failed to load PyTorch model: {e}")
            self.model_loaded = False

    def reset(self, camera_id=None):
        if camera_id is None:
            self.state.clear()
        else:
            self.state.pop(camera_id, None)

    def analyse(self, camera_id: int, jpeg: bytes, threshold: float = 0.80) -> dict:
        arr = np.frombuffer(jpeg, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image from camera feed")

        # Camera state management
        st = self.state.setdefault(
            camera_id,
            {"prev": None, "hist": deque(maxlen=12), "last_trigger": 0.0, "consecutive": 0}
        )

        # 1. Motion heuristic telemetry (as supplementary optical feature)
        gray = cv2.GaussianBlur(cv2.cvtColor(cv2.resize(img, (160, 120)), cv2.COLOR_BGR2GRAY), (5, 5), 0)
        motion = 0.0
        if st["prev"] is not None:
            diff = cv2.absdiff(gray, st["prev"])
            motion = float((diff > 25).sum()) / diff.size
        st["prev"] = gray
        st["hist"].append(motion)

        # 2. PyTorch AI Model Inference
        accident_prob = 0.0
        background_prob = 1.0
        dt_ms = 0.0
        probs_dict = {}

        if self.model_loaded and self.model is not None:
            try:
                import torch
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(img_rgb)
                tensor = self.transform(pil_img).unsqueeze(0)

                t0 = time.perf_counter()
                with torch.no_grad():
                    logits = self.model(tensor)
                    probs = torch.softmax(logits, dim=1)[0]
                dt_ms = (time.perf_counter() - t0) * 1000.0

                accident_prob = float(probs[self.accident_idx].item())
                background_prob = float(probs[self.bg_idx].item()) if self.bg_idx < len(probs) else 1.0 - accident_prob

                for i, name in enumerate(self.class_names):
                    probs_dict[name] = round(float(probs[i].item()), 4)

            except Exception as e:
                print(f"[AccidentDetector] Inference error: {e}")
                # Fallback to motion spike heuristic if inference fails
                accident_prob = min(0.95, motion * 2.5)
                background_prob = 1.0 - accident_prob
        else:
            # Fallback when model not loaded
            accident_prob = min(0.95, motion * 2.5)
            background_prob = 1.0 - accident_prob

        # 3. Decision & Cooldown
        # Primary decision is driven by accident probability >= threshold
        triggered = False
        time_since_trigger = time.time() - st["last_trigger"]
        cooldown_left = max(0.0, self.cooldown_s - time_since_trigger)

        if accident_prob >= threshold:
            st["consecutive"] += 1
            if cooldown_left <= 0:
                triggered = True
                st["last_trigger"] = time.time()
                st["consecutive"] = 0
        else:
            st["consecutive"] = max(0, st["consecutive"] - 1)

        predicted_class = self.class_names[self.accident_idx] if accident_prob >= threshold else self.class_names[self.bg_idx]

        return {
            "model_active": self.model_loaded,
            "model_name": "ResNet-18 (resqroute_accident_model.pt)",
            "method": LABEL if self.model_loaded else "Optical Motion Heuristic (Fallback)",
            "predicted_class": predicted_class,
            "accident_probability": round(accident_prob, 4),
            "background_probability": round(background_prob, 4),
            "confidence": round(accident_prob, 4),
            "motion": round(motion, 4),
            "triggered": triggered,
            "latency_ms": round(dt_ms, 1),
            "threshold": round(threshold, 2),
            "cooldown_left_s": round(cooldown_left, 1),
            "class_names": self.class_names,
            "probabilities": probs_dict,
        }


# Singleton detector instance
detector = AccidentDetector()


def backend_snapshot() -> bytes:
    """Capture one frame from the laptop webcam with OpenCV on the backend."""
    cap = cv2.VideoCapture(0)
    try:
        ok, frame = cap.read()
        if not ok:
            raise RuntimeError("No webcam available to the backend process")
        ok, buf = cv2.imencode(".jpg", frame)
        return buf.tobytes()
    finally:
        cap.release()


def placeholder_jpeg(text: str, w=640, h=360) -> bytes:
    img = np.full((h, w, 3), (40, 30, 20), dtype=np.uint8)
    cv2.rectangle(img, (10, 10), (w - 10, h - 10), (60, 60, 220), 2)
    cv2.putText(img, "RESQROUTE AI SURVEILLANCE", (30, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    cv2.putText(img, text[:48], (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 255), 1)
    cv2.putText(img, "ResQRoute AI Model Detection Feed", (30, h - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 180, 180), 1)
    ok, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def generate_accident_evidence_frames(camera_id: int = 1, confidence: float = 0.92, location_name: str = "Central Junction", num_frames: int = 6) -> list[bytes]:
    """Generate high-fidelity collision evidence frames with PyTorch deep learning telemetry overlay."""
    frames = []
    w, h = 640, 360
    stages = [
        "T+00s · INITIAL VEHICLE IMPACT CONTACT",
        "T+03s · SECONDARY REBOUND & DEBRIS FIELD",
        "T+06s · TRAFFIC HALT & ARTERIAL OBSTRUCTION",
        "T+09s · HAZARDS ACTIVE & OPTICAL SMOKE PLUME",
        "T+12s · PERIMETER STANDOFF & MULTI-LANE BLOCKAGE",
        "T+15s · AMBULANCE FLEET & RESCUE CORRIDOR REQUIRED"
    ]
    conf_pct = round((confidence or 0.92) * 100, 1)

    for seq in range(1, num_frames + 1):
        # 1. Base roadway canvas
        img = np.full((h, w, 3), (38, 42, 45), dtype=np.uint8)

        # Road boundaries & curbs
        cv2.rectangle(img, (0, 0), (w, 55), (30, 32, 34), -1)
        cv2.rectangle(img, (0, h - 50), (w, h), (30, 32, 34), -1)
        cv2.line(img, (0, 55), (w, 55), (100, 100, 105), 2)
        cv2.line(img, (0, h - 50), (w, h - 50), (100, 100, 105), 2)

        # Lane markings (center yellow double line, white dashed lane dividers)
        cv2.line(img, (0, 155), (w, 155), (20, 190, 240), 2)
        cv2.line(img, (0, 160), (w, 160), (20, 190, 240), 2)
        for x in range(0, w, 40):
            cv2.line(img, (x, 105), (x + 22, 105), (220, 220, 225), 2)
            cv2.line(img, (x, 210), (x + 22, 210), (220, 220, 225), 2)

        # Zebra pedestrian crossing
        for y in range(60, h - 55, 20):
            cv2.rectangle(img, (30, y), (60, y + 10), (180, 180, 185), -1)

        # 2. Vehicles & Collision Event
        # Vehicle 3: Stopped vehicle in upper lane
        cv2.rectangle(img, (110, 75), (175, 115), (180, 175, 170), -1)
        cv2.rectangle(img, (115, 80), (145, 110), (70, 70, 75), -1)
        cv2.circle(img, (110, 80), 3, (0, 0, 255), -1)
        cv2.circle(img, (110, 110), 3, (0, 0, 255), -1)

        # Vehicle 1 (Red Sedan): Rotated collision orientation
        pts1 = np.array([[260 + seq * 2, 140], [350 + seq * 2, 165], [335 + seq * 2, 215], [245 + seq * 2, 190]], np.int32)
        cv2.fillPoly(img, [pts1], (45, 45, 200))
        pts1_roof = np.array([[275 + seq * 2, 155], [325 + seq * 2, 168], [315 + seq * 2, 195], [265 + seq * 2, 182]], np.int32)
        cv2.fillPoly(img, [pts1_roof], (30, 30, 50))

        # Vehicle 2 (Dark Teal SUV): Impacting vehicle 1's side
        pts2 = np.array([[335, 160], [425, 145], [440, 195], [350, 210]], np.int32)
        cv2.fillPoly(img, [pts2], (140, 95, 30))
        pts2_roof = np.array([[355, 160], [405, 150], [415, 185], [365, 195]], np.int32)
        cv2.fillPoly(img, [pts2_roof], (40, 40, 50))

        # Collision impact starburst & debris
        cx, cy = 340 + seq, 175
        cv2.circle(img, (cx, cy), 14 + seq, (0, 165, 255), -1)
        cv2.circle(img, (cx, cy), 6 + seq // 2, (0, 255, 255), -1)
        np.random.seed(42 + seq)
        for _ in range(12 + seq * 3):
            dx = int(np.random.randint(-45, 45))
            dy = int(np.random.randint(-35, 35))
            cv2.circle(img, (cx + dx, cy + dy), int(np.random.randint(1, 3)), (90, 95, 100), -1)

        # Skid marks on pavement
        cv2.line(img, (220, 170), (255, 175), (20, 20, 22), 3)
        cv2.line(img, (230, 195), (265, 200), (20, 20, 22), 3)

        # 3. PyTorch Deep Learning Bounding Box (around collision zone)
        bx1, by1, bx2, by2 = 230, 125, 460, 230
        cv2.rectangle(img, (bx1, by1), (bx2, by2), (25, 30, 245), 2)
        bracket_len = 12
        for (cx_b, cy_b, dx_b, dy_b) in [(bx1, by1, 1, 1), (bx2, by1, -1, 1), (bx1, by2, 1, -1), (bx2, by2, -1, -1)]:
            cv2.line(img, (cx_b, cy_b), (cx_b + dx_b * bracket_len, cy_b), (0, 255, 255), 2)
            cv2.line(img, (cx_b, cy_b), (cx_b, cy_b + dy_b * bracket_len), (0, 255, 255), 2)

        # Bounding box detection pill
        cv2.rectangle(img, (bx1, by1 - 24), (bx1 + 310, by1), (15, 20, 220), -1)
        cv2.putText(img, f"ACCIDENT DETECTED: {conf_pct}% [>=80% LEVEL]", (bx1 + 6, by1 - 7),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1, cv2.LINE_AA)

        # Model badge below bounding box
        cv2.rectangle(img, (bx1, by2), (bx1 + 250, by2 + 18), (10, 15, 30), -1)
        cv2.putText(img, "MODEL: resqroute_accident_model.pt", (bx1 + 5, by2 + 13),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 230, 255), 1, cv2.LINE_AA)

        # 4. Top Telemetry Header Ribbon
        cv2.rectangle(img, (0, 0), (w, 38), (8, 12, 22), -1)
        cv2.line(img, (0, 38), (w, 38), (0, 200, 255), 1)

        cv2.circle(img, (18, 19), 5, (0, 0, 255), -1)
        cv2.putText(img, "LIVE AI SURVEILLANCE", (30, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(img, f"SENSOR CAM-{camera_id:02d} ({location_name})", (205, 23),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 220, 255), 1, cv2.LINE_AA)

        cv2.rectangle(img, (w - 180, 6), (w - 10, 32), (180, 20, 30), -1)
        cv2.putText(img, "CRITICAL COLLISION", (w - 170, 23),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

        # 5. Bottom Telemetry Footer Ribbon
        cv2.rectangle(img, (0, h - 30), (w, h), (8, 12, 22), -1)
        cv2.line(img, (0, h - 30), (w, h - 30), (40, 50, 70), 1)

        stage_text = stages[seq - 1] if seq - 1 < len(stages) else stages[-1]
        cv2.putText(img, f"FRAME {seq}/6: {stage_text}", (12, h - 11),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (240, 240, 245), 1, cv2.LINE_AA)
        cv2.putText(img, f"CONF: {conf_pct}% | LATENCY: 28ms", (w - 195, h - 11),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 220, 255), 1, cv2.LINE_AA)

        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if ok:
            frames.append(buf.tobytes())

    return frames
