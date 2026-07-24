-- Apply once to installations that already have the pre-Driver-module fm_driver table.
-- Fresh installations use 006_driver.sql and do not need this migration.
ALTER TABLE fm_driver
    ADD COLUMN uuid CHAR(36) NULL AFTER id,
    CHANGE COLUMN driver_name full_name VARCHAR(150) NOT NULL,
    ADD COLUMN designation VARCHAR(100) NULL AFTER full_name,
    ADD COLUMN department VARCHAR(100) NULL AFTER designation,
    MODIFY COLUMN mobile VARCHAR(30) NULL,
    MODIFY COLUMN email VARCHAR(150) NULL,
    ADD COLUMN license_type VARCHAR(30) NULL AFTER license_no,
    ADD COLUMN license_issue_date DATE NULL AFTER license_type,
    ADD COLUMN passport_no VARCHAR(30) NULL AFTER nid,
    ADD COLUMN blood_group VARCHAR(5) NULL AFTER passport_no,
    ADD COLUMN date_of_birth DATE NULL AFTER blood_group,
    ADD COLUMN joining_date DATE NULL AFTER date_of_birth,
    CHANGE COLUMN emergency_contact emergency_name VARCHAR(150) NULL,
    ADD COLUMN emergency_phone VARCHAR(30) NULL AFTER emergency_name,
    ADD COLUMN photo VARCHAR(255) NULL AFTER emergency_phone,
    ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER remarks,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    ADD COLUMN deleted_by BIGINT UNSIGNED NULL AFTER updated_by;

UPDATE fm_driver SET uuid = UUID() WHERE uuid IS NULL;

ALTER TABLE fm_driver
    MODIFY COLUMN uuid CHAR(36) NOT NULL,
    ADD UNIQUE KEY uk_driver_uuid (uuid);
