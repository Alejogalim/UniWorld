import { AboutSection } from './settings/AboutSection';
import { AiSection } from './settings/AiSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { DataSection } from './settings/DataSection';
import { ProfileSection } from './settings/ProfileSection';

/** Design §7.5 / plan 31: one centred 640px column of grouped lists. */
export function SettingsScreen() {
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 pt-2 pb-12">
      <div className="flex flex-col gap-8">
        <ProfileSection />
        <AppearanceSection />
        <AiSection />
        <DataSection />
        <AboutSection />
      </div>
    </div>
  );
}
