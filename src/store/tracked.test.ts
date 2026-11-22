import { beforeEach, describe, expect, it, mock } from 'bun:test';

/** A write that waits until the test rejects it, so concurrent local changes can happen first. */
let pendingWrite: { reject: (err: Error) => void } | null = null;

mock.module('@/db/client', () => ({
  getDb: async () => ({
    select: async () => [],
    execute: () =>
      new Promise((_resolve, reject) => {
        pendingWrite = { reject };
      }),
  }),
}));

const { useTracked } = await import('./tracked');

async function writeStarted(): Promise<{ reject: (err: Error) => void }> {
  while (!pendingWrite) await new Promise((resolve) => setTimeout(resolve, 0));
  return pendingWrite;
}

function row(id: number, notes = '') {
  return {
    id,
    rorId: `https://ror.org/00000000${id}`,
    name: `Uni ${id}`,
    city: null,
    countryCode: 'ES',
    programName: 'BSc Law',
    detailProgram: null,
    status: 'considering' as const,
    deadline: null,
    requiredExams: [],
    language: null,
    notes,
    addedAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

describe('tracked store rollback', () => {
  beforeEach(() => {
    pendingWrite = null;
    useTracked.setState({ items: [row(1), row(2), row(3)], loaded: true });
  });

  it('restores only the failed row when an update is rejected', async () => {
    const pending = useTracked.getState().update(2, { notes: 'mine' });
    const write = await writeStarted();
    // Another row changes while the write is still pending.
    useTracked.setState((s) => ({ items: s.items.map((i) => (i.id === 3 ? { ...i, notes: 'theirs' } : i)) }));
    write.reject(new Error('disk full'));

    await expect(pending).rejects.toThrow('disk full');
    const items = useTracked.getState().items;
    expect(items.find((i) => i.id === 2)?.notes).toBe('');
    expect(items.find((i) => i.id === 3)?.notes).toBe('theirs');
  });

  it('puts a removed row back at its old position when the delete is rejected', async () => {
    const pending = useTracked.getState().remove(2);
    expect(useTracked.getState().items.map((i) => i.id)).toEqual([1, 3]);
    const write = await writeStarted();
    // A row added meanwhile must survive the rollback.
    useTracked.setState((s) => ({ items: [...s.items, row(4)] }));
    write.reject(new Error('locked'));

    await expect(pending).rejects.toThrow('locked');
    expect(useTracked.getState().items.map((i) => i.id)).toEqual([1, 2, 3, 4]);
  });
});
