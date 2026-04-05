'use client';

import { CornerUpLeft } from 'lucide-react';
import { parseReplyMessage } from './compose-reply';
import { ChatMessage } from './types';

export default function MessageBubble({
    message,
    isMine,
    onReply,
}: {
    message: ChatMessage;
    isMine: boolean;
    onReply?: (m: ChatMessage) => void;
}) {
    const { quote, body } = parseReplyMessage(message.messageText);
    const time = new Date(message.createdAt).toLocaleString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
    });

    return (
        <div className={`chat-bubble-row flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {!isMine && onReply ? (
                <button
                    type="button"
                    className="chat-reply-icon mt-1 shrink-0 rounded-full p-1 text-[#54656f] opacity-70 hover:bg-black/5 hover:opacity-100"
                    title="Reply"
                    aria-label="Reply"
                    onClick={() => onReply(message)}
                >
                    <CornerUpLeft size={16} />
                </button>
            ) : null}
            <div
                className={`chat-bubble max-w-[min(100%,520px)] rounded-lg px-2 py-1.5 text-[14.2px] leading-snug shadow-sm sm:max-w-[min(100%,420px)] ${
                    isMine
                        ? 'bg-[#d9fdd3] text-[#111b21] rounded-br-none'
                        : 'bg-white text-[#111b21] rounded-bl-none border border-[#e9edef]'
                }`}
            >
                {quote ? (
                    <div
                        className={`mb-1 border-l-4 pl-2 text-[13px] text-[#667781] ${
                            isMine ? 'border-[#25d366]' : 'border-[#25d366]'
                        }`}
                    >
                        <p className="line-clamp-6 whitespace-pre-wrap break-words">{quote}</p>
                    </div>
                ) : null}
                <p className="whitespace-pre-wrap break-words">{quote ? body : message.messageText}</p>
                <div className={`mt-0.5 flex items-center justify-end gap-2 text-[11px] ${isMine ? 'text-[#667781]' : 'text-[#667781]'}`}>
                    <span className="tabular-nums">{time}</span>
                    {isMine && message.readStatus ? <span className="text-[#53bdeb]">✓✓</span> : null}
                </div>
            </div>
            {isMine && onReply ? (
                <button
                    type="button"
                    className="chat-reply-icon mt-1 shrink-0 rounded-full p-1 text-[#54656f] opacity-70 hover:bg-black/5 hover:opacity-100"
                    title="Reply"
                    aria-label="Reply"
                    onClick={() => onReply(message)}
                >
                    <CornerUpLeft size={16} />
                </button>
            ) : null}
        </div>
    );
}
