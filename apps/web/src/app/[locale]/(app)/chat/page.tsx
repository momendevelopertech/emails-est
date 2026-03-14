import ChatPageClient from '@/components/chat/ChatPageClient';

export default function ChatPage({ params }: { params: { locale: string } }) {
    return <ChatPageClient locale={params.locale} />;
}
