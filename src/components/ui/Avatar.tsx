import React from 'react';
import { cn } from '@/lib/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'offline';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (str: string) => {
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  };

  const statusSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const statusColors = {
    online: 'bg-semantic-success',
    busy: 'bg-semantic-danger',
    offline: 'bg-text-subtle',
  };

  const palette = React.useMemo(() => {
    const palettes = [
      'bg-emerald-100 text-emerald-800 border-emerald-300',
      'bg-indigo-100 text-indigo-800 border-indigo-300',
      'bg-amber-100 text-amber-800 border-amber-300',
      'bg-teal-100 text-teal-800 border-teal-300',
      'bg-sky-100 text-sky-800 border-sky-300',
      'bg-purple-100 text-purple-800 border-purple-300',
      'bg-rose-100 text-rose-800 border-rose-300',
      'bg-blue-100 text-blue-800 border-blue-300',
    ];
    let hash = 0;
    const str = name || 'User';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palettes[Math.abs(hash) % palettes.length];
  }, [name]);

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)} {...props}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-bold border transition-colors',
          sizes[size],
          src && !imageError ? 'border-border bg-surface-subtle' : palette
        )}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(name || 'U')}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};
