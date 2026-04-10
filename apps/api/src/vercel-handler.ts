import 'reflect-metadata';
import { createHttpServer } from './http-server';

export const config = {
    runtime: 'nodejs',
    maxDuration: 60,
};

let cachedServer: Awaited<ReturnType<typeof createHttpServer>> | null = null;
let pendingServer: Promise<Awaited<ReturnType<typeof createHttpServer>>> | null = null;

async function getServer() {
    if (cachedServer) {
        return cachedServer;
    }

    if (!pendingServer) {
        pendingServer = createHttpServer()
            .then((server) => {
                cachedServer = server;
                return server;
            })
            .finally(() => {
                pendingServer = null;
            });
    }

    return pendingServer;
}

export default async function handler(request: any, response: any) {
    const server = await getServer();
    return server(request, response);
}
