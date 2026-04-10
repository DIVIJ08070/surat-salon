export const INSERT_REFRESH_TOKEN = `
  INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
  VALUES (?, ?, ?)
`;

export const FIND_ACTIVE_REFRESH_TOKENS = `
  SELECT id, token_hash, status
  FROM refresh_tokens
  WHERE user_id = ? AND status = 1
`;

export const FIND_ALL_REFRESH_TOKENS_BY_USER = `
  SELECT id, token_hash, status
  FROM refresh_tokens
  WHERE user_id = ?
`;

export const REVOKE_REFRESH_TOKEN = `
  UPDATE refresh_tokens SET status = 0 WHERE id = ?
`;

export const INSERT_BLACKLISTED_TOKEN = `
  INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?)
`;
