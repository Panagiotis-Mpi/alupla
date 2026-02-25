-- ALUPLA migration: replace graduates.birth_year with graduates.birth_date (DATE)
-- Dialect: MySQL/MariaDB
-- Safe-ish: keeps existing data by mapping birth_year -> YYYY-01-01

START TRANSACTION;

ALTER TABLE graduates
  ADD COLUMN birth_date DATE NULL;

UPDATE graduates
  SET birth_date = STR_TO_DATE(CONCAT(birth_year, '-01-01'), '%Y-%m-%d')
  WHERE birth_date IS NULL;

ALTER TABLE graduates
  MODIFY birth_date DATE NOT NULL,
  DROP COLUMN birth_year;

COMMIT;
