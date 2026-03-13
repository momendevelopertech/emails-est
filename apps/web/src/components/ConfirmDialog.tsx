'use client';

type ConfirmDialogProps = {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    confirmDisabled?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    confirmDisabled,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="card w-full max-w-md p-6">
                {title && <h3 className="text-lg font-semibold">{title}</h3>}
                <p className={`text-sm text-ink/70 ${title ? 'mt-2' : ''}`}>{message}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button className="btn-outline" onClick={onCancel}>{cancelLabel}</button>
                    <button className="btn-primary" onClick={onConfirm} disabled={confirmDisabled}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
