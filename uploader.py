import argparse
import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing dependency: requests", file=sys.stderr)
    print("Install with: pip install requests", file=sys.stderr)
    sys.exit(1)


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def main() -> int:
    root = Path(__file__).resolve().parent

    # Load the same env names used by ProfilePage.jsx
    load_env_file(root / "renderer" / ".env")
    load_env_file(root / "renderer" / ".env.local")

    parser = argparse.ArgumentParser(
        description="Upload an image to Cloudinary and print secure_url"
    )
    parser.add_argument("image_path", nargs="?", help="Path to image file")
    parser.add_argument(
        "--folder",
        default="academyflow/profiles",
        help="Cloudinary folder (default: academyflow/profiles)",
    )
    args = parser.parse_args()

    image_path = args.image_path or input("Enter image path: ").strip()
    if not image_path:
        print("No image path provided.", file=sys.stderr)
        return 1

    image_file = Path(image_path).expanduser()
    if not image_file.is_file():
        print(f"File not found: {image_file}", file=sys.stderr)
        return 1

    cloud_name = os.getenv("VITE_CLOUDINARY_CLOUD_NAME")
    upload_preset = os.getenv("VITE_CLOUDINARY_UPLOAD_PRESET")

    if not cloud_name or not upload_preset:
        print(
            "Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET "
            "in [.env](http://_vscodecontentref_/0) or renderer/.env.local",
            file=sys.stderr,
        )
        return 1

    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"

    with image_file.open("rb") as f:
        response = requests.post(
            url,
            data={
                "upload_preset": upload_preset,
                "folder": args.folder,
            },
            files={"file": f},
            timeout=120,
        )

    try:
        payload = response.json()
    except Exception:
        print("Cloudinary response was not valid JSON:", file=sys.stderr)
        print(response.text, file=sys.stderr)
        return 1

    if not response.ok or "secure_url" not in payload:
        print("Upload failed.", file=sys.stderr)
        print(json.dumps(payload, indent=2), file=sys.stderr)
        return 1

    print(payload["secure_url"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())