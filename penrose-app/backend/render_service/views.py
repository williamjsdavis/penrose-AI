import tempfile
import subprocess
import os
import json
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt


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
