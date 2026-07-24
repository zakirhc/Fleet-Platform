CREATE TABLE fm_vehicle_device (
    vehicle_id BIGINT UNSIGNED NOT NULL,
    tc_device_id BIGINT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (vehicle_id),
    CONSTRAINT fm_vehicle_device_ibfk_1
        FOREIGN KEY (vehicle_id) REFERENCES fm_vehicle(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
