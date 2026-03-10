import { io, Socket } from 'socket.io-client';
import { getPublicSocketUrl } from './public-urls';

let socket: Socket | null = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(getPublicSocketUrl(), {
            withCredentials: true,
            transports: ['websocket'],
        });
    }
    return socket;
};
