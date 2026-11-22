import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCore } from '@/app/useCore';
import { DEFAULT_MODEL } from '@/core';
import type { Provider } from '@/core/contracts';
import { deleteSetting, getSetting, setSetting } from '@/store/settings';
import { deleteSecret, getSecret, setSecret } from '@/store/secrets';
import { Badge } from '@/ui/components/Chip';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Field } from '@/ui/components/Field';
import { Input, Select } from '@/ui/components/Input';
import { Button } from '@/ui/components/ui/button';
import { messageOf, SettingsSection } from './SettingsSection';

type Presence = Record<Provider, boolean | null>;

/** The result of the last action on one key. Keys themselves are never shown. */
type Note = { tone: 'saved' } | { tone: 'ok' } | { tone: 'fail'; title?: string; text: string };

interface KeyBlockProps {
  provider: Provider;
  present: boolean | null;
  primary: boolean;
  title: string;
  badge?: string;
  hint: string;
  removeConfirm: string;
  onChanged: () => Promise<void>;
  onRemoved: () => Promise<void>;
}

/**
 * One provider's key: status, replace, test and remove. The key is only ever written to the
 * OS keychain (via `@/store/secrets`); the field is cleared as soon as it is saved.
 */
function KeyBlock({ provider, present, primary, title, badge, hint, removeConfirm, onChanged, onRemoved }: KeyBlockProps) {
  const { t } = useTranslation('settings');
  const core = useCore();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | 'remove' | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [confirming, setConfirming] = useState(false);
  const idle = busy === null;

  const save = async () => {
    const key = value.trim();
    if (!key) return;
    setBusy('save');
    setNote(null);
    try {
      await setSecret(provider, key);
      setValue('');
      await onChanged();
      setNote({ tone: 'saved' });
    } catch (err) {
      setNote({ tone: 'fail', text: t('ai.saveFailed', { error: messageOf(err) }) });
    } finally {
      setBusy(null);
    }
  };

  // Tests the key already in the keychain, not whatever is typed in the field.
  const test = async () => {
    setBusy('test');
    setNote(null);
    try {
      const result = await core.testConnection(provider);
      setNote(result.ok ? { tone: 'ok' } : { tone: 'fail', title: t('ai.testFailed'), text: result.error?.trim() || t('ai.noDetail') });
    } catch (err) {
      setNote({ tone: 'fail', title: t('ai.testFailed'), text: messageOf(err) });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    setNote(null);
    try {
      await deleteSecret(provider);
      setConfirming(false);
      await onRemoved();
    } catch (err) {
      setNote({ tone: 'fail', text: messageOf(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-hairline pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">{title}</h3>
        {badge && <Badge>{badge}</Badge>}
      </div>
      <p className="max-w-[68ch] text-sm text-chart-grey">{hint}</p>
      <p className={present ? 'text-sm text-evidence' : 'text-sm text-chart-grey'}>
        {present === null ? '' : present ? t('ai.saved') : t('ai.missing')}
      </p>

      <Field label={t('ai.keyInput')}>
        {(c) => (
          <Input
            {...c}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            placeholder={t('ai.keyPlaceholder')}
            onChange={(e) => setValue(e.target.value)}
            className="max-w-md font-mono"
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={primary ? 'primary' : 'secondary'} disabled={!idle || value.trim() === ''} onClick={() => void save()}>
          {busy === 'save' ? t('ai.keySaving') : t('ai.saveKey')}
        </Button>
        <Button variant="secondary" disabled={!idle || present !== true} onClick={() => void test()}>
          {busy === 'test' ? t('ai.testing') : t('ai.testConnection')}
        </Button>
        {present === true && !confirming && (
          <Button variant="quiet" disabled={!idle} onClick={() => setConfirming(true)}>
            {t('ai.removeKey')}
          </Button>
        )}
      </div>

      {confirming && (
        <div className="flex flex-col gap-3 border-l-2 border-hairline pl-4">
          <p className="text-sm text-foreground">{removeConfirm}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!idle} onClick={() => void remove()}>
              {t('ai.removeYes')}
            </Button>
            <Button variant="quiet" disabled={!idle} onClick={() => setConfirming(false)}>
              {t('ai.cancel')}
            </Button>
          </div>
        </div>
      )}

      {note?.tone === 'saved' && <p className="text-sm text-chart-grey">{t('ai.keySaved')}</p>}
      {note?.tone === 'ok' && <p className="text-sm text-evidence">{t('ai.connected')}</p>}
      {note?.tone === 'fail' && <ErrorNote title={note.title} message={note.text} />}
    </div>
  );
}

/** Both provider keys, the model ID and which provider the counselor uses. */
export function AiSection() {
  const { t } = useTranslation('settings');
  const [present, setPresent] = useState<Presence>({ openrouter: null, opencode: null });
  const [provider, setProvider] = useState<Provider>('openrouter');
  const [model, setModel] = useState('');
  const [savedModel, setSavedModel] = useState('');
  const [modelBusy, setModelBusy] = useState(false);
  const [modelNote, setModelNote] = useState<{ tone: 'saved' } | { tone: 'fail'; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Presence only: the key values never leave the keychain for display.
  const refreshPresence = useCallback(async () => {
    const [openrouter, opencode] = await Promise.all([getSecret('openrouter'), getSecret('opencode')]);
    setPresent({ openrouter: Boolean(openrouter?.trim()), opencode: Boolean(opencode?.trim()) });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([refreshPresence(), getSetting('default_provider'), getSetting('model')])
      .then(([, defaultProvider, savedModelValue]) => {
        if (cancelled) return;
        setProvider(defaultProvider === 'opencode' ? 'opencode' : 'openrouter');
        setModel(savedModelValue ?? '');
        setSavedModel(savedModelValue ?? '');
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(messageOf(err));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshPresence]);

  const chooseProvider = async (next: Provider) => {
    setProvider(next);
    setLoadError(null);
    try {
      await setSetting('default_provider', next);
    } catch (err) {
      setLoadError(messageOf(err));
    }
  };

  const removeOpencode = async () => {
    await refreshPresence();
    // Without its key, OpenCode Go cannot be the counselor's provider.
    if (provider === 'opencode') await chooseProvider('openrouter');
  };

  const saveModel = async () => {
    const value = model.trim();
    setModelBusy(true);
    setModelNote(null);
    try {
      if (value) await setSetting('model', value);
      else await deleteSetting('model');
      setModel(value);
      setSavedModel(value);
      setModelNote({ tone: 'saved' });
    } catch (err) {
      setModelNote({ tone: 'fail', text: t('ai.saveFailed', { error: messageOf(err) }) });
    } finally {
      setModelBusy(false);
    }
  };

  return (
    <SettingsSection id="settings-ai" title={t('sections.ai')} line={t('sections.aiLine')}>
      <div className="flex flex-col gap-8">
        <KeyBlock
          provider="openrouter"
          present={present.openrouter}
          primary
          title={t('ai.openrouter.title')}
          badge={t('ai.openrouter.badge')}
          hint={t('ai.openrouter.hint')}
          removeConfirm={t('ai.removeOpenrouterConfirm')}
          onChanged={refreshPresence}
          onRemoved={refreshPresence}
        />
        <KeyBlock
          provider="opencode"
          present={present.opencode}
          primary={false}
          title={t('ai.opencode.title')}
          badge={t('ai.opencode.badge')}
          hint={t('ai.opencode.hint')}
          removeConfirm={t('ai.removeOpencodeConfirm')}
          onChanged={refreshPresence}
          onRemoved={removeOpencode}
        />

        <div className="flex flex-col gap-5 border-t border-hairline pt-6">
          <div className="grid max-w-[640px] gap-5 sm:grid-cols-2">
            <Field label={t('ai.counselorProvider.label')}>
              {(c) => (
                <Select {...c} value={provider} onChange={(e) => void chooseProvider(e.target.value as Provider)}>
                  <option value="openrouter">{t('ai.counselorProvider.openrouter')}</option>
                  <option value="opencode" disabled={present.opencode !== true}>
                    {present.opencode === true ? t('ai.counselorProvider.opencode') : t('ai.counselorProvider.needsKey')}
                  </option>
                </Select>
              )}
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <Field label={t('ai.model.label')} hint={t('ai.model.hint', { model: DEFAULT_MODEL })}>
              {(c) => (
                <Input
                  {...c}
                  value={model}
                  placeholder={DEFAULT_MODEL}
                  spellCheck={false}
                  onChange={(e) => setModel(e.target.value)}
                  className="max-w-md font-mono"
                />
              )}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" disabled={modelBusy || model.trim() === savedModel} onClick={() => void saveModel()}>
                {t('ai.model.save')}
              </Button>
              {modelNote?.tone === 'saved' && <span className="text-sm text-chart-grey">{t('ai.model.saved')}</span>}
            </div>
            {modelNote?.tone === 'fail' && <ErrorNote message={modelNote.text} />}
          </div>
        </div>

        {loadError && <ErrorNote message={t('ai.loadFailed', { error: loadError })} />}
      </div>
    </SettingsSection>
  );
}
