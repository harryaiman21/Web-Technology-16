from django.apps import AppConfig


class KbConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'kb'

    def ready(self) -> None:
        # Register signals (no DB queries at import time).
        from kb import signals  # noqa: F401
