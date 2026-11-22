import { AboutSection } from './settings/AboutSection';
import { AiSection } from './settings/AiSection';
import { DataSection } from './settings/DataSection';
import { InterfaceSection } from './settings/InterfaceSection';
import { ProfileSection } from './settings/ProfileSection';
import { Rule } from '@/ui/components/Panel';

/** Design §7.5: one page, sections separated by hairlines. */
export function SettingsScreen() {
  return (
    <div className="max-w-[1120px] px-12 py-8">
      <div className="flex flex-col gap-8">
        <ProfileSection />
        <Rule />
        <InterfaceSection />
        <Rule />
        <AiSection />
        <Rule />
        <DataSection />
        <Rule />
        <AboutSection />
      </div>
    </div>
  );
}
