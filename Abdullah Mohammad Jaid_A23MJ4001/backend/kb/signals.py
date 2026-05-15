from __future__ import annotations

from django.db.models.signals import post_migrate
from django.dispatch import receiver

from kb.permissions import ensure_default_groups_exist


@receiver(post_migrate)
def create_default_groups(sender, **kwargs) -> None:
    # Runs after migrations; safe to touch auth_group table here.
    ensure_default_groups_exist()
