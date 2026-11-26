import { useState } from 'react';

interface ExternalGameAssetProps {
  hexCode: string;
  alt: string;
  className?: string;
  fallbackEmoji?: string;
}

/**
 * Loads free open-source vector sprites from the OpenMoji CDN database
 * with an automatic clean fallback so images never appear broken.
 */
export function ExternalGameAsset({
  hexCode,
  alt,
  className = 'w-8 h-8',
  fallbackEmoji = '🐻',
}: ExternalGameAssetProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`inline-flex items-center justify-center select-none ${className}`}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={`https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/${hexCode}.svg`}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-contain select-none pointer-events-none ${className}`}
      loading="lazy"
    />
  );
}
