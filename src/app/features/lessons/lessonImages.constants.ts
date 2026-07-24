// Plain constants for the lesson-images feature. Kept out of the "use server"
// actions file (which may only export async functions) and out of client
// components, so both the server action and the UI can share one source.

// A lesson may hold at most this many images.
export const MAX_LESSON_IMAGES = 3;

// Captions are optional, but bounded so they remain concise in the UI.
export const MAX_LESSON_IMAGE_CAPTION_LENGTH = 200;
