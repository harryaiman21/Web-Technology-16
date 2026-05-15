from django.urls import include, path
from rest_framework.routers import DefaultRouter

from kb import views

router = DefaultRouter()
router.register(r"articles", views.KnowledgeArticleViewSet, basename="article")
router.register(r"attachments", views.AttachmentViewSet, basename="attachment")
router.register(r"ingestions", views.IngestionRecordViewSet, basename="ingestion")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("auth/me/", views.me_view, name="me"),
    path("duplicate-check/", views.duplicate_check_view, name="duplicate-check"),
]
