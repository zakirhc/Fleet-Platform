CREATE TABLE fm_geofence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  tc_geofence_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_fm_geofence_company_tc (company_id, tc_geofence_id),
  KEY idx_fm_geofence_company_active (company_id, active),
  CONSTRAINT fk_fm_geofence_company FOREIGN KEY (company_id) REFERENCES fm_company (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fm_alert_rule (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  geofence_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('ENTER', 'EXIT') NOT NULL,
  recipient VARCHAR(32) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_alert_rule_company_active (company_id, active),
  KEY idx_alert_rule_geofence (geofence_id),
  CONSTRAINT fk_alert_rule_company FOREIGN KEY (company_id) REFERENCES fm_company (id),
  CONSTRAINT fk_alert_rule_geofence FOREIGN KEY (geofence_id) REFERENCES fm_geofence (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fm_alert_delivery (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  alert_rule_id BIGINT UNSIGNED NOT NULL,
  tc_event_id INT NOT NULL,
  whatsapp_message_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_alert_delivery_rule_event (alert_rule_id, tc_event_id),
  KEY idx_alert_delivery_created (created_at),
  CONSTRAINT fk_alert_delivery_rule FOREIGN KEY (alert_rule_id) REFERENCES fm_alert_rule (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
