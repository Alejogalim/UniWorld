import { create } from 'zustand';
import { getSetting, setSetting } from '@/store/settings';

interface StarsState {
  /** Background starfield on or off. Default on; only drawn in the dark theme. */
  on: boolean;
  setOn(on: boolean): Promise<void>;
}

export const useStars = create<StarsState>((set) => ({
  on: true,

  async setOn(on) {
    set({ on });
    await setSetting('stars', on ? 'on' : 'off');
  },
}));

/** Loads the saved choice in the background. Anything but an explicit 'off' keeps the default. */
export function initStars(): void {
  getSetting('stars')
    .then((saved) => {
      if (saved === 'off') useStars.setState({ on: false });
    })
    .catch((err: unknown) => {
      console.error('Failed to load the stars setting', err);
    });
}
