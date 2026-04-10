export const GENERATE_SERVICE_CODE = `
  SELECT MAX(CAST(SUBSTRING(service_code, 5) AS UNSIGNED)) AS max_num
  FROM services
  WHERE service_code REGEXP '^SRV-[0-9]+$'
`;

export const INSERT_SERVICE = `
  INSERT INTO services (service_code, name, category, duration_minutes, price, gender, description)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;

export const FIND_SERVICE_BY_CODE = `
  SELECT id, service_code, name, category, duration_minutes, price, gender, description, is_available, created_at
  FROM services
  WHERE service_code = ?
`;

export const COUNT_ALL_SERVICES = `
  SELECT COUNT(*) AS total FROM services
`;

export const FIND_ALL_SERVICES = `
  SELECT id, service_code, name, category, duration_minutes, price, gender, description, is_available, created_at
  FROM services
  WHERE status = 1
  ORDER BY category ASC, name ASC
  LIMIT ? OFFSET ?
`;

export const FIND_SERVICE_BY_ID = `
  SELECT id, service_code, name, category, duration_minutes, price, gender, description, is_available, created_at
  FROM services
  WHERE id = ? AND status = 1
`;

export const TOGGLE_SERVICE_AVAILABILITY = `
  UPDATE services SET is_available = IF(is_available = 1, 0, 1) WHERE id = ?
`;

export const DELETE_SERVICE = `
  UPDATE services SET status = 0 WHERE id = ?
`;

export const UPDATE_SERVICE = (fields: string[]) => `
  UPDATE services SET ${fields.join(', ')} WHERE id = ?
`;
