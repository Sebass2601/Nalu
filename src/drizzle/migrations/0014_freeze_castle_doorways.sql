-- Freezes the castle exactly as it looks the moment this runs.
--
-- Until now the homepage handed doorways to categories on every render: the
-- three pinned in its source took theirs, and the rest were poured into
-- whatever doorways were left, alphabetically, in the order the doorways appear
-- in HOTSPOTS. That arrangement lived nowhere but in the code that recomputed
-- it, so it shifted whenever a category was added or removed. This writes
-- today's result into the doorway column once, so those plaques stay where
-- visitors already know them and stop moving thereafter.
--
-- It re-runs the old rule rather than naming category ids, so it lands on the
-- right answer in any database: the previous migration has already pinned
-- whichever of the three ids exist here, and this hands out only the doorways
-- still free, to only the categories still without one. Where those ids do not
-- exist, nothing was pinned on the homepage either, and both then fall out the
-- same way.
--
-- Doorway 4 is absent from the list on purpose — it is the Gran Salón del
-- Conocimiento, which the homepage fills itself and no category may take.
-- Categories past the last free doorway keep a null: there were never enough
-- doorways to go round, and the homepage left those categories off the castle
-- too.
WITH free_doorway AS (
    SELECT d."doorway", row_number() OVER (ORDER BY d."ord") AS "n"
    FROM (
        VALUES ('1', 1), ('2', 2), ('3', 3), ('5', 5),
               ('6', 6), ('7', 7), ('8', 8), ('9', 9)
    ) AS d ("doorway", "ord")
    WHERE NOT EXISTS (
        SELECT 1 FROM "categories" c WHERE c."doorway" = d."doorway"
    )
),
spare_category AS (
    SELECT "id", row_number() OVER (ORDER BY "name") AS "n"
    FROM "categories"
    WHERE "doorway" IS NULL
)
UPDATE "categories" AS c
SET "doorway" = free_doorway."doorway"
FROM spare_category
JOIN free_doorway ON free_doorway."n" = spare_category."n"
WHERE c."id" = spare_category."id";
