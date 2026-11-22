import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/components/ui/button';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Panel } from '@/ui/components/Panel';

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
  message: string;
}

/** Catches a crash on one screen and shows a designed panel instead of a blank window. */
export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, message: '' };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { failed: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Screen crashed', error, info.componentStack);
  }

  render() {
    if (this.state.failed) return <ErrorFallback message={this.state.message} />;
    return this.props.children;
  }
}

function ErrorFallback({ message }: { message: string }) {
  const { t } = useTranslation('common');
  return (
    <div className="max-w-[1120px] px-12 py-8">
      <Panel className="max-w-[640px]">
        <ErrorNote
          title={t('error.screenTitle')}
          message={message}
          action={
            <Button variant="secondary" size="md" onClick={() => location.reload()}>
              {t('error.reload')}
            </Button>
          }
        />
      </Panel>
    </div>
  );
}
