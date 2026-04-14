export const FIND_USER_BY_EMAIL_SAFE = `
  SELECT id, name, email, role, created_at
  FROM users
  WHERE email = ? AND status = 1
  LIMIT 1
`;

export const FIND_USER_BY_ID_SAFE = `
  SELECT id, name, email, role, created_at
  FROM users
  WHERE id = ? AND status = 1
  LIMIT 1
`;

export const FIND_USER_WITH_SECRETS_BY_EMAIL = `
  SELECT *
  FROM users
  WHERE email = ? AND status = 1
  LIMIT 1
`;

export const FIND_USER_WITH_SECRETS_BY_ID = `
  SELECT *
  FROM users
  WHERE id = ? AND status = 1
  LIMIT 1
`;

export const FIND_USER_BY_EMAIL_AFTER_INSERT = `
  SELECT id, name, email, role, created_at
  FROM users
  WHERE email = ?
  LIMIT 1
`;

export const INSERT_USER = `
  INSERT INTO users (name, email, password_hash, role)
  VALUES (?, ?, ?, ?)
`;

export const FIND_ALL_USERS = `
  SELECT id, name, email, role, created_at
  FROM users
  WHERE status = 1
  ORDER BY name ASC
`;

export const UPDATE_USER_FAILED_ATTEMPTS = `
  UPDATE users SET failed_attempts = ? WHERE id = ?
`;

export const RESET_USER_FAILED_ATTEMPTS = `
  UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?
`;

export const LOCK_USER_ACCOUNT = `
  UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?
`;
