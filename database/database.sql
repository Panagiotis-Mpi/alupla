DROP DATABASE IF EXISTS alupla;
CREATE DATABASE alupla CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alupla;

-- =====================================
-- USERS (super admin / γραμματεία)
-- =====================================

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('super_admin', 'secretariat') NOT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    email_verified  TINYINT(1) NOT NULL DEFAULT 0,

    email_verification_token   CHAR(64),
    email_verification_expires DATETIME,
    password_reset_token       CHAR(64),
    password_reset_expires     DATETIME,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role ON users (role);


-- =====================================
-- STUDY PROGRAMS
-- =====================================

CREATE TABLE study_programs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code    VARCHAR(50) NOT NULL UNIQUE,
    name_el VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================
-- PROGRAM DIRECTIONS
-- =====================================

CREATE TABLE program_directions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    study_program_id INT UNSIGNED NOT NULL,
    code    VARCHAR(50) NOT NULL,
    name_el VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    is_active TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT fk_program_directions_program
        FOREIGN KEY (study_program_id) REFERENCES study_programs(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_program_direction (study_program_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_program_directions_program
    ON program_directions (study_program_id);


-- =====================================
-- REGIONS (ιεραρχία περιοχών Ελλάδας)
-- PERIPHERY -> DIMOS -> CITY
-- =====================================

CREATE TABLE regions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('PERIPHERY','NOMOS','DIMOS','CITY') NOT NULL,
    parent_id INT UNSIGNED NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_regions_parent
        FOREIGN KEY (parent_id) REFERENCES regions(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_regions_parent ON regions(parent_id);
CREATE INDEX idx_regions_type   ON regions(type);
CREATE INDEX idx_regions_name   ON regions(name);


-- =====================================
-- GRADUATES (στοιχεία αποφοίτων)
-- =====================================

CREATE TABLE graduates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ad_code          VARCHAR(20) NOT NULL,       -- Α.Δ.
    last_name        VARCHAR(100) NOT NULL,      -- ΕΠΩΝΥΜΟ
    first_name       VARCHAR(100) NOT NULL,      -- ΟΝΟΜΑ
    father_name      VARCHAR(100) NOT NULL,      -- ΠΑΤΡΩΝΥΜΟ
    degree_grade     DECIMAL(4,2) NOT NULL,      -- ΒΑΘΜ. ΔΙΠΛ.
    graduation_date  DATE NOT NULL,              -- ΗΜΕΡΟΜΗΝΙΑ ΛΗΨΗΣ ΔΙΠΛΩΜΑΤΟΣ
    oath_date        DATE NOT NULL,              -- ΗΜΕΡΟΜΗΝΙΑ ΟΡΚΩΜΟΣΙΑΣ
    entry_year       SMALLINT NOT NULL,          -- ΕΤΟΣ ΕΓΓΡΑΦΗΣ
    student_number   VARCHAR(50) NOT NULL,       -- ΑΜ
    birth_year       SMALLINT NOT NULL,          -- ΕΤΟΣ ΓΕΝΝΗΣΗΣ
    gender ENUM('M','F') NOT NULL,               -- Φύλο

    study_program_id      INT UNSIGNED NOT NULL, -- Πρόγραμμα σπουδών
    program_direction_id  INT UNSIGNED NULL,     -- Κατεύθυνση (προαιρετικά)

    -- Ιεραρχική περιοχή
    origin_region_id INT UNSIGNED NULL,
    origin_municipality VARCHAR(150) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_graduates_program
        FOREIGN KEY (study_program_id) REFERENCES study_programs(id),

    CONSTRAINT fk_graduates_direction
        FOREIGN KEY (program_direction_id) REFERENCES program_directions(id),

    CONSTRAINT fk_graduates_origin_region
        FOREIGN KEY (origin_region_id) REFERENCES regions(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes για αναζητήσεις & στατιστικά
CREATE INDEX idx_graduates_grad_date      ON graduates (graduation_date);
CREATE INDEX idx_graduates_entry_year     ON graduates (entry_year);
CREATE INDEX idx_graduates_gender         ON graduates (gender);
CREATE INDEX idx_graduates_program        ON graduates (study_program_id);
CREATE INDEX idx_graduates_direction      ON graduates (program_direction_id);
CREATE INDEX idx_graduates_origin_region  ON graduates (origin_region_id);

-- (προαιρετικό αλλά πολύ χρήσιμο)
-- ALTER TABLE graduates ADD UNIQUE KEY uk_graduates_student_number (student_number);


-- =====================================
-- ACTIVITY LOGS
-- =====================================

CREATE TABLE activity_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INT UNSIGNED,
    details     JSON,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_activity_logs_user
    ON activity_logs (user_id, created_at);
