import FormSelect from '@/components/FormSelect';

type RecipientExcelFormState = {
    room_est1: string;
    division: string;
    name: string;
    arabic_name: string;
    email: string;
    phone: string;
    employer: string;
    kind_of_school: string;
    title: string;
    insurance_number: string;
    institution_tax_number: string;
    national_id_number: string;
    national_id_picture: string;
    personal_photo: string;
    preferred_proctoring_city: string;
    preferred_test_center: string;
    bank_account_name: string;
    bank_name: string;
    bank_branch_name: string;
    account_number: string;
    iban_number: string;
    role: string;
    type: string;
    governorate: string;
    address: string;
    building: string;
    location: string;
    bank_divid: string;
    additional_info_1: string;
    additional_info_2: string;
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

const fieldLabelMap: Record<keyof RecipientExcelFormState, string> = {
    room_est1: 'ROOM',
    division: 'Division',
    name: 'Full English name',
    arabic_name: 'Arabic name',
    email: 'Email',
    phone: 'Mobile number',
    employer: 'Employer',
    kind_of_school: 'Kind of school',
    title: 'Title',
    insurance_number: 'Insurance number',
    institution_tax_number: 'Institution tax number',
    national_id_number: 'National ID number',
    national_id_picture: 'National ID picture',
    personal_photo: 'Personal photo',
    preferred_proctoring_city: 'Preferred proctoring city',
    preferred_test_center: 'Preferred test center',
    bank_account_name: 'Bank account name',
    bank_name: 'Bank name',
    bank_branch_name: 'Branch name',
    account_number: 'Account number',
    iban_number: 'IBAN number',
    role: 'Role',
    type: 'Type',
    governorate: 'Governorate',
    address: 'Address',
    building: 'Building',
    location: 'Location',
    bank_divid: 'Bank divid',
    additional_info_1: 'Additional info 1',
    additional_info_2: 'Additional info 2',
    sheet: 'Sheet',
};

const sections: Array<{
    title: string;
    fields: Array<keyof RecipientExcelFormState>;
    columns?: 'two' | 'one';
}> = [
    {
        title: 'Basic details',
        fields: ['room_est1', 'division', 'name', 'arabic_name', 'email', 'phone', 'role', 'type', 'governorate', 'sheet'],
    },
    {
        title: 'Employer and venue',
        fields: ['employer', 'kind_of_school', 'title', 'preferred_proctoring_city', 'preferred_test_center', 'address', 'building', 'location'],
    },
    {
        title: 'Identity and files',
        fields: ['insurance_number', 'institution_tax_number', 'national_id_number', 'national_id_picture', 'personal_photo'],
    },
    {
        title: 'Bank details',
        fields: ['bank_account_name', 'bank_name', 'bank_branch_name', 'account_number', 'iban_number', 'bank_divid'],
    },
    {
        title: 'Additional notes',
        fields: ['additional_info_1', 'additional_info_2'],
        columns: 'one',
    },
];

const textAreaFields = new Set<keyof RecipientExcelFormState>([
    'address',
    'location',
    'additional_info_1',
    'additional_info_2',
]);

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
            <div className="modal-shell relative z-10 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] p-5 md:p-6">
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

                <div className="mt-6 space-y-5">
                    {sections.map((section) => (
                        <section key={section.title} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 md:p-5">
                            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{section.title}</h4>
                            <div className={`mt-4 grid gap-4 ${section.columns === 'one' ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                                {section.fields.map((field) => {
                                    if (field === 'sheet') {
                                        return (
                                            <div key={field}>
                                                <label className="mb-2 block text-sm font-medium text-slate-700">{fieldLabelMap.sheet}</label>
                                                <FormSelect
                                                    value={form.sheet}
                                                    onChange={(nextValue) => onChange('sheet', nextValue as RecipientExcelFormState['sheet'])}
                                                    placeholder={fieldLabelMap.sheet}
                                                    ariaLabel={fieldLabelMap.sheet}
                                                    invalid={Boolean(errors.sheet)}
                                                    options={[
                                                        { value: '', label: 'No selection' },
                                                        { value: 'EST1', label: 'EST1' },
                                                        { value: 'EST2', label: 'EST2' },
                                                    ]}
                                                />
                                                {errors.sheet ? <p className="mt-1 text-xs text-rose-600">{errors.sheet}</p> : null}
                                            </div>
                                        );
                                    }

                                    const label = fieldLabelMap[field];
                                    const isTextArea = textAreaFields.has(field);
                                    const fieldError = errors[field];

                                    return (
                                        <div key={field} className={isTextArea ? 'md:col-span-2 xl:col-span-3' : ''}>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
                                            {isTextArea ? (
                                                <textarea
                                                    value={form[field]}
                                                    rows={field === 'address' ? 3 : 4}
                                                    onChange={(event) => onChange(field, event.target.value)}
                                                    className={`textarea w-full ${fieldError ? 'border-rose-300 focus:border-rose-400' : ''}`}
                                                    placeholder={label}
                                                />
                                            ) : (
                                                <input
                                                    value={form[field]}
                                                    onChange={(event) => onChange(field, event.target.value)}
                                                    className={`input w-full ${fieldError ? 'border-rose-300 focus:border-rose-400' : ''}`}
                                                    placeholder={label}
                                                />
                                            )}
                                            {fieldError ? <p className="mt-1 text-xs text-rose-600">{fieldError}</p> : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
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
