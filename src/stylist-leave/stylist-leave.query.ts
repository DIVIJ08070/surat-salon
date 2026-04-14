export const CHECK_STYLIST_FOR_LEAVE = `
  SELECT id FROM stylists WHERE id = ? AND status = 1
`;

export const CHECK_DUPLICATE_LEAVE = `
  SELECT id FROM stylist_leaves
  WHERE stylist_id = ? AND leave_date = ?
  AND leave_status IN ('pending', 'approved') AND status = 1
`;

export const INSERT_STYLIST_LEAVE = `
  INSERT INTO stylist_leaves (stylist_id, leave_date, leave_start, leave_end, reason, status)
  VALUES (?, ?, ?, ?, ?, 1)
`;

export const FIND_LEAVE_AFTER_INSERT = `
  SELECT sl.id, sl.stylist_id, sl.leave_date, sl.leave_start, sl.leave_end,
         sl.leave_status, sl.reason, sl.status, sl.created_at,
         s.name AS stylist_name
  FROM stylist_leaves sl
  JOIN stylists s ON s.id = sl.stylist_id
  ORDER BY sl.id DESC
  LIMIT 1
`;

export const FIND_ALL_LEAVES = `
  SELECT sl.id, sl.stylist_id, sl.leave_date, sl.leave_start, sl.leave_end,
         sl.leave_status, sl.reason, sl.status, sl.created_at,
         s.name AS stylist_name
  FROM stylist_leaves sl
  JOIN stylists s ON s.id = sl.stylist_id
  WHERE sl.status = 1
  ORDER BY sl.leave_date DESC
`;

export const FIND_LEAVES_BY_STYLIST = `
  SELECT sl.id, sl.stylist_id, sl.leave_date, sl.leave_start, sl.leave_end,
         sl.leave_status, sl.reason, sl.status, sl.created_at,
         s.name AS stylist_name
  FROM stylist_leaves sl
  JOIN stylists s ON s.id = sl.stylist_id
  WHERE sl.stylist_id = ? AND sl.status = 1
  ORDER BY sl.leave_date DESC
`;

export const FIND_LEAVE_BY_ID = `
  SELECT sl.id, sl.stylist_id, sl.leave_date, sl.leave_start, sl.leave_end,
         sl.leave_status, sl.reason, sl.status, sl.created_at,
         s.name AS stylist_name
  FROM stylist_leaves sl
  JOIN stylists s ON s.id = sl.stylist_id
  WHERE sl.id = ? AND sl.status = 1
`;

export const APPROVE_LEAVE = `
  UPDATE stylist_leaves SET leave_status = 'approved' WHERE id = ?
`;

export const REJECT_LEAVE = `
  UPDATE stylist_leaves SET leave_status = 'rejected' WHERE id = ?
`;

export const CANCEL_LEAVE = `
  UPDATE stylist_leaves SET leave_status = 'rejected', status = 0 WHERE id = ?
`;

export const SET_STYLIST_ON_LEAVE = `
  UPDATE stylists SET stylist_status = 'on_leave' WHERE id = ?
`;

export const SET_STYLIST_ACTIVE = `
  UPDATE stylists SET stylist_status = 'active' WHERE id = ?
`;

export const BLOCK_SLOTS_PARTIAL_LEAVE = `
  UPDATE time_slots SET slot_status = ?, block_reason = ?
  WHERE stylist_id = ? AND slot_date = ? AND start_time >= ? AND end_time <= ?
  AND slot_status = 'available' AND status = 1
`;

export const BLOCK_SLOTS_FULL_DAY_LEAVE = `
  UPDATE time_slots SET slot_status = ?, block_reason = ?
  WHERE stylist_id = ? AND slot_date = ? AND slot_status = 'available' AND status = 1
`;

export const RELEASE_SLOTS_ON_REVOKE = `
  UPDATE time_slots
  SET slot_status = 'available', block_reason = NULL
  WHERE stylist_id = ? AND slot_date = ? AND block_reason = 'leave' AND status = 1
`;
