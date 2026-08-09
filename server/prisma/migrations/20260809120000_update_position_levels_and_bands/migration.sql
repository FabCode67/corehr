-- Data migration (no schema change): replaces the old 13-row Position Level
-- ladder (Intern..Other Executive, split across STANDARD/EXECUTIVE tracks)
-- with the bank's real 10-level ladder, and adds a new Band for
-- contractual/non-payroll staff. Every rename below is done in place (same
-- id, just new name/rank/code) so every existing Position/Employee/
-- PositionHistory/PerformanceReview/Course/CourseAssignment/JobDescription
-- row that already references one of these rows by id keeps working
-- unchanged — only the label and seniority ranking move.

-- Offset every existing rank out of the way of the target 1-10 range first,
-- so the renumbering below can't collide with PositionLevel.rank's unique
-- constraint (e.g. "Officer" moving from rank 2 to rank 3 while whatever
-- becomes rank 2 is still sitting at its old rank).
UPDATE "position_levels" SET "rank" = "rank" + 1000;

UPDATE "position_levels"
  SET "name" = 'Support Staff', "rank" = 1, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Intern';

UPDATE "position_levels"
  SET "name" = 'Operations Assistant', "rank" = 2, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Senior Officer';

UPDATE "position_levels"
  SET "rank" = 3, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Officer';

UPDATE "position_levels"
  SET "rank" = 4, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Assistant Manager';

UPDATE "position_levels"
  SET "rank" = 5, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Manager';

UPDATE "position_levels"
  SET "rank" = 6, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Senior Manager';

UPDATE "position_levels"
  SET "name" = 'Assistant General Manager', "rank" = 7, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Head of Department';

UPDATE "position_levels"
  SET "name" = 'General Manager', "rank" = 8, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Managing Director';

UPDATE "position_levels"
  SET "name" = 'Deputy Director', "rank" = 9, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Chief Executive Officer';

UPDATE "position_levels"
  SET "name" = 'Director', "rank" = 10, "code" = NULL, "track" = 'STANDARD'
  WHERE "name" = 'Chief Operating Officer';

-- The old ladder had 3 extra EXECUTIVE-track rows with no equivalent in the
-- new 10-level list (Chief Technology Officer / Chief Financial Officer /
-- Other Executive). Position.levelId is ON DELETE RESTRICT, so these can't
-- just be dropped if anyone still references them — reassign every
-- reference onto "Director" (the new ladder's most senior level) first,
-- then delete the now-unreferenced rows. HR can manually move anyone who
-- needs a different level afterward.
DO $$
DECLARE
  director_id UUID;
  leftover_ids UUID[];
BEGIN
  SELECT "id" INTO director_id FROM "position_levels" WHERE "name" = 'Director';

  SELECT ARRAY_AGG("id") INTO leftover_ids FROM "position_levels"
    WHERE "name" IN ('Chief Technology Officer', 'Chief Financial Officer', 'Other Executive');

  IF leftover_ids IS NOT NULL THEN
    UPDATE "positions" SET "levelId" = director_id WHERE "levelId" = ANY(leftover_ids);
    UPDATE "job_descriptions" SET "requiredLevelId" = director_id WHERE "requiredLevelId" = ANY(leftover_ids);
    UPDATE "performance_reviews" SET "levelId" = director_id WHERE "levelId" = ANY(leftover_ids);
    UPDATE "courses" SET "requiredLevelId" = director_id WHERE "requiredLevelId" = ANY(leftover_ids);
    UPDATE "course_assignments" SET "levelId" = director_id WHERE "levelId" = ANY(leftover_ids);

    DELETE FROM "position_levels" WHERE "id" = ANY(leftover_ids);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- New Band for non-payroll / contractual staff (DSA, GT, Intern) — appended
-- after the existing Band 1..10 ladder rather than renumbering it.
-- ---------------------------------------------------------------------------
-- md5-based UUID (no pgcrypto/uuid-ossp extension required, unlike
-- gen_random_uuid()/uuid_generate_v4() — matches this project's existing
-- migrations, none of which assume either extension is installed).
INSERT INTO "bands" ("id", "name", "rank", "description", "isActive", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
       'Contractual Staff (DSA, GT & Intern)', 11,
       'Non-payroll contractual staff: Daily Subsistence Allowance (DSA) workers, Graduate Trainees (GT), and Interns.',
       true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "bands" WHERE "name" = 'Contractual Staff (DSA, GT & Intern)');
