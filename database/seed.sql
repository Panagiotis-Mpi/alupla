
USE alupla;

-- =========================
-- USERS
-- =========================
INSERT INTO users 
(first_name, last_name, email, password_hash, role, is_active, email_verified)
VALUES
('Super', 'Admin', 'admin@alupla.gr', '$2b$10$dummyhash', 'super_admin', 1, 1),
('Secretariat', 'User', 'secretariat@alupla.gr', '$2b$10$dummyhash', 'secretariat', 1, 1);

-- =========================
-- STUDY PROGRAMS
-- =========================
INSERT INTO study_programs (code, name_el, name_en)
VALUES
('CEID', 'Μηχανικών Η/Υ και Πληροφορικής', 'Computer Engineering and Informatics');

-- =========================
-- PROGRAM DIRECTIONS
-- =========================
INSERT INTO program_directions (study_program_id, code, name_el, name_en)
VALUES
(1, 'SW', 'Μηχανική Λογισμικού', 'Software Engineering'),
(1, 'HW', 'Υλικό και Συστήματα', 'Hardware and Systems');

-- =========================
-- REGIONS (Ιεραρχία)
-- =========================
-- Περιφέρεια
INSERT INTO regions (name, type, parent_id) VALUES
('Δυτική Ελλάδα', 'PERIPHERY', NULL);

-- Νομός
INSERT INTO regions (name, type, parent_id) VALUES
('Αχαΐα', 'NOMOS', 1);

-- Δήμος
INSERT INTO regions (name, type, parent_id) VALUES
('Δήμος Πατρέων', 'DIMOS', 2);

-- Πόλη
INSERT INTO regions (name, type, parent_id, latitude, longitude) VALUES
('Πάτρα', 'CITY', 3, 38.2466, 21.7346);

-- =========================
-- GRADUATES
-- =========================
INSERT INTO graduates (
    ad_code,
    last_name,
    first_name,
    father_name,
    degree_grade,
    graduation_date,
    oath_date,
    entry_year,
    student_number,
    birth_year,
    gender,
    study_program_id,
    program_direction_id,
    origin_region_id,
    origin_municipality
)
VALUES
(
    'ΑΔ1234',
    'Παπαδόπουλος',
    'Γιάννης',
    'Κωνσταντίνος',
    7.85,
    '2024-06-15',
    '2024-07-20',
    2020,
    '20201234',
    2002,
    'M',
    1,
    1,
    4,
    'Πάτρα'
),
(
    'ΑΔ5678',
    'Ιωάννου',
    'Μαρία',
    'Δημήτριος',
    8.65,
    '2025-06-10',
    '2025-07-15',
    2021,
    '20211234',
    2003,
    'F',
    1,
    2,
    4,
    'Πάτρα'
);

-- =========================
-- ACTIVITY LOGS
-- =========================
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
VALUES
(1, 'create_graduate', 'graduate', 1, JSON_OBJECT('student_number', '20201234')),
(1, 'create_graduate', 'graduate', 2, JSON_OBJECT('student_number', '20211234'));
