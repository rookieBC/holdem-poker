import type { Room, RoomConfig, Seat } from '@holdem/shared';
import { genId } from '../lib/id.js';

const rooms = new Map<string, Room>();

export function createRoom(name: string, config: RoomConfig): Room {
  const seats: Seat[] = Array.from({ length: config.maxSeats }, (_, i) => ({
    index: i,
    player: null,
  }));
  const room: Room = {
    id: genId('r'),
    name,
    seats,
    gameState: null,
    config,
    hostPlayerId: null,
    createdAt: Date.now(),
  };
  rooms.set(room.id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function listRooms(): Room[] {
  return Array.from(rooms.values());
}

export function deleteRoom(id: string): void {
  rooms.delete(id);
}

export function defaultConfig(): RoomConfig {
  return {
    maxSeats: 6,
    minPlayers: 2,
    smallBlind: 10,
    bigBlind: 20,
    startingChips: 1000,
  };
}
