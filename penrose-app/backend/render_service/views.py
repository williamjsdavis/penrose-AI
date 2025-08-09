import tempfile
import subprocess
import os
import json
from uuid import uuid4
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import base64
import io
from urllib.parse import urlparse

from PIL import Image
from openai import OpenAI

# Default Domain DSL used to constrain model output
DEFAULT_DOMAIN_DSL = """
type Set
type Point
type Map

constructor Singleton(Point p) -> Set

function Intersection(Set a, Set b) -> Set
function Union(Set a, Set b) -> Set
function Subtraction(Set a, Set b) -> Set
function CartesianProduct(Set a, Set b) -> Set
function Difference(Set a, Set b) -> Set
function Subset(Set a, Set b) -> Set
function AddPoint(Point p, Set s1) -> Set

predicate From(Map f, Set domain, Set codomain)
predicate Empty(Set s)
predicate Intersecting(Set s1, Set s2)
predicate Subset(Set s1, Set s2)
predicate Equal(Set s1, Set s2)
predicate PointIn(Set s, Point p)
predicate In(Point p, Set s)
predicate Injection(Map m)
predicate Surjection(Map m)
predicate Bijection(Map m)
predicate PairIn(Point, Point, Map)
"""


def _load_and_downscale_image_to_data_url(image_path: str, max_dim: int = 1024) -> str:
    """Open image from path, downscale to max_dim on the longer side, return as data URL (JPEG)."""
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            width, height = img.size
            if max(width, height) > max_dim:
                img.thumbnail((max_dim, max_dim), Image.LANCZOS)
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=85, optimize=True)
            b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            return f"data:image/jpeg;base64,{b64}"
    except Exception as e:
        raise RuntimeError(f"Failed to process image: {e}")


def _extract_output_text(response) -> str:
    """Extract text content from OpenAI Responses API result robustly."""
    # Try the structured output
    try:
        chunks = []
        for block in getattr(response, "output", []) or []:
            if getattr(block, "type", None) == "message":
                for c in getattr(block, "content", []) or []:
                    if getattr(c, "type", None) == "output_text":
                        chunks.append(getattr(c, "text", ""))
        text = "\n".join(chunks).strip()
        if text:
            return text
    except Exception:
        pass
    # Fallback attributes some SDK versions provide
    for attr in ("output_text", "content", "text"):
        if hasattr(response, attr):
            val = getattr(response, attr)
            if isinstance(val, str) and val.strip():
                return val.strip()
    # Last resort
    return str(response)


def _sanitize_substance(text: str) -> str:
    """Remove code fences and extraneous wrapping from model output."""
    if not text:
        return text
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = [ln for ln in stripped.splitlines() if not ln.strip().startswith("```")]
        stripped = "\n".join(lines).strip()
    # Remove potential language tag like ```substance
    stripped = stripped.replace("```substance", "").strip()
    return stripped


@csrf_exempt
def render_penrose(request):
    if request.method != "POST":
        return HttpResponseBadRequest("POST required")

    try:
        body = json.loads(request.body)
    except Exception:
        return HttpResponseBadRequest("Invalid JSON")

    domain = body.get("domain", "")
    substance = body.get("substance", "")
    style = body.get("style", "")
    variation = body.get("variation", "test")
    trio = body.get("trio")

    if trio and (not (domain or substance or style)):
        return HttpResponseBadRequest(
            "Please send domain, substance, and style fields (strings)"
        )

    if not (domain and substance and style):
        return HttpResponseBadRequest("domain, substance, and style fields required")

    with tempfile.TemporaryDirectory() as td:
        open(os.path.join(td, "domain.dsl"), "w").write(domain)
        open(os.path.join(td, "substance.dsl"), "w").write(substance)
        open(os.path.join(td, "style.dsl"), "w").write(style)

        node_path = os.environ.get("NODE_PATH", "node")
        runner = os.path.join(os.path.dirname(__file__), "node_runner.js")
        env = os.environ.copy()
        env["PENROSE_VARIATION"] = variation
        try:
            p = subprocess.run(
                [node_path, runner, td],
                capture_output=True,
                text=True,
                timeout=30,
                env=env,
            )
        except subprocess.TimeoutExpired:
            return JsonResponse({"error": "Rendering timed out"}, status=504)

        if p.returncode != 0:
            try:
                info = json.loads((p.stderr or "").strip())
            except Exception:
                info = {"stderr": p.stderr}
            return JsonResponse(
                {"error": "Penrose render failed", "info": info}, status=400
            )

        svg = p.stdout
        return JsonResponse({"svg": svg})


@csrf_exempt
def upload_image(request):
    if request.method != "POST":
        return HttpResponseBadRequest("POST required")

    if not request.FILES or "image" not in request.FILES:
        return HttpResponseBadRequest("No image provided")

    image = request.FILES["image"]
    ext = os.path.splitext(image.name)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        return HttpResponseBadRequest("Unsupported file type")

    os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
    filename = f"upload_{uuid4().hex}{ext}"
    save_path = os.path.join(settings.MEDIA_ROOT, filename)
    with open(save_path, "wb") as f:
        for chunk in image.chunks():
            f.write(chunk)

    relative_url = f"{settings.MEDIA_URL}{filename}"
    absolute_url = request.build_absolute_uri(relative_url)
    return JsonResponse({"url": absolute_url})


@csrf_exempt
def generate_substance(request):
    if request.method != "POST":
        return HttpResponseBadRequest("POST required")

    try:
        body = json.loads(request.body)
    except Exception:
        return HttpResponseBadRequest("Invalid JSON")

    image_url = body.get("image_url")
    if not image_url:
        return HttpResponseBadRequest("image_url is required")

    # Derive local file path from MEDIA_URL
    try:
        parsed = urlparse(image_url)
        filename = os.path.basename(parsed.path)
        image_path = os.path.join(settings.MEDIA_ROOT, filename)
    except Exception:
        return HttpResponseBadRequest("Invalid image_url")

    if not os.path.exists(image_path):
        return HttpResponseBadRequest("Image not found on server")

    try:
        data_url = _load_and_downscale_image_to_data_url(image_path, max_dim=1024)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

    instructions = (
        "You are given an image of a mathematical/diagrammatic scene. "
        "Generate ONLY a Penrose Substance DSL program that, when paired with the provided domain and style, "
        "produces a diagram that closely matches the image.\n\n"
        "Constraints:\n"
        "- Use ONLY the constructs available in the following domain DSL (types, constructors, functions, predicates).\n"
        "- Aim for a balance between simplicity and fidelity; avoid overly complex object counts if not necessary.\n"
        "- Do NOT perform OCR or extract literal text from the image; use unlabeled or simple labels where needed.\n"
        "- Output ONLY the Substance DSL text with no explanations and no code fences.\n\n"
        "Domain DSL:\n" + DEFAULT_DOMAIN_DSL
    )

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return JsonResponse(
            {"error": "OPENAI_API_KEY not set in environment"}, status=500
        )

    client = OpenAI(api_key=api_key)

    try:
        resp = client.responses.create(
            model="gpt-5",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": instructions},
                        {"type": "input_image", "image_url": data_url},
                    ],
                }
            ],
        )
    except Exception as e:
        return JsonResponse({"error": f"OpenAI API error: {e}"}, status=502)

    text = _extract_output_text(resp)
    substance = _sanitize_substance(text)
    if not substance:
        return JsonResponse({"error": "Model returned empty result"}, status=502)

    return JsonResponse({"substance": substance})
