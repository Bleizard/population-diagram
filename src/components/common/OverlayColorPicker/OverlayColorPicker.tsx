import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../../i18n';
import styles from './OverlayColorPicker.module.css';

const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#fb7185', // rose
  '#f97316', // orange
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#22c55e', // green
  '#eab308', // yellow
  '#ef4444', // red
  '#06b6d4', // cyan
  '#d946ef', // fuchsia
];

interface ColorButtonProps {
  color: string;
  label: string;
  onChange: (color: string) => void;
}

function ColorButton({ color, label, onChange }: ColorButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className={styles.colorButtonWrapper} ref={ref}>
      <button
        type="button"
        className={styles.colorButton}
        onClick={() => setOpen(!open)}
        title={label}
      >
        <span className={styles.colorSwatch} style={{ backgroundColor: color }} />
        <span className={styles.colorLabel}>{label}</span>
      </button>
      {open && (
        <div className={styles.palette}>
          {COLOR_PRESETS.map(preset => (
            <button
              key={preset}
              type="button"
              className={`${styles.presetButton} ${preset === color ? styles.presetActive : ''}`}
              style={{ backgroundColor: preset }}
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
              title={preset}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OverlayColorPickerProps {
  leftMaleColor: string;
  leftFemaleColor: string;
  rightMaleColor: string;
  rightFemaleColor: string;
  leftName: string;
  rightName: string;
  onChangeLeftMale: (color: string) => void;
  onChangeLeftFemale: (color: string) => void;
  onChangeRightMale: (color: string) => void;
  onChangeRightFemale: (color: string) => void;
}

export function OverlayColorPicker({
  leftMaleColor,
  leftFemaleColor,
  rightMaleColor,
  rightFemaleColor,
  leftName,
  rightName,
  onChangeLeftMale,
  onChangeLeftFemale,
  onChangeRightMale,
  onChangeRightFemale,
}: OverlayColorPickerProps) {
  const { t } = useI18n();

  return (
    <div className={styles.container}>
      <div className={styles.group}>
        <span className={styles.groupLabel}>{leftName}</span>
        <div className={styles.colorRow}>
          <ColorButton color={leftMaleColor} label={t.common.males} onChange={onChangeLeftMale} />
          <ColorButton color={leftFemaleColor} label={t.common.females} onChange={onChangeLeftFemale} />
        </div>
      </div>
      <div className={styles.group}>
        <span className={styles.groupLabel}>{rightName}</span>
        <div className={styles.colorRow}>
          <ColorButton color={rightMaleColor} label={t.common.males} onChange={onChangeRightMale} />
          <ColorButton color={rightFemaleColor} label={t.common.females} onChange={onChangeRightFemale} />
        </div>
      </div>
    </div>
  );
}
