CREATE TABLE fm_mobile_device (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'ANDROID',
  fcm_token VARCHAR(512) NOT NULL,
  device_name VARCHAR(150) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_mobile_device_fcm_token (fcm_token),
  KEY idx_mobile_device_company_active (company_id, active),
  KEY idx_mobile_device_user_active (user_id, active),
  CONSTRAINT fk_mobile_device_company FOREIGN KEY (company_id) REFERENCES fm_company(id),
  CONSTRAINT fk_mobile_device_user FOREIGN KEY (user_id) REFERENCES fm_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
