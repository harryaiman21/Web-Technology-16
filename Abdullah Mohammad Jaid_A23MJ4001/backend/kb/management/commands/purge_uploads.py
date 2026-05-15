from __future__ import annotations

from django.core.management.base import BaseCommand

from kb.models import ArticleRevision, Attachment, IngestionRecord, KnowledgeArticle


class Command(BaseCommand):
    help = "Delete all Upload Console data (articles, revisions, attachments + files) from the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Actually perform deletion (required).",
        )
        parser.add_argument(
            "--include-ingestions",
            action="store_true",
            help="Also delete ingestion records.",
        )

    def handle(self, *args, **options):
        force: bool = bool(options.get("force"))
        include_ingestions: bool = bool(options.get("include_ingestions"))

        attachment_count = Attachment.objects.count()
        article_count = KnowledgeArticle.objects.count()
        revision_count = ArticleRevision.objects.count()
        ingestion_count = IngestionRecord.objects.count() if include_ingestions else 0

        if not force:
            self.stdout.write(self.style.WARNING("Dry run — nothing deleted."))
            self.stdout.write(
                f"Would delete: {article_count} articles, {revision_count} revisions, {attachment_count} attachments"
                + (f", {ingestion_count} ingestions" if include_ingestions else "")
            )
            self.stdout.write("Re-run with --force to actually delete.")
            return

        deleted_files = 0
        file_errors = 0
        for a in Attachment.objects.all().iterator():
            try:
                if getattr(a, "file", None):
                    a.file.delete(save=False)
                    deleted_files += 1
            except Exception:
                file_errors += 1

        Attachment.objects.all().delete()
        KnowledgeArticle.objects.all().delete()  # cascades to revisions
        ArticleRevision.objects.all().delete()  # safety: clear any orphans

        if include_ingestions:
            IngestionRecord.objects.all().delete()

        self.stdout.write(self.style.SUCCESS("Upload Console data purged."))
        self.stdout.write(
            f"Deleted DB rows: ~{article_count} articles, ~{revision_count} revisions, ~{attachment_count} attachments"
            + (f", ~{ingestion_count} ingestions" if include_ingestions else "")
        )
        self.stdout.write(f"Deleted attachment files: {deleted_files} (file delete errors: {file_errors})")
