class ServiceUnavailable(RuntimeError):
    """A provider failed; this must never be presented as a verified empty search."""
