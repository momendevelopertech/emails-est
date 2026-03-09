'use client';

import { useMemo, useState } from 'react';
import api from '@/lib/api';
import { useTranslations } from 'next-intl';

type RequestType = 'leave' | 'absence' | 'personal' | 'mission';

type Props = {
    open: boolean;
    locale: 'en' | 'ar';
    date: Date | null;
    onClose: () => void;
    onSubmitted: () => void;
};

const missionTypeOptions = ['MORNING', 'DURING_DAY', 'EVENING', 'ALL_DAY'] as const;

export default function RequestModal({ open, date, onClose, onSubmitted }: Props) {
    const t = useTranslations('requests');
    const tm = useTranslations('requestModal');
    const [type, setType] = useState<RequestType | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);

    const dateValue = useMemo(() => (date ? date.toISOString().slice(0, 10) : ''), [date]);

    if (!open) return null;

    const update = (key: string, value: any) => setFormData((prev) => ({ ...prev, [key]: value }));

    const submit = async () => {
        if (!date || !type) return;
        setLoading(true);
        try {
            if (type === 'leave') {
                await api.post('/leaves', {
                    leaveType: formData.leaveType || 'ANNUAL',
                    startDate: formData.startDate || dateValue,
                    endDate: formData.endDate || dateValue,
                    reason: formData.reason || '',
                });
            }

            if (type === 'absence') {
                await api.post('/leaves', {
                    leaveType: 'ABSENCE_WITH_PERMISSION',
                    startDate: formData.startDate || dateValue,
                    endDate: formData.endDate || dateValue,
                    reason: formData.reason || '',
                });
            }

            if (type === 'personal') {
                await api.post('/permissions', {
                    permissionType: 'PERSONAL',
                    requestDate: dateValue,
                    arrivalTime: formData.arrivalTime,
                    leaveTime: formData.leaveTime,
                    reason: formData.reason || '',
                });
            }

            if (type === 'mission') {
                const missionType = formData.missionType || 'ALL_DAY';
                const missionTo = formData.missionTo || '';
                const missionPurpose = formData.missionPurpose || '';
                const payloadReason = `Mission Type: ${missionType}\nMission To: ${missionTo}\nPurpose: ${missionPurpose}`;

                await api.post('/leaves', {
                    leaveType: 'MISSION',
                    startDate: formData.startDate || dateValue,
                    endDate: formData.endDate || dateValue,
                    reason: payloadReason,
                });
            }

            onSubmitted();
            onClose();
            setType(null);
            setFormData({});
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="card w-full max-w-2xl p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{t('new')}</h2>
                    <button className="btn-outline" onClick={onClose}>{tm('close')}</button>
                </div>

                <p className="mt-3 text-sm text-ink/70">
                    {tm('selectedDate')}: <span className="font-semibold">{dateValue}</span>
                </p>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <button className={`btn-outline ${type === 'personal' ? 'bg-ink/10' : ''}`} onClick={() => setType('personal')}>
                        {tm('personalPermission')}
                    </button>
                    <button className={`btn-outline ${type === 'leave' ? 'bg-ink/10' : ''}`} onClick={() => setType('leave')}>
                        {tm('leaveRequest')}
                    </button>
                    <button className={`btn-outline ${type === 'absence' ? 'bg-ink/10' : ''}`} onClick={() => setType('absence')}>
                        {tm('absenceRequest')}
                    </button>
                    <button className={`btn-outline ${type === 'mission' ? 'bg-ink/10' : ''}`} onClick={() => setType('mission')}>
                        {tm('missionRequest')}
                    </button>
                </div>

                <div className="mt-5 space-y-4">
                    {type === 'leave' && (
                        <>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm">
                                    {tm('leaveType')}
                                    <select
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        value={formData.leaveType || 'ANNUAL'}
                                        onChange={(e) => update('leaveType', e.target.value)}
                                    >
                                        <option value="ANNUAL">{tm('leaveAnnual')}</option>
                                        <option value="CASUAL">{tm('leaveCasual')}</option>
                                    </select>
                                </label>
                                <label className="text-sm">
                                    {tm('startDate')}
                                    <input
                                        type="date"
                                        defaultValue={dateValue}
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        onChange={(e) => update('startDate', e.target.value)}
                                    />
                                </label>
                                <label className="text-sm">
                                    {tm('endDate')}
                                    <input
                                        type="date"
                                        defaultValue={dateValue}
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        onChange={(e) => update('endDate', e.target.value)}
                                    />
                                </label>
                            </div>
                            <label className="text-sm">
                                {tm('reason')}
                                <textarea
                                    rows={3}
                                    className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                    onChange={(e) => update('reason', e.target.value)}
                                />
                            </label>
                        </>
                    )}

                    {type === 'absence' && (
                        <>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm">
                                    {tm('startDate')}
                                    <input
                                        type="date"
                                        defaultValue={dateValue}
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        onChange={(e) => update('startDate', e.target.value)}
                                    />
                                </label>
                                <label className="text-sm">
                                    {tm('endDate')}
                                    <input
                                        type="date"
                                        defaultValue={dateValue}
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        onChange={(e) => update('endDate', e.target.value)}
                                    />
                                </label>
                            </div>
                            <label className="text-sm">
                                {tm('reason')}
                                <textarea
                                    rows={3}
                                    className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                    onChange={(e) => update('reason', e.target.value)}
                                />
                            </label>
                        </>
                    )}

                    {type === 'personal' && (
                        <>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm">
                                    {tm('arrivalTime')}
                                    <input
                                        type="time"
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        onChange={(e) => update('arrivalTime', e.target.value)}
                                    />
                                </label>
                                <label className="text-sm">
                                    {tm('leaveTime')}
                                    <input
                                        type="time"
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        onChange={(e) => update('leaveTime', e.target.value)}
                                    />
                                </label>
                            </div>
                            <label className="text-sm">
                                {tm('reason')}
                                <textarea
                                    rows={3}
                                    className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                    onChange={(e) => update('reason', e.target.value)}
                                />
                            </label>
                        </>
                    )}

                    {type === 'mission' && (
                        <>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm">
                                    {tm('missionType')}
                                    <select
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        value={formData.missionType || 'ALL_DAY'}
                                        onChange={(e) => update('missionType', e.target.value)}
                                    >
                                        {missionTypeOptions.map((opt) => (
                                            <option key={opt} value={opt}>{tm(`missionType_${opt}`)}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm">
                                    {tm('startDate')}
                                    <input
                                        type="date"
                                        defaultValue={dateValue}
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        onChange={(e) => update('startDate', e.target.value)}
                                    />
                                </label>
                                <label className="text-sm">
                                    {tm('endDate')}
                                    <input
                                        type="date"
                                        defaultValue={dateValue}
                                        className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                        onChange={(e) => update('endDate', e.target.value)}
                                    />
                                </label>
                            </div>
                            <label className="text-sm">
                                {tm('missionTo')}
                                <textarea
                                    rows={2}
                                    className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                    onChange={(e) => update('missionTo', e.target.value)}
                                />
                            </label>
                            <label className="text-sm">
                                {tm('missionPurpose')}
                                <textarea
                                    rows={3}
                                    className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2"
                                    onChange={(e) => update('missionPurpose', e.target.value)}
                                />
                            </label>
                        </>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button className="btn-outline" onClick={onClose}>{tm('cancel')}</button>
                    <button className="btn-primary" onClick={submit} disabled={loading || !type}>
                        {loading ? tm('saving') : tm('submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
