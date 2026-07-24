CREATE TABLE fm_driver (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    company_id BIGINT UNSIGNED NOT NULL,

    employee_no VARCHAR(30) NULL,
    full_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NULL,
    department VARCHAR(100) NULL,

    mobile VARCHAR(30) NULL,
    email VARCHAR(150) NULL,

    license_no VARCHAR(50) NULL,
    license_type VARCHAR(30) NULL,
    license_issue_date DATE NULL,
    license_expiry DATE NULL,

    nid VARCHAR(30) NULL,
    passport_no VARCHAR(30) NULL,
    blood_group VARCHAR(5) NULL,
    date_of_birth DATE NULL,
    joining_date DATE NULL,

    address TEXT NULL,

    emergency_name VARCHAR(150) NULL,
    emergency_phone VARCHAR(30) NULL,
    photo VARCHAR(255) NULL,

    status ENUM(
        'ACTIVE',
        'INACTIVE',
        'SUSPENDED'
    ) NOT NULL DEFAULT 'ACTIVE',

    remarks TEXT NULL,

    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    deleted_by BIGINT UNSIGNED NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uk_driver_uuid (uuid),

    CONSTRAINT fk_driver_company
        FOREIGN KEY (company_id)
        REFERENCES fm_company(id),

    UNIQUE KEY uk_driver_employee (
        company_id,
        employee_no
    ),

    UNIQUE KEY uk_driver_license (
        company_id,
        license_no
    ),

    INDEX idx_driver_company (company_id),
    INDEX idx_driver_name (full_name),
    INDEX idx_driver_mobile (mobile)
);

CREATE TABLE fm_vehicle_driver (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    driver_id BIGINT UNSIGNED NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at DATETIME NULL,
    assigned_by BIGINT UNSIGNED NULL,
    remarks TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id),

    CONSTRAINT fk_vehicle_driver_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES fm_vehicle(id),
    CONSTRAINT fk_vehicle_driver_driver
        FOREIGN KEY (driver_id) REFERENCES fm_driver(id),

    INDEX idx_vehicle_driver_vehicle (vehicle_id),
    INDEX idx_vehicle_driver_driver (driver_id),
    INDEX idx_vehicle_driver_active (active)
);
