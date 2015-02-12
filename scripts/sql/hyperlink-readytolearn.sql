-- Links readytolearn in all CPS descriptions
BEGIN;
UPDATE portal_location 
  SET q_stmt = REPLACE(q_stmt, 'please visit cps.edu/readytolearn', 'please visit <a href="http://cps.edu/readytolearn">cps.edu/readytolearn</a>.');
COMMIT;