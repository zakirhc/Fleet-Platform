CREATE TABLE fm_role (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_role_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fm_permission (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_permission_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO fm_role(code, name) VALUES
('SUPER_ADMIN', 'Super Administrator'),
('COMPANY_ADMIN', 'Company Administrator'),
('DISPATCHER', 'Dispatcher'),
('DRIVER', 'Driver'),
('VIEWER', 'Viewer');

INSERT INTO fm_permission(code, name) VALUES
('company.read', 'View Company'),
('company.write', 'Manage Company'),
('user.read', 'View Users'),
('user.write', 'Manage Users'),
('vehicle.read', 'View Vehicles'),
('vehicle.write', 'Manage Vehicles'),
('tracking.live', 'Live Tracking');
