// Plain constants for the images that go inside a piece of writing — a text
// lesson or an announcement. Kept out of the "use server" action files (which may
// only export async functions) and out of client components, so the server
// action, the upload route and the UI can all share one source.
//
// Neutral rather than lesson-specific because two features now upload images
// through the same component, and two copies of the same two numbers is how the
// two would eventually come to disagree about them.

// Any number of images may be attached. There is deliberately no total maximum:
// how many pictures something needs is a question about that thing, and whoever
// writes it is better placed to answer than a constant.
//
// What remains is a ceiling on a single upload, and only because UploadThing's
// route config requires `maxFileCount` to be a number — it has no "unlimited".
// So this is not a rule about lessons or announcements, it is the size of one
// trip: drop sixty pictures in and the first fifty go up, then the rest on a
// second drag. Raising it costs nothing but a longer wait on one upload.
export const MAX_IMAGES_PER_UPLOAD = 50;

// Captions are optional, but bounded so they remain concise in the UI.
export const MAX_IMAGE_CAPTION_LENGTH = 200;
