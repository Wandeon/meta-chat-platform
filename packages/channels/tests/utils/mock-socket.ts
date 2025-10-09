import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { Server, Socket } from 'socket.io';

type Middleware = (socket: MockSocket, next: (err?: Error) => void) => void;

type RoomEmit = {
  emit: (event: string, payload: any) => void;
};

export class MockSocket extends EventEmitter {
  public readonly id = randomUUID();
  public readonly handshake: { auth: Record<string, any> };
  private readonly server: MockServer;
  private joinedRooms = new Set<string>();
  public received: Array<{ event: string; payload: any }> = [];

  constructor(server: MockServer, auth: Record<string, any>) {
    super();
    this.server = server;
    this.handshake = { auth };
  }

  join(room: string): void {
    this.joinedRooms.add(room);
    this.server.addToRoom(room, this);
  }

  to(room: string): RoomEmit {
    return {
      emit: (event: string, payload: any) => {
        this.server.emitToRoom(room, event, payload, this);
      }
    };
  }

  emit(eventName: string, ...args: any[]): boolean {
    return super.emit(eventName, ...args);
  }

  emitToClient(event: string, payload: any): void {
    this.received.push({ event, payload });
  }
}

export class MockServer extends EventEmitter {
  public readonly engine = { opts: {} as Record<string, any> };
  private readonly middlewares: Middleware[] = [];
  private readonly rooms = new Map<string, Set<MockSocket>>();

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  to(room: string): RoomEmit {
    return {
      emit: (event: string, payload: any) => {
        this.emitToRoom(room, event, payload);
      }
    };
  }

  addToRoom(room: string, socket: MockSocket): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }

    this.rooms.get(room)!.add(socket);
  }

  emitToRoom(room: string, event: string, payload: any, except?: MockSocket): void {
    const sockets = this.rooms.get(room);
    if (!sockets) {
      return;
    }

    for (const socket of sockets) {
      if (except && socket === except) {
        continue;
      }

      socket.emitToClient(event, payload);
    }
  }

  simulateConnection(auth: Record<string, any>): MockSocket {
    const socket = new MockSocket(this, auth);

    for (const middleware of this.middlewares) {
      let error: Error | undefined;
      middleware(socket, (err) => {
        error = err;
      });

      if (error) {
        throw error;
      }
    }

    this.emit('connection', socket as unknown as Socket);
    return socket;
  }
}

export function createMockServer(): Server {
  return new MockServer() as unknown as Server;
}
