// Plain constants for the lesson-images feature. Kept out of the "use server"
// actions file (which may only export async functions) and out of client
// components, so both the server action and the UI can share one source.

// A lesson may hold any number of images. There is deliberately no total
// maximum: how many pictures a lesson needs is a question about the lesson, and
// whoever writes it is better placed to answer than a constant.
//
// What remains is a ceiling on a single upload, and only because UploadThing's
// route config requires `maxFileCount` to be a number — it has no "unlimited".
// So this is not a rule about lessons, it is the size of one trip: drop sixty
// pictures in and the first fifty go up, then the rest on a second drag.
// Raising it costs nothing but a longer wait on one upload.
export const MAX_LESSON_IMAGES_PER_UPLOAD = 50;

// Captions are optional, but bounded so they remain concise in the UI.
export const MAX_LESSON_IMAGE_CAPTION_LENGTH = 200;
