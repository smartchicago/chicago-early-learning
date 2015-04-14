-- Clears all entries in the portal_neighborhood table
-- Corresponds to Neighborhood model
BEGIN;
ALTER TABLE portal_location 
  ADD COLUMN email varchar(75);
COMMIT;

BEGIN;
CREATE TABLE "portal_contact" (
    "id" serial NOT NULL PRIMARY KEY,
    "location_id" integer NOT NULL REFERENCES "portal_location" ("id") DEFERRABLE INITIALLY DEFERRED,
    "first_name" varchar(50) NOT NULL,
    "last_name" varchar(50) NOT NULL,
    "email" varchar(75) NOT NULL,
    "phone" varchar(20) NOT NULL,
    "address_1" varchar(75) NOT NULL,
    "address_2" varchar(75) NOT NULL,
    "city" varchar(75) NOT NULL,
    "state" varchar(2) NOT NULL,
    "zip" varchar(10) NOT NULL,
    "child_1" varchar(6) NOT NULL,
    "child_2" varchar(6) NOT NULL,
    "child_3" varchar(6) NOT NULL,
    "child_4" varchar(6) NOT NULL,
    "child_5" varchar(6) NOT NULL,
    "message" text NOT NULL
)
;
COMMIT;