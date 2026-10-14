"""Trusted runner service. Learner code only runs inside an ephemeral Docker container."""
import hmac
import json
import os
import selectors
import subprocess
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SECRET = os.environ.get("RUNNER_SECRET", "")
IMAGE = os.environ.get("RUNNER_IMAGE", "python:3.13-alpine")
SLOTS = threading.BoundedSemaphore(2)
MAX_OUTPUT = 8192
CHILD = r'''
import json, sys, io, resource
resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
resource.setrlimit(resource.RLIMIT_FSIZE, (1048576, 1048576))
resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
job = json.loads(sys.stdin.read())
sys.stdin = io.StringIO(job["input"])
exec(compile(job["code"], "bai-lam.py", "exec"), {"__name__": "__main__"})
'''


def normalize(value):
    # Preserve meaningful spaces and empty lines; allow only the final newline difference.
    value = value.replace("\r\n", "\n")
    return value[:-1] if value.endswith("\n") else value


def run_case(code, case):
    name = "codekid-" + uuid.uuid4().hex
    cmd = ["docker", "run", "--rm", "--name", name, "-i", "--network", "none",
           "--memory", "64m", "--memory-swap", "64m", "--cpus", "0.5",
           "--pids-limit", "32", "--read-only", "--cap-drop", "ALL",
           "--security-opt", "no-new-privileges", "--user", "65534:65534",
           "--tmpfs", "/tmp:rw,noexec,nosuid,size=1m", "--ulimit", "nofile=32:32",
           IMAGE, "python", "-I", "-S", "-X", "utf8", "-c", CHILD]
    proc = None
    output = {"stdout": bytearray(), "stderr": bytearray()}
    error = ""
    try:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        proc.stdin.write(json.dumps({"code": code, "input": case["input"]}).encode())
        proc.stdin.close()
        deadline = time.monotonic() + 5
        # selectors on pipes require the Linux runner container.
        with selectors.DefaultSelector() as selector:
            selector.register(proc.stdout, selectors.EVENT_READ, "stdout")
            selector.register(proc.stderr, selectors.EVENT_READ, "stderr")
            while selector.get_map():
                if time.monotonic() > deadline:
                    error = "Chương trình vượt quá thời gian cho phép (5 giây)."
                    break
                for key, _ in selector.select(timeout=0.1):
                    chunk = os.read(key.fileobj.fileno(), 1024)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    output[key.data].extend(chunk)
                    if sum(map(len, output.values())) > MAX_OUTPUT:
                        error = "Chương trình in quá nhiều dữ liệu (giới hạn 8 KB)."
                        break
                if error:
                    break
        if not error:
            proc.wait(timeout=1)
        stdout = output["stdout"][:MAX_OUTPUT].decode("utf-8", "replace")
        stderr = output["stderr"][:MAX_OUTPUT].decode("utf-8", "replace")
        if not error and proc.returncode != 0:
            error = stderr or "Chương trình bị dừng vì lỗi hoặc vượt giới hạn tài nguyên."
        return {"passed": not error and normalize(stdout) == normalize(case["expected"]), "output": stdout, "error": error}
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=10)
        if proc:
            if proc.poll() is None:
                proc.kill()
            proc.wait(timeout=2)
            for stream in (proc.stdin, proc.stdout, proc.stderr):
                stream.close()


def valid_job(job):
    return isinstance(job, dict) and isinstance(job.get("code"), str) and 0 < len(job["code"]) <= 12000 and isinstance(job.get("tests"), list) and 0 < len(job["tests"]) <= 10 and all(isinstance(t, dict) and all(isinstance(t.get(k), str) and len(t[k]) <= 4000 for k in ("input", "expected")) for t in job["tests"])


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        self.connection.settimeout(10)
        if self.path != "/run" or not SECRET or not hmac.compare_digest(self.headers.get("X-Runner-Secret", ""), SECRET):
            return self.reply(403, {"message": "Forbidden"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 100000:
                return self.reply(400, {"message": "Invalid request size"})
            job = json.loads(self.rfile.read(size))
            if not valid_job(job):
                return self.reply(400, {"message": "Invalid job"})
            if not SLOTS.acquire(blocking=False):
                return self.reply(503, {"message": "Runner busy"})
            try:
                results = [run_case(job["code"], case) for case in job["tests"]]
                self.reply(200, {"results": results})
            finally:
                SLOTS.release()
        except (ValueError, OSError, subprocess.SubprocessError):
            self.reply(503, {"message": "Sandbox unavailable"})

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    if len(SECRET) < 32:
        raise SystemExit("RUNNER_SECRET must contain at least 32 characters")
    ThreadingHTTPServer(("0.0.0.0", 8091), Handler).serve_forever()
