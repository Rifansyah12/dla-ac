import { databasePool } from "./database";

// MySQL DDL commits implicitly. Each statement is safe to retry if a migration is interrupted.
const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS ac_schema_migrations (
    version VARCHAR(40) NOT NULL PRIMARY KEY,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_users (
    id VARCHAR(80) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    display_name VARCHAR(120) NOT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    session_version INT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_admin_permissions (
    user_id VARCHAR(80) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    can_change_price TINYINT(1) NOT NULL DEFAULT 1,
    can_delete_lot TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES ac_users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_owner_bootstrap (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    initialized TINYINT(1) NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_recovery_emails (
    user_id VARCHAR(80) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES ac_users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_password_resets (
    user_id VARCHAR(80) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    request_id VARCHAR(36) COLLATE utf8mb4_bin NOT NULL,
    code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    requested_at DATETIME(3) NOT NULL,
    window_started_at DATETIME(3) NOT NULL,
    request_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES ac_users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_catalog_state (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    initialized TINYINT(1) NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_lots (
    id VARCHAR(80) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(120) NOT NULL,
    brand VARCHAR(80) NOT NULL,
    kind VARCHAR(40) NOT NULL,
    capacity VARCHAR(50) NOT NULL,
    quantity INT UNSIGNED NULL,
    composition VARCHAR(160) NOT NULL,
    unit_condition VARCHAR(160) NOT NULL,
    location VARCHAR(100) NOT NULL,
    price BIGINT UNSIGNED NULL,
    price_unit VARCHAR(4) NOT NULL,
    status VARCHAR(40) NOT NULL,
    description TEXT NOT NULL,
    is_example TINYINT(1) NOT NULL,
    sort_order BIGINT NOT NULL,
    INDEX ac_lots_sort_order (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_lot_photos (
    lot_id VARCHAR(80) COLLATE utf8mb4_bin NOT NULL,
    photo_order INT UNSIGNED NOT NULL,
    photo_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (lot_id, photo_order),
    FOREIGN KEY (lot_id) REFERENCES ac_lots(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_site_settings (
    setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ac_audit_events (
    id VARCHAR(36) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    actor_id VARCHAR(80) COLLATE utf8mb4_bin NOT NULL,
    actor_name VARCHAR(120) NOT NULL,
    actor_username VARCHAR(80) NOT NULL,
    action VARCHAR(40) NOT NULL,
    target_type VARCHAR(40) NOT NULL,
    target_id VARCHAR(80) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    INDEX ac_audit_occurred (occurred_at, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export async function migrateDatabase(): Promise<void> {
  const connection = await databasePool().getConnection();
  try {
    for (const statement of schemaStatements) await connection.query(statement);
    await connection.execute("INSERT IGNORE INTO ac_catalog_state (id, initialized) VALUES (1, 0)");
    await connection.execute("INSERT IGNORE INTO ac_owner_bootstrap (id, initialized) VALUES (1, 0)");
    await connection.execute("INSERT IGNORE INTO ac_schema_migrations (version) VALUES (?)", ["001_initial"]);
    await connection.execute("INSERT IGNORE INTO ac_schema_migrations (version) VALUES (?)", ["002_owner_bootstrap"]);
    await connection.execute("INSERT IGNORE INTO ac_schema_migrations (version) VALUES (?)", ["003_audit_events"]);
    await connection.execute("INSERT IGNORE INTO ac_schema_migrations (version) VALUES (?)", ["004_password_recovery"]);
  } finally {
    connection.release();
  }
}
