type RecipientExcelFormState = {
    room_est1: string;
    name: string;
    email: string;
    role: string;
    type: string;
    governorate: string;
    address: string;
    building: string;
    location: string;
    sheet: 'EST1' | 'EST2' | '';
};

type RecipientFormErrors = Partial<Record<keyof RecipientExcelFormState, string>>;

type RecipientFormModalProps = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    form: RecipientExcelFormState;
    errors: RecipientFormErrors;
    isSaving: boolean;
    copy: {
        cancelEdit: string;
        createRecipientTitle: string;
        editRecipientTitle: string;
        recipientFormHint: string;
        saveRecipient: string;
    };
    onChange: <K extends keyof RecipientExcelFormState>(key: K, value: RecipientExcelFormState[K]) => void;
    onClose: () => void;
    onSubmit: () => void;
};

const fieldLabelMap = {
    room_est1: 'ROOM',
    name: 'name',
    email: 'Email',
    role: 'Role',
    type: 'Type',
    governorate: 'Governorate',
    address: 'Address',
    building: 'Building',
    location: 'Location',
    sheet: 'Sheet',
} as const;

export default function RecipientFormModal({
    isOpen,
    mode,
    form,
    errors,
    copy,
    isSaving,
    onChange,
    onClose,
    onSubmit,
}: RecipientFormModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-6">
            <button
                type="button"
                className="overlay-backdrop absolute inset-0"
                aria-label={copy.cancelEdit}
                onClick={onClose}
            />
            <div className="modal-shell relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] p-5 md:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-950">
                            {mode === 'edit' ? copy.editRecipientTitle : copy.createRecipientTitle}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{copy.recipientFormHint}</p>
                    </div>
                    <button type="button" className="btn-outline" onClick={onClose}>
                        {copy.cancelEdit}
                    </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {(['room_est1', 'name', 'email', 'role', 'type', 'governorate', 'building', 'location'] as const).map((field) => (
                        <div key={field}>
                            <input
                                value={form[field]}
                                onChange={(event) => onChange(field, event.target.value)}
                                className={`input w-full ${errors[field] ? 'border-rose-300 focus:border-rose-400' : ''}`}
                                placeholder={fieldLabelMap[field]}
                            />
                            {errors[field] && <p className="mt-1 text-xs text-rose-600">{errors[field]}</p>}
                        </div>
                    ))}
                    <div>
                        <select
                            value={form.sheet}
                            onChange={(event) => onChange('sheet', event.target.value as RecipientExcelFormState['sheet'])}
                            className={`input w-full ${errors.sheet ? 'border-rose-300 focus:border-rose-400' : ''}`}
                        >
                            <option value="">Sheet</option>
                            <option value="EST1">est1</option>
                            <option value="EST2">est2</option>
                        </select>
                        {errors.sheet && <p className="mt-1 text-xs text-rose-600">{errors.sheet}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <textarea
                            value={form.address}
                            onChange={(event) => onChange('address', event.target.value)}
                            className={`textarea w-full ${errors.address ? 'border-rose-300 focus:border-rose-400' : ''}`}
                            placeholder={fieldLabelMap.address}
                        />
                        {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={onSubmit}
                        disabled={isSaving}
                    >
                        {copy.saveRecipient}
                    </button>
                    <button type="button" className="btn-outline" onClick={onClose}>
                        {copy.cancelEdit}
                    </button>
                </div>
            </div>
        </div>
    );
}

export type { RecipientExcelFormState, RecipientFormErrors };
