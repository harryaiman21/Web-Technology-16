from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth.models import Group
from rest_framework.permissions import BasePermission, SAFE_METHODS


ROLE_EDITOR = "editor"
ROLE_REVIEWER = "reviewer"
ROLE_ADMIN = "admin"


@dataclass(frozen=True)
class Roles:
    is_editor: bool
    is_reviewer: bool
    is_admin: bool


def get_roles(user) -> Roles:
    if not user or not user.is_authenticated:
        return Roles(is_editor=False, is_reviewer=False, is_admin=False)

    if user.is_superuser or user.is_staff:
        return Roles(is_editor=True, is_reviewer=True, is_admin=True)

    group_names = set(user.groups.values_list("name", flat=True))
    return Roles(
        is_editor=ROLE_EDITOR in group_names,
        is_reviewer=ROLE_REVIEWER in group_names,
        is_admin=ROLE_ADMIN in group_names,
    )


def ensure_default_groups_exist() -> None:
    for name in (ROLE_EDITOR, ROLE_REVIEWER, ROLE_ADMIN):
        Group.objects.get_or_create(name=name)


class IsEditorReviewerAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        roles = get_roles(request.user)
        return roles.is_editor or roles.is_reviewer or roles.is_admin


class IsReviewerOrAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        roles = get_roles(request.user)
        return roles.is_reviewer or roles.is_admin
