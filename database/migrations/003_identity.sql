CREATE TABLE fm_user (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    uuid CHAR(36) NOT NULL,

    company_id BIGINT UNSIGNED NOT NULL,

    username VARCHAR(100) NOT NULL,

    email VARCHAR(150),

    password_hash VARCHAR(255) NOT NULL,

    full_name VARCHAR(150),

    phone VARCHAR(30),

    status ENUM(
        'ACTIVE',
        'INACTIVE',
        'LOCKED'
    ) NOT NULL DEFAULT 'ACTIVE',

    last_login_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uuid (uuid),
    UNIQUE KEY username (username),

    CONSTRAINT fk_user_company
        FOREIGN KEY(company_id)
        REFERENCES fm_company(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fm_user_role (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_userrole_user
        FOREIGN KEY (user_id) REFERENCES fm_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_userrole_role
        FOREIGN KEY (role_id) REFERENCES fm_role(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fm_role_permission (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rolepermission_role
        FOREIGN KEY (role_id) REFERENCES fm_role(id) ON DELETE CASCADE,
    CONSTRAINT fk_rolepermission_permission
        FOREIGN KEY (permission_id) REFERENCES fm_permission(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
