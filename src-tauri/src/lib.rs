use keyring::Entry;
use tauri_plugin_sql::{Migration, MigrationKind};

const KEYCHAIN_SERVICE: &str = "com.uniworld.app";

/// The only keychain entries the app may touch. Anything else is refused, so a script in the
/// webview cannot read other entries under the same service.
fn is_allowed_account(account: &str) -> bool {
    matches!(account, "openrouter" | "opencode") || (cfg!(test) && account == "__uniworld_selftest__")
}

fn entry(account: &str) -> Result<Entry, String> {
    if !is_allowed_account(account) {
        return Err("Unknown key name.".into());
    }
    Entry::new(KEYCHAIN_SERVICE, account).map_err(|e| e.to_string())
}

/// Returns `Ok(None)` when no secret is stored for `account`.
#[tauri::command]
fn secret_get(account: String) -> Result<Option<String>, String> {
    match entry(&account)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn secret_set(account: String, value: String) -> Result<(), String> {
    entry(&account)?.set_password(&value).map_err(|e| e.to_string())
}

/// Missing entries are not an error.
#[tauri::command]
fn secret_delete(account: String) -> Result<(), String> {
    match entry(&account)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("../../src/db/migrations/001_init.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 2,
        description: "tracked_names",
        sql: include_str!("../../src/db/migrations/002_tracked_names.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 3,
        description: "tracked_detail_program",
        sql: include_str!("../../src/db/migrations/003_tracked_detail_program.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 4,
        description: "page_cache",
        sql: include_str!("../../src/db/migrations/004_page_cache.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 5,
        description: "page_cache_html",
        sql: include_str!("../../src/db/migrations/005_page_cache_html.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 6,
        description: "counselor_notes",
        sql: include_str!("../../src/db/migrations/006_counselor_notes.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:uniworld.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![secret_get, secret_set, secret_delete])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keychain_roundtrip() {
        let account = "__uniworld_selftest__";
        secret_delete(account.into()).unwrap();
        assert_eq!(secret_get(account.into()).unwrap(), None);
        secret_set(account.into(), "selftest-value".into()).unwrap();
        assert_eq!(
            secret_get(account.into()).unwrap(),
            Some("selftest-value".into())
        );
        secret_delete(account.into()).unwrap();
        assert_eq!(secret_get(account.into()).unwrap(), None);
    }
}
