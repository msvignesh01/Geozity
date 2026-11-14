"""Public server settings; one process preserves the shared provider request gate."""

import os

bind = "0.0.0.0:" + os.environ.get("PORT", "10000")
workers = 1
worker_class = "gthread"
# Four searches may be active; leave threads available for health and website requests.
threads = 8
timeout = 120
graceful_timeout = 30
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = "method=%(m)s status=%(s)s duration_ms=%(M)s"
capture_output = True
