'use client';

type SessionTimeoutModalProps = {
    open: boolean;
    message: string;
    continueLabel: string;
    logoutLabel: string;
    onContinue: () => void;
    onLogout: () => void;
};

export default function SessionTimeoutModal({
    open,
    message,
    continueLabel,
    logoutLabel,
    onContinue,
    onLogout,
}: SessionTimeoutModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="card w-full max-w-md p-6">
                <h3 className="text-lg font-semibold">{message}</h3>
                <div className="mt-5 flex justify-end gap-2">
                    <button className="btn-outline" onClick={onLogout}>{logoutLabel}</button>
                    <button className="btn-primary" onClick={onContinue}>{continueLabel}</button>
                </div>
            </div>
        </div>
    );
}
