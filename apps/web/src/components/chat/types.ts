export type ChatEmployee = {
    id: string;
    fullName: string;
    jobTitle?: string | null;
    governorate?: 'CAIRO' | 'ALEXANDRIA' | null;
    role?: string;
    unreadCount?: number;
    lastMessage?: string;
    lastMessageAt?: string;
};

export type ChatMessage = {
    id: string;
    senderId: string;
    receiverId: string;
    messageText: string;
    createdAt: string;
    readStatus: boolean;
};
