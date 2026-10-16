#!/usr/bin/env python3
"""OCR one image and report the pixel height of every text region.

Used by slide-lint to answer "how big is the text inside this picture, in the
image's own pixels". slide-lint then scales that by how small the image is
drawn on the slide to get the height the audience actually sees.

Run with the paddleocr venv:
  /home/dev/.venvs/paddleocr/bin/python scripts/ocr-image.py [--cache DIR] <image> [image ...]

Output: JSON on stdout, an object keyed by input path. Several images in one
call share a single model load, which is the whole cost.

enable_mkldnn=False is REQUIRED. With oneDNN on, PaddleOCR 3.7 on this box dies
in ConvertPirAttribute2RuntimeAttribute before producing anything.
"""

import hashlib
import json
import os
import sys

CACHE_VERSION = 1


def file_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def percentile(values, p):
    if not values:
        return None
    s = sorted(values)
    if len(s) == 1:
        return s[0]
    k = (len(s) - 1) * (p / 100.0)
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def make_ocr():
    from paddleocr import PaddleOCR

    return PaddleOCR(
        lang="en",
        enable_mkldnn=False,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )


def run_ocr(ocr, path):
    res = ocr.predict(path)[0]
    polys = res.get("rec_polys")
    if polys is None:
        polys = res.get("dt_polys") or []
    texts = res.get("rec_texts") or []
    scores = res.get("rec_scores") or [1.0] * len(texts)

    regions = []
    for poly, text, score in zip(polys, texts, scores):
        ys = [float(pt[1]) for pt in poly]
        xs = [float(pt[0]) for pt in poly]
        h = max(ys) - min(ys)
        if h <= 0 or not str(text).strip():
            continue
        regions.append({
            "text": str(text),
            "h": round(h, 1),
            "y": round(min(ys), 1),
            "x": round(min(xs), 1),
            "w": round(max(xs) - min(xs), 1),
            "score": round(float(score), 3),
        })
    return regions


def natural_size(path):
    """PNG header read, so the common case needs no image library at all."""
    import struct
    with open(path, "rb") as f:
        head = f.read(32)
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", head[16:24])
    from PIL import Image  # noqa
    with Image.open(path) as im:
        return im.size


def main():
    args = sys.argv[1:]
    cache_dir = None
    if "--cache" in args:
        i = args.index("--cache")
        cache_dir = args[i + 1]
        args = args[:i] + args[i + 2:]
    if not args:
        sys.exit("usage: ocr-image.py [--cache DIR] <image> [image ...]")

    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)

    results = {}
    pending = []  # only these need the model

    for path in args:
        if not os.path.exists(path):
            results[path] = {"error": "not found"}
            continue
        digest = file_hash(path)
        cache_file = os.path.join(cache_dir, digest + ".json") if cache_dir else None
        if cache_file and os.path.exists(cache_file):
            with open(cache_file) as f:
                cached = json.load(f)
            if cached.get("cache_version") == CACHE_VERSION:
                cached["cached"] = True
                results[path] = cached
                continue
        pending.append((path, digest, cache_file))

    # The model costs ~40s to load, so load it once for the whole batch and not
    # at all when every image is already cached.
    ocr = None
    if pending:
        ocr = make_ocr()

    for path, digest, cache_file in pending:
        nw, nh = natural_size(path)
        regions = run_ocr(ocr, path)
        heights = [r["h"] for r in regions]
        out = {
            "cache_version": CACHE_VERSION,
            "path": path,
            "sha256": digest,
            "natural_w": nw,
            "natural_h": nh,
            "n_regions": len(regions),
            "p5_h": percentile(heights, 5),
            "p50_h": percentile(heights, 50),
            "max_h": max(heights) if heights else None,
            "regions": regions,
            "cached": False,
        }
        if cache_file:
            with open(cache_file, "w") as f:
                json.dump(out, f)
        results[path] = out

    print(json.dumps(results))


if __name__ == "__main__":
    main()
