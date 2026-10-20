import React, { useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Upload, Trash2, Camera, AlertCircle } from 'lucide-react';

interface ImageUploadCropProps {
  value?: string;
  name: string;
  onChange: (dataUrl: string) => void;
  onRemove?: () => void;
  size?: 'md' | 'lg' | 'xl';
  disabled?: boolean;
}

export const ImageUploadCrop: React.FC<ImageUploadCropProps> = ({
  value,
  name,
  onChange,
  onRemove,
  size = 'xl',
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');

    // Format check
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Please select a valid image (JPG, PNG, or WebP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Size check (2MB max)
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMsg('Image size must be less than 2 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Center crop to square and resize to 256x256
          const canvas = document.createElement('canvas');
          const targetSize = 256;
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            setErrorMsg('Canvas rendering failed.');
            setIsProcessing(false);
            return;
          }

          // Calculate center square crop coordinates
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          onChange(optimizedDataUrl);
        } catch {
          setErrorMsg('Failed to process image.');
        } finally {
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setErrorMsg('Could not read image file.');
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMsg('Error reading file.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = () => {
    setErrorMsg('');
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar name={name || 'User'} src={value} size={size} />
          {!disabled && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
              title="Change photo"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isProcessing}
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
              className="text-xs h-8"
            >
              {isProcessing ? 'Cropping...' : value ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={handleRemove}
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                className="text-xs h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-[11px] text-text-muted">
            Square cropped to 256×256. JPG, PNG or WebP under 2 MB.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
