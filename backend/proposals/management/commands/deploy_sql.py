from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import connection

SQL_DIR = Path(__file__).resolve().parent.parent.parent.parent / "sql"

DEPLOY_ORDER = [
    ("functions", "User-Defined Functions"),
    ("views", "Views"),
    ("stored_procedures", "Stored Procedures"),
    ("triggers", "Triggers"),
]


class Command(BaseCommand):
    help = "Deploy T-SQL objects (views, stored procedures, functions, triggers) to SQL Server"

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            for folder, label in DEPLOY_ORDER:
                sql_path = SQL_DIR / folder
                if not sql_path.exists():
                    continue
                sql_files = sorted(sql_path.glob("*.sql"))
                for sql_file in sql_files:
                    sql = sql_file.read_text()
                    try:
                        cursor.execute(sql)
                        self.stdout.write(f"  [{label}] {sql_file.name} — OK")
                    except Exception as e:
                        self.stderr.write(
                            self.style.ERROR(f"  [{label}] {sql_file.name} — FAILED: {e}")
                        )

        self.stdout.write(self.style.SUCCESS("T-SQL deployment complete."))
