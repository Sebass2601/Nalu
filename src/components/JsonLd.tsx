// A block of schema.org structured data, written into the page as JSON-LD.
//
// A plain <script> rather than `next/script`: this is data for search engines
// and AI crawlers to read, not code for the browser to run, and the Next.js
// guide on JSON-LD recommends the native tag for exactly that reason.
//
// Every `<` is escaped to its unicode form. The JSON is built from database
// values — course names, descriptions typed into the admin — and a value
// containing `</script>` would otherwise end the tag early and let whatever
// followed it run as HTML. `<` reads back as the same `<` to any JSON
// parser, so nothing a crawler sees changes.
export function JsonLd({ data }: { data: object }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, "\\u003c"),
            }}
        />
    );
}
