export const FIND_STYLIST_SHIFT = `
  SELECT id, shift_start, shift_end, working_days
  FROM stylists
  WHERE id = ? AND status = 1
`;

export const FIND_APPROVED_LEAVES_IN_RANGE = `
  SELECT DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date
  FROM stylist_leaves
  WHERE stylist_id = ? AND leave_status = 'approved' AND status = 1
  AND leave_date BETWEEN ? AND ?
`;

export const CHECK_SLOT_EXISTS = `
  SELECT id FROM time_slots
  WHERE stylist_id = ? AND slot_date = ? AND start_time = ? AND status = 1
`;

export const INSERT_TIME_SLOT = `
  INSERT INTO time_slots (stylist_id, slot_date, start_time, end_time, slot_status)
  VALUES (?, ?, ?, ?, ?)
`;

export const COUNT_TIME_SLOTS_WITH_FILTERS = (whereSql: string) => `
  SELECT COUNT(*) AS total FROM time_slots ts ${whereSql}
`;

export const FIND_ALL_TIME_SLOTS = (whereSql: string) => `
  SELECT ts.id, ts.stylist_id, s.name AS stylist_name,
         ts.slot_date, ts.start_time, ts.end_time, ts.slot_status,
         ts.block_reason, ts.appointment_id
  FROM time_slots ts
  JOIN stylists s ON s.id = ts.stylist_id
  ${whereSql}
  ORDER BY ts.slot_date ASC, ts.start_time ASC
  LIMIT ? OFFSET ?
`;

export const FIND_TIME_SLOT_BY_ID = `
  SELECT ts.id, ts.stylist_id, s.name AS stylist_name,
         ts.slot_date, ts.start_time, ts.end_time, ts.slot_status,
         ts.block_reason, ts.appointment_id
  FROM time_slots ts
  JOIN stylists s ON s.id = ts.stylist_id
  WHERE ts.id = ? AND ts.status = 1
`;

export const REMOVE_AVAILABLE_SLOTS_FOR_DATE = `
  UPDATE time_slots SET status = 127
  WHERE stylist_id = ? AND slot_date = ? AND slot_status = 'available' AND status = 1
`;

export const FIND_AVAILABLE_SLOTS = `
  SELECT id, start_time, end_time, slot_status
  FROM time_slots
  WHERE stylist_id = ? AND slot_date = ? AND slot_status = 'available' AND status = 1
  ORDER BY start_time ASC
`;

export const FIND_AVAILABLE_SLOTS_IN_MONTH = `
  SELECT id, slot_date, start_time, end_time, slot_status 
  FROM time_slots 
  WHERE stylist_id = ? AND slot_date LIKE ? AND slot_status = 'available' AND status = 1
  ORDER BY slot_date ASC, start_time ASC
`;
