import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      offset={{ bottom: '1rem', right: '1rem' }}
      visibleToasts={4}
      closeButton
      icons={{
        success: (
          <CircleCheckIcon className="size-4 shrink-0 text-toast-success" />
        ),
        info: <InfoIcon className="size-4 shrink-0" />,
        warning: (
          <TriangleAlertIcon className="size-4 shrink-0 text-toast-warning" />
        ),
        error: <OctagonXIcon className="size-4 shrink-0 text-toast-error" />,
        loading: <Loader2Icon className="size-4 shrink-0 animate-spin" />,
      }}
      toastOptions={{
        duration: Number.POSITIVE_INFINITY,
        classNames: {
          toast: 'toast-dark',
          title: 'toast-dark-title',
          description: 'toast-dark-description',
          actionButton: 'toast-dark-action',
          cancelButton: 'toast-dark-cancel',
          closeButton: 'toast-dark-close',
        },
      }}
      style={
        {
          '--width': 'fit-content',
          '--normal-bg': '#0a0a0a',
          '--normal-text': '#fafafa',
          '--normal-border': '#262626',
          '--success-bg': '#0a0a0a',
          '--success-text': '#fafafa',
          '--success-border': '#22c55e',
          '--error-bg': '#0a0a0a',
          '--error-text': '#fafafa',
          '--error-border': '#ef4444',
          '--border-radius': '6px',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
