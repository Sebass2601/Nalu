// What the free classes are called wherever visitors are pointed at them: the
// plaque in the salon, and the heading over /newsletter itself.
//
// This file used to hold two strings — this one, and the exact `courses.name`
// that /newsletter matched against to find its course. That lookup is gone: a
// course is free content because a checkbox says so, not because it is spelled a
// particular way, so renaming one in the admin panel can no longer empty the
// page. What is left is copy, and changing it touches no data.
//
// Deliberately free of `import "server-only"`: the salon is a client component,
// so this has to be readable from both sides. It is not a secret.
export const FREE_COURSE_TITLE = "Clases Gratuitas";
