from __future__ import annotations

import os

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from kb.permissions import ROLE_EDITOR, ROLE_REVIEWER


class Command(BaseCommand):
    help = "Create demo users/groups for local development."

    def handle(self, *args, **options):
        default_password = os.environ.get("DEMO_USERS_PASSWORD", "Password123!")
        rpa_agent_password = os.environ.get("RPA_AGENT_PASSWORD", default_password)

        editor_group, _ = Group.objects.get_or_create(name=ROLE_EDITOR)
        reviewer_group, _ = Group.objects.get_or_create(name=ROLE_REVIEWER)

        editor_user, created = User.objects.get_or_create(username="editor1")
        if created:
            editor_user.set_password(default_password)
        editor_user.save()
        editor_user.groups.add(editor_group)

        reviewer_user, created = User.objects.get_or_create(username="reviewer1")
        if created:
            reviewer_user.set_password(default_password)
        reviewer_user.save()
        reviewer_user.groups.add(reviewer_group)

        rpa_user, created = User.objects.get_or_create(username="rpa_agent")
        if created:
            rpa_user.set_password(rpa_agent_password)
        # Ensure the RPA agent can access admin-only endpoints if needed.
        rpa_user.is_staff = True
        rpa_user.is_superuser = True
        rpa_user.save()

        self.stdout.write(
            self.style.SUCCESS(
                "Created/updated demo users: editor1, reviewer1, rpa_agent (superuser)"
            )
        )
        self.stdout.write(f"Password for editor1/reviewer1: {default_password}")
        self.stdout.write(f"Password for rpa_agent: {rpa_agent_password}")
