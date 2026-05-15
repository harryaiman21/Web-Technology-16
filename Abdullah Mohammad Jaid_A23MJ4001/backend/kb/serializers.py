from __future__ import annotations

from django.contrib.auth import authenticate
from rest_framework import serializers

from kb.models import ArticleRevision, Attachment, IngestionRecord, KnowledgeArticle


class UserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    creator = UserSummarySerializer(read_only=True)

    class Meta:
        model = KnowledgeArticle
        fields = [
            "id",
            "title",
            "summary",
            "steps",
            "tags",
            "status",
            "creator",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "creator", "created_at", "updated_at"]


class ArticleRevisionSerializer(serializers.ModelSerializer):
    changed_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = ArticleRevision
        fields = [
            "id",
            "article",
            "title",
            "summary",
            "steps",
            "tags",
            "status",
            "changed_by",
            "change_note",
            "changed_at",
        ]
        read_only_fields = fields


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSummarySerializer(read_only=True)
    file_url = serializers.FileField(source="file", read_only=True)

    class Meta:
        model = Attachment
        fields = [
            "id",
            "article",
            "revision",
            "original_name",
            "content_type",
            "file_url",
            "uploaded_by",
            "uploaded_at",
        ]
        read_only_fields = [
            "id",
            "original_name",
            "content_type",
            "file_url",
            "uploaded_by",
            "uploaded_at",
        ]


class AttachmentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "article", "revision", "file"]
        read_only_fields = ["id"]

    def validate_file(self, value):
        allowed = {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "image/png",
            "image/jpeg",
            "image/jpg",
        }
        content_type = getattr(value, "content_type", "")
        if content_type and content_type not in allowed:
            raise serializers.ValidationError("Unsupported file type.")

        max_bytes = 10 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError("File too large (max 10MB).")
        return value


class IngestionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngestionRecord
        fields = ["id", "sha256", "source_type", "source_name", "created_at"]
        read_only_fields = ["id", "created_at"]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs.get("username"), password=attrs.get("password"))
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        attrs["user"] = user
        return attrs
