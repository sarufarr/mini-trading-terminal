import { memo, ReactNode, useEffect } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = memo(function Layout({ children }: LayoutProps) {
  useEffect(() => {
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    document.body.style.fontFamily = '"Geist Mono", monospace';

    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  return <>{children}</>;
});
Layout.displayName = 'Layout';
