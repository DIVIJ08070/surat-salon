export const INSERT_STYLIST = `
  INSERT INTO stylists (name, specialisation, working_days, shift_start, shift_end, commission_rate, user_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;

export const COUNT_ALL_STYLISTS = `
  SELECT COUNT(*) AS total FROM stylists
`;

export const FIND_ALL_STYLISTS_BASE = `
  SELECT id, name, specialisation, working_days, shift_start, shift_end, stylist_status, user_id, created_at
  FROM stylists
  WHERE status = 1
  ORDER BY name ASC
  LIMIT ? OFFSET ?
`;

export const FIND_ALL_STYLISTS_ADMIN = `
  SELECT id, name, specialisation, working_days, shift_start, shift_end, stylist_status, commission_rate, user_id, created_at
  FROM stylists
  WHERE status = 1
  ORDER BY name ASC
  LIMIT ? OFFSET ?
`;

export const FIND_STYLIST_BY_ID_BASE = `
  SELECT id, name, specialisation, working_days, shift_start, shift_end, stylist_status, user_id, created_at
  FROM stylists
  WHERE id = ? AND status = 1
`;

export const FIND_STYLIST_BY_ID_ADMIN = `
  SELECT id, name, specialisation, working_days, shift_start, shift_end, stylist_status, commission_rate, user_id, created_at
  FROM stylists
  WHERE id = ? AND status = 1
`;

export const CHECK_STYLIST_EXISTS = `
  SELECT id FROM stylists WHERE id = ? AND status = 1
`;

export const DELETE_STYLIST = `
  UPDATE stylists SET status = 127 WHERE id = ?
`;

export const CHECK_SERVICE_IDS_VALID = (placeholders: string) => `
  SELECT id FROM services WHERE id IN (${placeholders}) AND status = 1
`;

export const INSERT_STYLIST_SERVICE = `
  INSERT INTO stylist_services (stylist_id, service_id)
  SELECT ?, ? FROM DUAL
  WHERE NOT EXISTS (
    SELECT 1 FROM stylist_services WHERE stylist_id = ? AND service_id = ? AND status = 1
  )
`;

export const FIND_STYLIST_SERVICES = `
  SELECT s.id, s.service_code, s.name, s.category, s.duration_minutes,
         s.price, s.gender, s.description, s.is_available
  FROM stylist_services ss
  JOIN services s ON s.id = ss.service_id
  WHERE ss.stylist_id = ? AND ss.status = 1 AND s.status = 1
  ORDER BY s.category ASC, s.name ASC
`;

export const CHECK_STYLIST_SERVICE_ASSIGNED = `
  SELECT id FROM stylist_services WHERE stylist_id = ? AND service_id = ? AND status = 1
`;

export const REMOVE_STYLIST_SERVICE = `
  UPDATE stylist_services SET status = 127 WHERE stylist_id = ? AND service_id = ?
`;

export const CHECK_STYLIST_CAN_DO_SERVICES = (placeholders: string) => `
  SELECT service_id FROM stylist_services
  WHERE stylist_id = ? AND service_id IN (${placeholders}) AND status = 1
`;

export const UPDATE_STYLIST = (fields: string[]) => `
  UPDATE stylists SET ${fields.join(', ')} WHERE id = ?
`;

export const FIND_ALL_ACTIVE_STYLIST_IDS = `
  SELECT id FROM stylists WHERE status = 1
`;

export const FIND_STYLIST_BY_USER_ID = `
  SELECT id, name, specialisation, working_days, shift_start, shift_end, stylist_status, commission_rate, user_id, created_at
  FROM stylists
  WHERE user_id = ? AND status = 1
  LIMIT 1
`;
