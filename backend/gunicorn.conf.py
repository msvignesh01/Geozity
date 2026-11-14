"""Public server settings; one process preserves the shared provider request gate."""

import os

bind = "0.0.0.0:" + os.environ.get("PORT", "10000")
workers = 1
worker_class = "gthread"
threads = 4
timeout = 120
graceful_timeout = 30
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = "method=%(m)s status=%(s)s duration_ms=%(M)s"
capture_output = True
