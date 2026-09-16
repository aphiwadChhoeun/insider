import { useEffect, useRef } from 'react';
import Electrify from './Electrify';

type Props = {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A yes/no sheet over the current screen. Cancel takes focus on open and
 * Escape cancels, so no stray keypress or double-tap can confirm by accident.
 */
export default function ConfirmSheet({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="sheet-layer">
      <div className="sheet-backdrop" data-testid="sheet-backdrop" onClick={onCancel} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="sheet-title">{title}</h2>
        {body && <p className="sheet-body">{body}</p>}
        <button type="button" className="button primary" onClick={onConfirm}>
          <Electrify />
          {confirmLabel}
        </button>
        <button type="button" className="button ghost" ref={cancelRef} onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
