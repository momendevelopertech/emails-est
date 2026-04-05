'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Smile, X } from 'lucide-react';
import { ChatMessage } from './types';

const QUICK_EMOJIS = ['😀', '😂', '😍', '🙏', '👍', '👎', '❤️', '🔥', '✅', '⭐', '🎉', '🙌', '😊', '🤝', '💼', '📎', '📍', '⏰', '📅', '☕', '💪', '🎯'];

export default function MessageInput({
    onSend,
    disabled,
    replyTo,
    onCancelReply,
}: {
    onSend: (message: string) => Promise<void>;
    disabled?: boolean;
    replyTo?: ChatMessage | null;
    onCancelReply?: () => void;
}) {
    const t = useTranslations('chat');
    const [message, setMessage] = useState('');
    const [emojiOpen, setEmojiOpen] = useState(false);

    const submit = async () => {
        const text = message.trim();
        if (!text || disabled) return;
        setMessage('');
        setEmojiOpen(false);
        await onSend(text);
    };

    const insertEmoji = (ch: string) => {
        setMessage((prev) => `${prev}${ch}`);
        setEmojiOpen(false);
    };

    return (
        <div className="border-t border-[#e9edef] bg-[#f0f2f5] p-2">
            {replyTo ? (
                <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-[#25d366]/40 bg-white px-3 py-2 text-sm text-[#111b21] shadow-sm">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#25d366]">{t('replyingTo')}</p>
                        <p className="line-clamp-2 text-[13px] text-[#667781]">{replyTo.messageText}</p>
                    </div>
                    <button
                        type="button"
                        className="shrink-0 rounded-full p-1 text-[#54656f] hover:bg-black/5"
                        aria-label={t('cancelReply')}
                        onClick={() => onCancelReply?.()}
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : null}
            <div className="relative flex items-end gap-1 rounded-2xl bg-white px-2 py-1.5 shadow-inner">
                <div className="relative">
                    <button
                        type="button"
                        className="rounded-full p-2 text-[#54656f] hover:bg-black/5"
                        aria-label="Emoji"
                        disabled={disabled}
                        onClick={() => setEmojiOpen((v) => !v)}
                    >
                        <Smile size={20} />
                    </button>
                    {emojiOpen && !disabled ? (
                        <div className="absolute bottom-full left-0 z-40 mb-2 grid w-[min(92vw,280px)] grid-cols-7 gap-1 rounded-xl border border-[#e9edef] bg-white p-2 shadow-lg">
                            {QUICK_EMOJIS.map((ch) => (
                                <button
                                    key={ch}
                                    type="button"
                                    className="rounded-lg p-1.5 text-xl hover:bg-[#f0f2f5]"
                                    onClick={() => insertEmoji(ch)}
                                >
                                    {ch}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
                <textarea
                    className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] text-[#111b21] outline-none placeholder:text-[#8696a0]"
                    rows={1}
                    value={message}
                    disabled={disabled}
                    placeholder={t('messagePlaceholder')}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                />
                <button
                    type="button"
                    className="mb-0.5 rounded-full bg-[#25d366] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#20bd5a] disabled:opacity-40"
                    onClick={submit}
                    disabled={disabled || !message.trim()}
                >
                    {t('send')}
                </button>
            </div>
        </div>
    );
}
