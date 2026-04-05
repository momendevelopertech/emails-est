/** WhatsApp-style plain-text reply (no DB migration). */

export function composeReplyMessage(quotedText: string, replyBody: string) {
    const trimmedQuote = quotedText.trim();
    const trimmedBody = replyBody.trim();
    if (!trimmedQuote) return trimmedBody;
    const prefixed = trimmedQuote
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    return `${prefixed}\n\n${trimmedBody}`;
}

export function parseReplyMessage(text: string): { quote: string | null; body: string } {
    const lines = text.split('\n');
    if (!lines.length || !lines[0].trimStart().startsWith('>')) {
        return { quote: null, body: text };
    }
    const quoteLines: string[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const t = line.trimStart();
        if (!t.startsWith('>')) break;
        quoteLines.push(t.replace(/^>\s?/, ''));
        i += 1;
    }
    while (i < lines.length && lines[i].trim() === '') i += 1;
    const body = lines.slice(i).join('\n');
    return {
        quote: quoteLines.length ? quoteLines.join('\n') : null,
        body: body.trim() ? body : text,
    };
}
