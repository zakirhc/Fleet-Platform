CREATE TABLE fm_whatsapp_account (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    phone_number_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(150) NULL,
    access_token_ciphertext TEXT NOT NULL,
    verify_token_ciphertext TEXT NOT NULL,
    app_secret_ciphertext TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_whatsapp_account_phone_number (phone_number_id),
    INDEX idx_whatsapp_account_company (company_id),
    CONSTRAINT fk_whatsapp_account_company
        FOREIGN KEY (company_id) REFERENCES fm_company(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fm_whatsapp_message (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    direction ENUM('INBOUND', 'OUTBOUND') NOT NULL,
    recipient VARCHAR(32) NOT NULL,
    body TEXT NOT NULL,
    status ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'RECEIVED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    provider_message_id VARCHAR(128) NULL,
    error_message TEXT NULL,
    sent_at DATETIME NULL,
    delivered_at DATETIME NULL,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_whatsapp_message_provider (provider_message_id),
    INDEX idx_whatsapp_message_company_created (company_id, created_at),
    INDEX idx_whatsapp_message_account_created (account_id, created_at),
    CONSTRAINT fk_whatsapp_message_company
        FOREIGN KEY (company_id) REFERENCES fm_company(id),
    CONSTRAINT fk_whatsapp_message_account
        FOREIGN KEY (account_id) REFERENCES fm_whatsapp_account(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
