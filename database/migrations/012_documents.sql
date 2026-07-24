CREATE TABLE fm_document (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  vehicle_id BIGINT UNSIGNED NULL,
  driver_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  document_type VARCHAR(80) NULL,
  file_url VARCHAR(500) NOT NULL,
  expires_at DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_document_company_expiry (company_id, expires_at),
  CONSTRAINT fk_document_company FOREIGN KEY (company_id) REFERENCES fm_company(id),
  CONSTRAINT fk_document_vehicle FOREIGN KEY (vehicle_id) REFERENCES fm_vehicle(id),
  CONSTRAINT fk_document_driver FOREIGN KEY (driver_id) REFERENCES fm_driver(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
