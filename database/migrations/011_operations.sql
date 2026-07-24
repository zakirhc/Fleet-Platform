CREATE TABLE fm_maintenance_schedule (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, vehicle_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(150) NOT NULL, interval_days INT NULL, due_date DATE NULL, due_odometer DOUBLE NULL, active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id), KEY idx_maintenance_schedule_company_active(company_id, active), KEY idx_maintenance_schedule_vehicle(vehicle_id),
 CONSTRAINT fk_maintenance_schedule_company FOREIGN KEY(company_id) REFERENCES fm_company(id), CONSTRAINT fk_maintenance_schedule_vehicle FOREIGN KEY(vehicle_id) REFERENCES fm_vehicle(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE fm_work_order (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, vehicle_id BIGINT UNSIGNED NOT NULL, schedule_id BIGINT UNSIGNED NULL,
 number VARCHAR(50) NOT NULL, title VARCHAR(150) NOT NULL, status ENUM('OPEN','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'OPEN', vendor VARCHAR(150) NULL,
 opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME NULL, estimated_cost DECIMAL(12,2) NULL, actual_cost DECIMAL(12,2) NULL, notes TEXT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id), UNIQUE KEY uk_work_order_company_number(company_id, number), KEY idx_work_order_vehicle_status(vehicle_id,status),
 CONSTRAINT fk_work_order_company FOREIGN KEY(company_id) REFERENCES fm_company(id), CONSTRAINT fk_work_order_vehicle FOREIGN KEY(vehicle_id) REFERENCES fm_vehicle(id), CONSTRAINT fk_work_order_schedule FOREIGN KEY(schedule_id) REFERENCES fm_maintenance_schedule(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE fm_fuel_record (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, vehicle_id BIGINT UNSIGNED NOT NULL, filled_at DATETIME NOT NULL,
 litres DECIMAL(10,3) NOT NULL, total_amount DECIMAL(12,2) NOT NULL, odometer DOUBLE NULL, station VARCHAR(150) NULL, notes TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id), KEY idx_fuel_record_company_date(company_id,filled_at), KEY idx_fuel_record_vehicle_date(vehicle_id,filled_at),
 CONSTRAINT fk_fuel_record_company FOREIGN KEY(company_id) REFERENCES fm_company(id), CONSTRAINT fk_fuel_record_vehicle FOREIGN KEY(vehicle_id) REFERENCES fm_vehicle(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE fm_expense_record (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, vehicle_id BIGINT UNSIGNED NULL, category VARCHAR(80) NOT NULL, expense_date DATE NOT NULL,
 amount DECIMAL(12,2) NOT NULL, vendor VARCHAR(150) NULL, description TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id), KEY idx_expense_record_company_date(company_id,expense_date),
 CONSTRAINT fk_expense_record_company FOREIGN KEY(company_id) REFERENCES fm_company(id), CONSTRAINT fk_expense_record_vehicle FOREIGN KEY(vehicle_id) REFERENCES fm_vehicle(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE fm_report_schedule (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, company_id BIGINT UNSIGNED NOT NULL, report_type ENUM('UTILISATION','TRIPS','IDLING','OVERSPEED','DRIVER_BEHAVIOUR','FUEL_EXPENSE') NOT NULL,
 frequency ENUM('DAILY','WEEKLY','MONTHLY') NOT NULL, recipient VARCHAR(150) NULL, active TINYINT(1) NOT NULL DEFAULT 1, last_run_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id), KEY idx_report_schedule_company_active(company_id,active), CONSTRAINT fk_report_schedule_company FOREIGN KEY(company_id) REFERENCES fm_company(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
