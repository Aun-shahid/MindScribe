import os
import subprocess
import sys
from urllib.parse import urlparse

# Configuration
SOURCE_ENV_FILE = ".env"
# This is the "admin" connection to the destination Postgres cluster
DESTINATION_ADMIN_URL = "postgresql://postgres:GMhPmvIVKLZUREDGCu7r@92.5.150.28:5432/postgres"
# The name of the database we want to create and migrate to
TARGET_DB_NAME = "mindscribe" 

PG_BIN_DIR = r"C:\Program Files\PostgreSQL\18\bin"
TEMP_DUMP_FILE = "db_dump.sql"

def get_source_url():
    if not os.path.exists(SOURCE_ENV_FILE):
        print(f"Error: {SOURCE_ENV_FILE} not found.")
        sys.exit(1)
    
    with open(SOURCE_ENV_FILE, "r") as f:
        for line in f:
            if line.startswith("DATABASE_URL="):
                return line.strip().split("=", 1)[1]
    
    print(f"Error: DATABASE_URL not found in {SOURCE_ENV_FILE}.")
    sys.exit(1)

def parse_url(url):
    result = urlparse(url)
    return {
        "user": result.username,
        "password": result.password,
        "host": result.hostname,
        "port": result.port,
        "dbname": result.path.lstrip("/")
    }

def run_command(command, password, description, exit_on_error=True):
    print(f"Running: {description}...")
    env = os.environ.copy()
    env["PGPASSWORD"] = password
    
    try:
        # We use subprocess.run with the list of arguments.
        # capture_output=True allows us to see errors if they occur.
        result = subprocess.run(command, env=env, check=True, capture_output=True, text=True)
        print(f"Successfully completed: {description}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        if exit_on_error:
            print(f"Error during {description}:")
            print(e.stderr)
            sys.exit(1)
        else:
            return e.stderr

def main():
    source_url = get_source_url()
    source_config = parse_url(source_url)
    dest_admin_config = parse_url(DESTINATION_ADMIN_URL)

    pg_dump_path = os.path.join(PG_BIN_DIR, "pg_dump.exe")
    psql_path = os.path.join(PG_BIN_DIR, "psql.exe")
    pg_restore_path = os.path.join(PG_BIN_DIR, "pg_restore.exe")

    if not os.path.exists(pg_dump_path):
        print(f"Error: pg_dump.exe not found at {pg_dump_path}")
        sys.exit(1)

    # 1. Dump source database
    dump_cmd = [
        pg_dump_path,
        "-h", str(source_config["host"]),
        "-p", str(source_config["port"]),
        "-U", str(source_config["user"]),
        "-F", "c",  # Custom format (compressed)
        "-f", TEMP_DUMP_FILE,
        str(source_config["dbname"])
    ]
    run_command(dump_cmd, source_config["password"], "Dumping source database")

    # 2. Create the target database on the destination cluster
    # We connect to the 'postgres' database to create the new one
    print(f"Ensuring database '{TARGET_DB_NAME}' exists on destination...")
    create_db_cmd = [
        psql_path,
        "-h", str(dest_admin_config["host"]),
        "-p", str(dest_admin_config["port"]),
        "-U", str(dest_admin_config["user"]),
        "-d", "postgres", 
        "-c", f"CREATE DATABASE {TARGET_DB_NAME};"
    ]
    # We don't want to exit if the DB already exists
    error_msg = run_command(create_db_cmd, dest_admin_config["password"], f"Creating database '{TARGET_DB_NAME}'", exit_on_error=False)
    if error_msg and "already exists" in str(error_msg).lower():
        print(f"Database '{TARGET_DB_NAME}' already exists, proceeding with restore.")

    # 3. Restore to destination database
    restore_cmd = [
        pg_restore_path,
        "-h", str(dest_admin_config["host"]),
        "-p", str(dest_admin_config["port"]),
        "-U", str(dest_admin_config["user"]),
        "-d", TARGET_DB_NAME,
        "--clean",  # Drop existing objects before creating
        "--if-exists",
        "--no-owner", # Don't try to set ownership
        "--no-privileges", # Don't try to set privileges
        TEMP_DUMP_FILE
    ]
    
    run_command(restore_cmd, dest_admin_config["password"], f"Restoring data to '{TARGET_DB_NAME}'")

    # 4. Clean up
    if os.path.exists(TEMP_DUMP_FILE):
        os.remove(TEMP_DUMP_FILE)
        print(f"Cleaned up temporary file: {TEMP_DUMP_FILE}")

    print(f"\nMigration to '{TARGET_DB_NAME}' completed successfully!")


if __name__ == "__main__":
    main()
