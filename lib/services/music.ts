import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PLAYLIST_TYPES = ["PLAYLIST", "RADIO", "PODCAST"] as const;
export type PlaylistTypeValue = (typeof PLAYLIST_TYPES)[number];

export type MusicTrack = {
  id: string;
  playlistId: string;
  title: string;
  author: string | null;
  audioUrl: string;
  duration: number | null;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type MusicPlaylistSummary = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  type: PlaylistTypeValue;
  trackCount: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
};

export type MusicPlaylistDetail = MusicPlaylistSummary & {
  tracks: MusicTrack[];
};

export type MusicPageData = {
  playlists: MusicPlaylistDetail[];
};

type CreatePlaylistInput = {
  title: string;
  description?: string;
  coverUrl?: string;
  type?: PlaylistTypeValue;
};

type UpdatePlaylistInput = {
  title?: string;
  description?: string | null;
  coverUrl?: string | null;
  type?: PlaylistTypeValue;
};

type CreateTrackInput = {
  playlistId: string;
  title: string;
  author?: string;
  audioUrl: string;
  duration?: number | null;
  description?: string;
  order?: number;
};

type UpdateTrackInput = {
  title?: string;
  author?: string | null;
  audioUrl?: string;
  duration?: number | null;
  description?: string | null;
  order?: number;
};

export class MusicServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MusicServiceError";
  }
}

export async function getMusicPageData(): Promise<MusicPageData> {
  const playlists = await listPlaylists({ includeTracks: true, onlyWithTracks: true });
  return { playlists };
}

export function listPlaylists(options: {
  includeTracks: true;
  onlyWithTracks?: boolean;
}): Promise<MusicPlaylistDetail[]>;
export function listPlaylists(options?: {
  includeTracks?: false;
  onlyWithTracks?: boolean;
}): Promise<MusicPlaylistSummary[]>;
export async function listPlaylists(options?: {
  includeTracks?: boolean;
  onlyWithTracks?: boolean;
}): Promise<MusicPlaylistDetail[] | MusicPlaylistSummary[]> {
  assertMusicPrismaClient();
  const includeTracks = options?.includeTracks ?? false;
  const playlists = await prisma.playlist.findMany({
    where: options?.onlyWithTracks
      ? {
          tracks: {
            some: {},
          },
        }
      : undefined,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      tracks: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (includeTracks) {
    return playlists.map(mapPlaylistDetail);
  }

  return playlists.map(mapPlaylistSummary);
}

export async function getPlaylistById(id: string): Promise<MusicPlaylistDetail | null> {
  assertMusicPrismaClient();
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      tracks: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return playlist ? mapPlaylistDetail(playlist) : null;
}

export async function createPlaylist(rawInput: unknown): Promise<MusicPlaylistDetail> {
  assertMusicPrismaClient();
  const input = parseCreatePlaylistInput(rawInput);

  try {
    const playlist = await prisma.playlist.create({
      data: {
        title: input.title,
        description: input.description,
        coverUrl: input.coverUrl,
        type: input.type ?? "PLAYLIST",
      },
      include: {
        tracks: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return mapPlaylistDetail(playlist);
  } catch (error) {
    throw handleMusicPersistenceError(error, "Invalid playlist payload");
  }
}

export async function updatePlaylist(id: string, rawInput: unknown): Promise<MusicPlaylistDetail> {
  assertMusicPrismaClient();
  const input = parseUpdatePlaylistInput(rawInput);

  await ensurePlaylistExists(id);

  try {
    const playlist = await prisma.playlist.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
      },
      include: {
        tracks: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return mapPlaylistDetail(playlist);
  } catch (error) {
    throw handleMusicPersistenceError(error, "Invalid playlist payload");
  }
}

export async function deletePlaylist(id: string): Promise<{ id: string }> {
  assertMusicPrismaClient();
  await ensurePlaylistExists(id);
  await prisma.playlist.delete({ where: { id } });
  return { id };
}

export async function createTrack(rawInput: unknown): Promise<MusicTrack> {
  assertMusicPrismaClient();
  const input = parseCreateTrackInput(rawInput);
  await ensurePlaylistExists(input.playlistId);

  const order = input.order ?? (await getNextTrackOrder(input.playlistId));

  try {
    const track = await prisma.track.create({
      data: {
        playlistId: input.playlistId,
        title: input.title,
        author: input.author,
        audioUrl: input.audioUrl,
        duration: input.duration,
        description: input.description,
        order,
      },
    });

    await normalizeTrackOrder(input.playlistId);
    const persisted = await prisma.track.findUnique({ where: { id: track.id } });

    if (!persisted) {
      throw new MusicServiceError("Track not found after creation", 500);
    }

    return mapTrack(persisted);
  } catch (error) {
    throw handleMusicPersistenceError(error, "Invalid track payload");
  }
}

export async function updateTrack(id: string, rawInput: unknown): Promise<MusicTrack> {
  assertMusicPrismaClient();
  const input = parseUpdateTrackInput(rawInput);
  const currentTrack = await prisma.track.findUnique({
    where: { id },
    select: {
      id: true,
      playlistId: true,
      title: true,
      author: true,
      audioUrl: true,
      duration: true,
      description: true,
      order: true,
    },
  });

  if (!currentTrack) {
    throw new MusicServiceError("Track not found", 404);
  }

  try {
    const persisted = await prisma.$transaction(async (tx) => {
      const baseTrack = await tx.track.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.author !== undefined ? { author: input.author } : {}),
          ...(input.audioUrl !== undefined ? { audioUrl: input.audioUrl } : {}),
          ...(input.duration !== undefined ? { duration: input.duration } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      });

      if (input.order === undefined) {
        return baseTrack;
      }

      const orderedTracks = await tx.track.findMany({
        where: { playlistId: currentTrack.playlistId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });

      const currentIndex = orderedTracks.findIndex((track) => track.id === id);
      const [movedTrack] = orderedTracks.splice(currentIndex, 1);

      if (!movedTrack) {
        throw new MusicServiceError("Track not found during reorder", 404);
      }

      const targetIndex = Math.max(0, Math.min(input.order, orderedTracks.length));
      orderedTracks.splice(targetIndex, 0, {
        ...movedTrack,
        ...baseTrack,
      });

      await Promise.all(
        orderedTracks.map((track, index) =>
          tx.track.update({
            where: { id: track.id },
            data: { order: index },
          }),
        ),
      );

      const reorderedTrack = await tx.track.findUnique({ where: { id } });

      if (!reorderedTrack) {
        throw new MusicServiceError("Track not found after update", 500);
      }

      return reorderedTrack;
    });

    if (!persisted) {
      throw new MusicServiceError("Track not found after update", 500);
    }

    return mapTrack(persisted);
  } catch (error) {
    throw handleMusicPersistenceError(error, "Invalid track payload");
  }
}

export async function deleteTrack(id: string): Promise<{ id: string }> {
  assertMusicPrismaClient();
  const currentTrack = await prisma.track.findUnique({
    where: { id },
    select: { id: true, playlistId: true },
  });

  if (!currentTrack) {
    throw new MusicServiceError("Track not found", 404);
  }

  await prisma.track.delete({ where: { id } });
  await normalizeTrackOrder(currentTrack.playlistId);

  return { id };
}

function mapPlaylistSummary(playlist: {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  type: PlaylistTypeValue;
  createdAt: Date;
  updatedAt: Date;
  tracks: Array<{ duration: number | null }>;
}): MusicPlaylistSummary {
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    coverUrl: playlist.coverUrl,
    type: playlist.type,
    trackCount: playlist.tracks.length,
    totalDuration: playlist.tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0),
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
  };
}

function mapPlaylistDetail(playlist: {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  type: PlaylistTypeValue;
  createdAt: Date;
  updatedAt: Date;
  tracks: Array<{
    id: string;
    playlistId: string;
    title: string;
    author: string | null;
    audioUrl: string;
    duration: number | null;
    description: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): MusicPlaylistDetail {
  return {
    ...mapPlaylistSummary(playlist),
    tracks: playlist.tracks.map(mapTrack),
  };
}

function mapTrack(track: {
  id: string;
  playlistId: string;
  title: string;
  author: string | null;
  audioUrl: string;
  duration: number | null;
  description: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}): MusicTrack {
  return {
    id: track.id,
    playlistId: track.playlistId,
    title: track.title,
    author: track.author,
    audioUrl: track.audioUrl,
    duration: track.duration,
    description: track.description,
    order: track.order,
    createdAt: track.createdAt.toISOString(),
    updatedAt: track.updatedAt.toISOString(),
  };
}

async function ensurePlaylistExists(id: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!playlist) {
    throw new MusicServiceError("Playlist not found", 404);
  }
}

async function getNextTrackOrder(playlistId: string): Promise<number> {
  const lastTrack = await prisma.track.findFirst({
    where: { playlistId },
    orderBy: [{ order: "desc" }, { createdAt: "desc" }],
    select: { order: true },
  });

  return (lastTrack?.order ?? -1) + 1;
}

async function normalizeTrackOrder(playlistId: string) {
  const tracks = await prisma.track.findMany({
    where: { playlistId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (tracks.length === 0) {
    return;
  }

  await prisma.$transaction(
    tracks.map((track, index) =>
      prisma.track.update({
        where: { id: track.id },
        data: { order: index },
      }),
    ),
  );
}

function parseCreatePlaylistInput(rawInput: unknown): CreatePlaylistInput {
  if (!isRecord(rawInput)) {
    throw new MusicServiceError("Request body must be a JSON object", 400);
  }

  return {
    title: parseRequiredString(rawInput.title, "title"),
    description: parseOptionalString(rawInput.description, "description"),
    coverUrl: parseOptionalString(rawInput.coverUrl, "coverUrl"),
    type: parseOptionalPlaylistType(rawInput.type, "type"),
  };
}

function parseUpdatePlaylistInput(rawInput: unknown): UpdatePlaylistInput {
  if (!isRecord(rawInput)) {
    throw new MusicServiceError("Request body must be a JSON object", 400);
  }

  return {
    title: parseOptionalString(rawInput.title, "title"),
    description: parseNullableString(rawInput.description, "description"),
    coverUrl: parseNullableString(rawInput.coverUrl, "coverUrl"),
    type: parseOptionalPlaylistType(rawInput.type, "type"),
  };
}

function parseCreateTrackInput(rawInput: unknown): CreateTrackInput {
  if (!isRecord(rawInput)) {
    throw new MusicServiceError("Request body must be a JSON object", 400);
  }

  return {
    playlistId: parseRequiredString(rawInput.playlistId, "playlistId"),
    title: parseRequiredString(rawInput.title, "title"),
    author: parseOptionalString(rawInput.author, "author"),
    audioUrl: parseRequiredString(rawInput.audioUrl, "audioUrl"),
    duration: parseNullableNonNegativeInt(rawInput.duration, "duration"),
    description: parseOptionalString(rawInput.description, "description"),
    order: parseOptionalNonNegativeInt(rawInput.order, "order"),
  };
}

function parseUpdateTrackInput(rawInput: unknown): UpdateTrackInput {
  if (!isRecord(rawInput)) {
    throw new MusicServiceError("Request body must be a JSON object", 400);
  }

  return {
    title: parseOptionalString(rawInput.title, "title"),
    author: parseNullableString(rawInput.author, "author"),
    audioUrl: parseOptionalString(rawInput.audioUrl, "audioUrl"),
    duration: parseNullableNonNegativeInt(rawInput.duration, "duration"),
    description: parseNullableString(rawInput.description, "description"),
    order: parseOptionalNonNegativeInt(rawInput.order, "order"),
  };
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MusicServiceError(`${fieldName} is required`, 400);
  }

  return value.trim();
}

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new MusicServiceError(`${fieldName} must be a string`, 400);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNullableString(value: unknown, fieldName: string): string | null | undefined {
  if (value === null) {
    return null;
  }

  return parseOptionalString(value, fieldName);
}

function parseOptionalPlaylistType(value: unknown, fieldName: string): PlaylistTypeValue | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string" || !PLAYLIST_TYPES.includes(value as PlaylistTypeValue)) {
    throw new MusicServiceError(`${fieldName} must be a valid playlist type`, 400);
  }

  return value as PlaylistTypeValue;
}

function parseOptionalNonNegativeInt(value: unknown, fieldName: string): number | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new MusicServiceError(`${fieldName} must be a non-negative integer`, 400);
  }

  return value;
}

function parseNullableNonNegativeInt(value: unknown, fieldName: string): number | null | undefined {
  if (value === null) {
    return null;
  }

  return parseOptionalNonNegativeInt(value, fieldName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertMusicPrismaClient() {
  if (!("playlist" in prisma) || !prisma.playlist) {
    throw new Error("Prisma client missing Playlist model. Did you run prisma generate?");
  }

  if (!("track" in prisma) || !prisma.track) {
    throw new Error("Prisma client missing Track model. Did you run prisma generate?");
  }
}

function handleMusicPersistenceError(error: unknown, fallbackMessage: string): MusicServiceError {
  if (error instanceof MusicServiceError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new MusicServiceError(fallbackMessage, 400);
  }

  return new MusicServiceError("Failed to persist music data", 500);
}
