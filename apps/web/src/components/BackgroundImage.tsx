import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function BackgroundImage() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/config')
      .then((res) => res.ok ? res.json() : null)
      .then((config) => {
        if (!cancelled && config?.backgroundUrl) {
          setUrl(config.backgroundUrl);
          document.body.classList.add('has-bg');
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!url) return null;

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        pointerEvents: 'none',
      }}
    />,
    document.body,
  );
}
