-- Clears all entries in the portal_neighborhood table
-- Corresponds to Neighborhood model
BEGIN;
UPDATE portal_location 
  SET neighborhood_id = NULL;
DELETE FROM portal_neighborhood;
COMMIT;

