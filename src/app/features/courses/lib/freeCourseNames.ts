// The free course goes by two different names, and keeping them apart is the
// point of this file.
//
// One is a database value and one is a piece of copy. They were the same string
// to begin with, which is exactly the arrangement that makes a rename in the
// admin panel silently break the page — so they are separated here, next to each
// other, where the difference is visible.
//
// Deliberately free of `import "server-only"`: the menu that prints the title is
// a client component, so this has to be readable from both sides. Neither string
// is a secret.

// What the course row is called in the database, and therefore in the admin
// panel. This is the lookup key: create a course with exactly this name and it
// becomes the free course. Accents and capitals included — the comparison is
// exact.
//
// Visitors never see it.
export const FREE_COURSE_NAME = "Contenido del Curso Gratis";

// What visitors see: the plaque on the front page, the heading over the menu,
// and the page's own heading when there is nothing published yet. Changing this
// is a copy change and touches no data.
export const FREE_COURSE_TITLE = "Clases Gratuitas";
