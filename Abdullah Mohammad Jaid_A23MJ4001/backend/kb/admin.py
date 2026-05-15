from django.contrib import admin

from kb.models import ArticleRevision, Attachment, IngestionRecord, KnowledgeArticle


@admin.register(KnowledgeArticle)
class KnowledgeArticleAdmin(admin.ModelAdmin):
	list_display = ("id", "title", "status", "creator", "updated_at")
	list_filter = ("status", "created_at", "updated_at")
	search_fields = ("title", "summary", "steps", "tags", "creator__username")


@admin.register(ArticleRevision)
class ArticleRevisionAdmin(admin.ModelAdmin):
	list_display = ("id", "article", "status", "changed_by", "changed_at")
	list_filter = ("status", "changed_at")
	search_fields = ("title", "summary", "steps", "tags")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
	list_display = ("id", "article", "original_name", "uploaded_by", "uploaded_at")
	list_filter = ("uploaded_at",)
	search_fields = ("original_name", "article__title", "uploaded_by__username")


@admin.register(IngestionRecord)
class IngestionRecordAdmin(admin.ModelAdmin):
	list_display = ("id", "sha256", "source_type", "source_name", "created_at")
	list_filter = ("created_at", "source_type")
	search_fields = ("sha256", "source_name")

# Register your models here.
