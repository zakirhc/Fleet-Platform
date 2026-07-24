CREATE TABLE fm_vehicle (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

    company_id BIGINT UNSIGNED NOT NULL,

    traccar_device_id BIGINT UNSIGNED NULL,

    registration_no VARCHAR(50) NOT NULL,

    fleet_no VARCHAR(50),

    vehicle_type_id BIGINT UNSIGNED NULL,

    make VARCHAR(100),

    model VARCHAR(100),

    year SMALLINT,

    chassis_no VARCHAR(100),

    engine_no VARCHAR(100),

    color VARCHAR(30),

    fuel_type VARCHAR(30),

    status ENUM(
        'ACTIVE',
        'INACTIVE',
        'MAINTENANCE'
    ) DEFAULT 'ACTIVE',

    remarks TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    deleted_at DATETIME NULL,

    CONSTRAINT fk_vehicle_company
        FOREIGN KEY(company_id)
        REFERENCES fm_company(id),

    UNIQUE(company_id, registration_no),

    INDEX idx_company(company_id),

    INDEX idx_device(traccar_device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
