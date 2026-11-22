use keyring::Entry;
use tauri_plugin_sql::{Migration, MigrationKind};

const KEYCHAIN_SERVICE: &str = "com.uniworld.app";

fn entry(account: &str) -> Result<Entry, String> {
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
