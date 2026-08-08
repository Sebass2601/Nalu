// Seeds country groups (purchasing-power tiers) and their member countries.
//
// Written as plain .mjs so it runs with zero extra tooling:
//   node --env-file=.env src/drizzle/seed.mjs   (or: pnpm db:seed)
// It talks to Postgres directly via the `pg` driver already in the project,
// avoiding the `@/` path aliases and typed-env layer that a .ts script would
// need a bundler to resolve.
//
// Idempotent: re-running upserts, so you can safely tweak discounts and re-seed.
//
// NOTE: this is a representative STARTER mapping of major countries, not an
// exhaustive ISO list. Countries not listed here simply get no PPP discount.
// The `discount` values are fractions between 0 and 1 (0.4 = 40% off) and are a
// reasonable first pass — refine them (ideally from a real PPP dataset) to taste.

import { Client } from "pg";

// group name -> { discount, countries: [ [isoCode, name], ... ] }
const GROUPS = [
    {
        name: "United States, Canada, Western Europe & Oceania",
        discount: 0,
        countries: [
            ["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"],
            ["IE", "Ireland"], ["DE", "Germany"], ["FR", "France"],
            ["NL", "Netherlands"], ["BE", "Belgium"], ["LU", "Luxembourg"],
            ["CH", "Switzerland"], ["AT", "Austria"], ["DK", "Denmark"],
            ["SE", "Sweden"], ["NO", "Norway"], ["FI", "Finland"],
            ["IS", "Iceland"], ["IT", "Italy"], ["ES", "Spain"],
            ["PT", "Portugal"], ["AU", "Australia"], ["NZ", "New Zealand"],
            ["JP", "Japan"], ["KR", "South Korea"], ["SG", "Singapore"],
            ["HK", "Hong Kong"],
        ],
    },
    {
        name: "Eastern Europe & Emerging Europe",
        discount: 0.25,
        countries: [
            ["PL", "Poland"], ["CZ", "Czechia"], ["SK", "Slovakia"],
            ["HU", "Hungary"], ["RO", "Romania"], ["BG", "Bulgaria"],
            ["HR", "Croatia"], ["SI", "Slovenia"], ["RS", "Serbia"],
            ["EE", "Estonia"], ["LV", "Latvia"], ["LT", "Lithuania"],
            ["GR", "Greece"], ["UA", "Ukraine"], ["MD", "Moldova"],
            ["BA", "Bosnia and Herzegovina"], ["MK", "North Macedonia"],
            ["AL", "Albania"], ["CN", "China"],
        ],
    },
    {
        name: "Latin America & Caribbean",
        discount: 0.45,
        countries: [
            ["MX", "Mexico"], ["BR", "Brazil"], ["AR", "Argentina"],
            ["CL", "Chile"], ["CO", "Colombia"], ["PE", "Peru"],
            ["VE", "Venezuela"], ["EC", "Ecuador"], ["BO", "Bolivia"],
            ["PY", "Paraguay"], ["UY", "Uruguay"], ["GT", "Guatemala"],
            ["HN", "Honduras"], ["SV", "El Salvador"], ["NI", "Nicaragua"],
            ["CR", "Costa Rica"], ["PA", "Panama"], ["DO", "Dominican Republic"],
            ["JM", "Jamaica"],
        ],
    },
    {
        name: "Middle East & North Africa",
        discount: 0.4,
        countries: [
            ["TR", "Turkey"], ["EG", "Egypt"], ["MA", "Morocco"],
            ["DZ", "Algeria"], ["TN", "Tunisia"], ["JO", "Jordan"],
            ["LB", "Lebanon"], ["IQ", "Iraq"], ["IR", "Iran"],
            ["SA", "Saudi Arabia"], ["AE", "United Arab Emirates"],
            ["QA", "Qatar"], ["KW", "Kuwait"], ["BH", "Bahrain"],
            ["OM", "Oman"], ["IL", "Israel"],
        ],
    },
    {
        name: "Sub-Saharan Africa",
        discount: 0.6,
        countries: [
            ["NG", "Nigeria"], ["GH", "Ghana"], ["KE", "Kenya"],
            ["TZ", "Tanzania"], ["UG", "Uganda"], ["ET", "Ethiopia"],
            ["ZA", "South Africa"], ["ZM", "Zambia"], ["ZW", "Zimbabwe"],
            ["CM", "Cameroon"], ["CI", "Côte d'Ivoire"], ["SN", "Senegal"],
            ["RW", "Rwanda"], ["MZ", "Mozambique"], ["AO", "Angola"],
            ["BW", "Botswana"], ["NA", "Namibia"],
        ],
    },
    {
        name: "South & Southeast Asia",
        discount: 0.55,
        countries: [
            ["IN", "India"], ["PK", "Pakistan"], ["BD", "Bangladesh"],
            ["LK", "Sri Lanka"], ["NP", "Nepal"], ["ID", "Indonesia"],
            ["PH", "Philippines"], ["VN", "Vietnam"], ["TH", "Thailand"],
            ["MY", "Malaysia"], ["MM", "Myanmar"], ["KH", "Cambodia"],
            ["LA", "Laos"],
        ],
    },
];

async function main() {
    const client = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ?? 5432,
    });
    await client.connect();

    let groupCount = 0;
    let countryCount = 0;

    for (const group of GROUPS) {
        // Upsert the group by its unique name and grab its id.
        const {
            rows: [{ id: groupId }],
        } = await client.query(
            `INSERT INTO "country_groups" ("name", "recommendedDiscountPercentage")
             VALUES ($1, $2)
             ON CONFLICT ("name")
             DO UPDATE SET "recommendedDiscountPercentage" = EXCLUDED."recommendedDiscountPercentage",
                           "updatedAt" = now()
             RETURNING "id"`,
            [group.name, group.discount]
        );
        groupCount++;

        // Upsert each member country by its unique ISO code.
        for (const [code, name] of group.countries) {
            await client.query(
                `INSERT INTO "countries" ("name", "code", "countryGroupId")
                 VALUES ($1, $2, $3)
                 ON CONFLICT ("code")
                 DO UPDATE SET "name" = EXCLUDED."name",
                               "countryGroupId" = EXCLUDED."countryGroupId",
                               "updatedAt" = now()`,
                [name, code, groupId]
            );
            countryCount++;
        }
    }

    await client.end();
    console.log(`Seeded ${groupCount} country groups and ${countryCount} countries.`);
}

main().catch(err => {
    console.error("Seed failed:", err);
    process.exit(1);
});
