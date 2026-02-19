-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 16, 2026 at 02:09 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `alupla`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(10) UNSIGNED DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES
(1, 1, 'create_graduate', 'graduate', 1, '{\"student_number\": \"20201234\"}', '2026-02-12 13:40:44'),
(2, 1, 'create_graduate', 'graduate', 2, '{\"student_number\": \"20211234\"}', '2026-02-12 13:40:44'),
(3, 1, 'login', 'system', NULL, NULL, '2026-02-12 15:45:53'),
(4, 1, 'login', 'system', NULL, NULL, '2026-02-12 16:44:22'),
(5, 1, 'login', 'system', NULL, NULL, '2026-02-12 16:45:56'),
(6, 1, 'login', 'system', NULL, NULL, '2026-02-12 17:33:56'),
(7, 2, 'login', 'system', NULL, NULL, '2026-02-12 17:34:17'),
(8, 1, 'login', 'system', NULL, NULL, '2026-02-12 19:03:23'),
(9, 1, 'login', 'system', NULL, NULL, '2026-02-16 11:30:18'),
(10, 1, 'login', 'system', NULL, NULL, '2026-02-16 11:34:55'),
(11, 1, 'login', 'system', NULL, NULL, '2026-02-16 11:47:08'),
(12, 1, 'login', 'system', NULL, NULL, '2026-02-16 11:56:40'),
(13, 1, 'login', 'system', NULL, NULL, '2026-02-16 11:57:13'),
(14, 1, 'login', 'system', NULL, NULL, '2026-02-16 12:06:04'),
(15, 1, 'login', 'system', NULL, NULL, '2026-02-16 12:18:24'),
(16, 1, 'login', 'system', NULL, NULL, '2026-02-16 12:29:08'),
(17, 1, 'login', 'system', NULL, NULL, '2026-02-16 12:36:40'),
(18, 1, 'login', 'system', NULL, NULL, '2026-02-16 12:54:44'),
(19, NULL, 'create_graduate', 'graduate', 3, '{\"student_number\":\"111111\"}', '2026-02-16 12:59:51');

-- --------------------------------------------------------

--
-- Table structure for table `graduates`
--

CREATE TABLE `graduates` (
  `id` int(10) UNSIGNED NOT NULL,
  `ad_code` varchar(20) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `father_name` varchar(100) NOT NULL,
  `degree_grade` decimal(4,2) NOT NULL,
  `graduation_date` date NOT NULL,
  `oath_date` date NOT NULL,
  `entry_year` smallint(6) NOT NULL,
  `student_number` varchar(50) NOT NULL,
  `birth_year` smallint(6) NOT NULL,
  `gender` enum('M','F') NOT NULL,
  `study_program_id` int(10) UNSIGNED NOT NULL,
  `program_direction_id` int(10) UNSIGNED DEFAULT NULL,
  `origin_region_id` int(10) UNSIGNED DEFAULT NULL,
  `origin_municipality` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `graduates`
--

INSERT INTO `graduates` (`id`, `ad_code`, `last_name`, `first_name`, `father_name`, `degree_grade`, `graduation_date`, `oath_date`, `entry_year`, `student_number`, `birth_year`, `gender`, `study_program_id`, `program_direction_id`, `origin_region_id`, `origin_municipality`, `created_at`, `updated_at`) VALUES
(1, 'ΑΔ1234', 'Παπαδόπουλος', 'Γιάννης', 'Κωνσταντίνος', 7.85, '2024-06-15', '2024-07-20', 2020, '20201234', 2002, 'M', 1, 1, 4, 'Πάτρα', '2026-02-12 13:40:43', '2026-02-12 13:40:43'),
(2, 'ΑΔ5678', 'Ιωάννου', 'Μαρία', 'Δημήτριος', 8.65, '2025-06-10', '2025-07-15', 2021, '20211234', 2003, 'F', 1, 2, 4, 'Πάτρα', '2026-02-12 13:40:43', '2026-02-12 13:40:43'),
(3, '111', 'Οικονόμου', 'Μαρία', 'Γιάννης', 10.00, '2026-02-19', '2026-02-26', 2026, '111111', 2000, 'F', 1, NULL, NULL, NULL, '2026-02-16 12:59:51', '2026-02-16 12:59:51');

-- --------------------------------------------------------

--
-- Table structure for table `program_directions`
--

CREATE TABLE `program_directions` (
  `id` int(10) UNSIGNED NOT NULL,
  `study_program_id` int(10) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name_el` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `program_directions`
--

INSERT INTO `program_directions` (`id`, `study_program_id`, `code`, `name_el`, `name_en`, `is_active`) VALUES
(1, 1, 'SW', 'Μηχανική Λογισμικού', 'Software Engineering', 1),
(2, 1, 'HW', 'Υλικό και Συστήματα', 'Hardware and Systems', 1);

-- --------------------------------------------------------

--
-- Table structure for table `regions`
--

CREATE TABLE `regions` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('PERIPHERY','NOMOS','DIMOS','CITY') NOT NULL,
  `parent_id` int(10) UNSIGNED DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `regions`
--

INSERT INTO `regions` (`id`, `name`, `type`, `parent_id`, `latitude`, `longitude`, `created_at`, `updated_at`) VALUES
(1, 'Δυτική Ελλάδα', 'PERIPHERY', NULL, NULL, NULL, '2026-02-12 13:40:43', '2026-02-12 13:40:43'),
(2, 'Αχαΐα', 'NOMOS', 1, NULL, NULL, '2026-02-12 13:40:43', '2026-02-12 13:40:43'),
(3, 'Δήμος Πατρέων', 'DIMOS', 2, NULL, NULL, '2026-02-12 13:40:43', '2026-02-12 13:40:43'),
(4, 'Πάτρα', 'CITY', 3, 38.2466000, 21.7346000, '2026-02-12 13:40:43', '2026-02-12 13:40:43');

-- --------------------------------------------------------

--
-- Table structure for table `study_programs`
--

CREATE TABLE `study_programs` (
  `id` int(10) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name_el` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `study_programs`
--

INSERT INTO `study_programs` (`id`, `code`, `name_el`, `name_en`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'CEID', 'Μηχανικών Η/Υ και Πληροφορικής', 'Computer Engineering and Informatics', 1, '2026-02-12 13:40:43', '2026-02-12 13:40:43');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('super_admin','secretariat') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `email_verification_token` char(64) DEFAULT NULL,
  `email_verification_expires` datetime DEFAULT NULL,
  `password_reset_token` char(64) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `password_hash`, `role`, `is_active`, `email_verified`, `email_verification_token`, `email_verification_expires`, `password_reset_token`, `password_reset_expires`, `created_at`, `updated_at`) VALUES
(1, 'Super', 'Admin', 'admin@alupla.gr', '$2a$10$S8Kxk8jRMLVF3cnRgXI.8uaTY3JtxoztL6s24QJ2pIHhN.3J0PFjK', 'super_admin', 1, 1, NULL, NULL, NULL, NULL, '2026-02-12 13:40:43', '2026-02-12 14:29:10'),
(2, 'Secretariat', 'User', 'secretariat@alupla.gr', '$2a$10$S8Kxk8jRMLVF3cnRgXI.8uaTY3JtxoztL6s24QJ2pIHhN.3J0PFjK', 'secretariat', 1, 1, NULL, NULL, NULL, NULL, '2026-02-12 13:40:43', '2026-02-12 14:28:18',
  last_seen_at TIMESTAMP NULL
);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_logs_user` (`user_id`,`created_at`);

--
-- Indexes for table `graduates`
--
ALTER TABLE `graduates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_graduates_grad_date` (`graduation_date`),
  ADD KEY `idx_graduates_entry_year` (`entry_year`),
  ADD KEY `idx_graduates_gender` (`gender`),
  ADD KEY `idx_graduates_program` (`study_program_id`),
  ADD KEY `idx_graduates_direction` (`program_direction_id`),
  ADD KEY `idx_graduates_origin_region` (`origin_region_id`);

--
-- Indexes for table `program_directions`
--
ALTER TABLE `program_directions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_program_direction` (`study_program_id`,`code`),
  ADD KEY `idx_program_directions_program` (`study_program_id`);

--
-- Indexes for table `regions`
--
ALTER TABLE `regions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_regions_parent` (`parent_id`),
  ADD KEY `idx_regions_type` (`type`),
  ADD KEY `idx_regions_name` (`name`);

--
-- Indexes for table `study_programs`
--
ALTER TABLE `study_programs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `graduates`
--
ALTER TABLE `graduates`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `program_directions`
--
ALTER TABLE `program_directions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `regions`
--
ALTER TABLE `regions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `study_programs`
--
ALTER TABLE `study_programs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `graduates`
--
ALTER TABLE `graduates`
  ADD CONSTRAINT `fk_graduates_direction` FOREIGN KEY (`program_direction_id`) REFERENCES `program_directions` (`id`),
  ADD CONSTRAINT `fk_graduates_origin_region` FOREIGN KEY (`origin_region_id`) REFERENCES `regions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_graduates_program` FOREIGN KEY (`study_program_id`) REFERENCES `study_programs` (`id`);

--
-- Constraints for table `program_directions`
--
ALTER TABLE `program_directions`
  ADD CONSTRAINT `fk_program_directions_program` FOREIGN KEY (`study_program_id`) REFERENCES `study_programs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `regions`
--
ALTER TABLE `regions`
  ADD CONSTRAINT `fk_regions_parent` FOREIGN KEY (`parent_id`) REFERENCES `regions` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
