-- Follow-up to 20260809120000_update_position_levels_and_bands, which
-- renamed the old 13-row ladder onto the new 10-level one but left every
-- row's `track` as STANDARD. The bank has now clarified: only Deputy
-- Director and Director are EXECUTIVE track — General Manager is the
-- department-head level (the old "Head of Department" role) and stays
-- STANDARD. Safe to run whether or not the rename migration already ran on
-- this database: it matches by `name`, and if the rename hasn't happened
-- yet this simply updates nothing (those names won't exist), then the
-- rename migration running afterward/before still leaves this in the
-- correct final state either way since migrations apply in timestamp order.
UPDATE "position_levels" SET "track" = 'EXECUTIVE' WHERE "name" IN ('Deputy Director', 'Director');
UPDATE "position_levels" SET "track" = 'STANDARD' WHERE "name" NOT IN ('Deputy Director', 'Director');
