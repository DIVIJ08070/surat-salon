export const GENERATE_APPOINTMENT_NUMBER = (year: number) => `
  SELECT MAX(CAST(SUBSTRING_INDEX(appointment_number, '-', -1) AS UNSIGNED)) AS max_num
  FROM appointments
  WHERE appointment_number REGEXP '^APT-${year}-[0-9]+$'
`;

export const CHECK_APPOINTMENT_CUSTOMER_EXISTS = `
  SELECT id FROM customers WHERE id = ? AND status = 1
`;

export const CHECK_APPOINTMENT_STYLIST_EXISTS = `
  SELECT id FROM stylists WHERE id = ? AND status = 1
`;

export const CHECK_STYLIST_ON_LEAVE = `
  SELECT id FROM stylist_leaves
  WHERE stylist_id = ? AND leave_date = ? AND leave_status = 'approved' AND status = 1
`;

export const FIND_SERVICES_FOR_BOOKING = (placeholders: string) => `
  SELECT s.id, s.name, s.price, s.duration_minutes, s.is_available
  FROM services s
  WHERE s.id IN (${placeholders}) AND s.status = 1
`;

export const CHECK_STYLIST_CAN_DO_SERVICES = (placeholders: string) => `
  SELECT service_id FROM stylist_services
  WHERE stylist_id = ? AND service_id IN (${placeholders}) AND status = 1
`;

export const FIND_AVAILABLE_SLOTS_FOR_BOOKING = (placeholders: string) => `
  SELECT id, TIME_FORMAT(start_time, '%H:%i:%s') AS start_time, slot_status 
  FROM time_slots
  WHERE stylist_id = ? AND slot_date = ? AND TIME_FORMAT(start_time, '%H:%i:%s') IN (${placeholders})
  AND slot_status = 'available' AND status = 1
  FOR UPDATE
`;

export const INSERT_APPOINTMENT = `
  INSERT INTO appointments
  (appointment_number, customer_id, stylist_id, appointment_date, start_time, end_time, total_duration_minutes, total_amount, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const FIND_APPOINTMENT_ID_BY_NUMBER = `
  SELECT id FROM appointments WHERE appointment_number = ?
`;

export const INSERT_APPOINTMENT_SERVICE = `
  INSERT INTO appointment_services (appointment_id, service_id, price_at_booking, duration_minutes)
  VALUES (?, ?, ?, ?)
`;

export const BLOCK_TIME_SLOTS = (placeholders: string) => `
  UPDATE time_slots SET slot_status = ?, block_reason = ?, appointment_id = ?
  WHERE id IN (${placeholders})
`;

export const COUNT_ALL_APPOINTMENTS = `
  SELECT COUNT(*) AS total FROM appointments a
`;

export const FIND_ALL_APPOINTMENTS = (whereSql: string) => `
  SELECT a.id, a.appointment_number, a.appointment_date, a.start_time, a.end_time,
         a.total_duration_minutes, a.total_amount, a.appointment_status, a.notes, a.created_at,
         c.name AS customer_name, c.phone AS customer_phone, c.customer_code,
         st.name AS stylist_name
  FROM appointments a
  JOIN customers c ON c.id = a.customer_id
  JOIN stylists st ON st.id = a.stylist_id
  ${whereSql}
  ORDER BY a.appointment_date DESC, a.start_time DESC
  LIMIT ? OFFSET ?
`;

export const FIND_APPOINTMENT_BY_ID = `
  SELECT a.id, a.appointment_number, a.appointment_date, a.start_time, a.end_time,
         a.total_duration_minutes, a.total_amount, a.appointment_status, a.notes, a.created_at,
         c.name AS customer_name, c.customer_code, c.phone AS customer_phone,
         st.name AS stylist_name
  FROM appointments a
  JOIN customers c ON c.id = a.customer_id
  JOIN stylists st ON st.id = a.stylist_id
  WHERE a.id = ? AND a.status = 1
`;

export const FIND_APPOINTMENT_SERVICES = `
  SELECT aps.id, s.name AS service_name, s.service_code,
         aps.price_at_booking, aps.duration_minutes, aps.appointment_service_status
  FROM appointment_services aps
  JOIN services s ON s.id = aps.service_id
  WHERE aps.appointment_id = ? AND aps.status = 1
`;

export const FIND_STYLIST_DAILY_SCHEDULE = `
  SELECT a.id, a.appointment_number, a.appointment_date, a.start_time, a.end_time,
         a.total_duration_minutes, a.total_amount, a.appointment_status,
         c.name AS customer_name, c.phone AS customer_phone,
         GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') AS services
  FROM appointments a
  JOIN customers c ON c.id = a.customer_id
  JOIN appointment_services aps ON aps.appointment_id = a.id AND aps.status = 1
  JOIN services s ON s.id = aps.service_id
  WHERE a.stylist_id = ? AND a.appointment_date = ? AND a.status = 1
  GROUP BY a.id
  ORDER BY a.start_time ASC
`;

export const COMPLETE_APPOINTMENT_SERVICE = `
  UPDATE appointment_services
  SET appointment_service_status = ?
  WHERE id = ? AND status = 1
`;

export const COUNT_PENDING_APPOINTMENT_SERVICES = `
  SELECT COUNT(*) AS cnt FROM appointment_services
  WHERE appointment_id = ? AND appointment_service_status = 'pending' AND status = 1
`;

export const COMPLETE_APPOINTMENT = `
  UPDATE appointments SET appointment_status = ? WHERE id = ?
`;

export const RELEASE_APPOINTMENT_SLOTS = `
  UPDATE time_slots
  SET slot_status = 'available', block_reason = NULL, appointment_id = NULL
  WHERE appointment_id = ? AND status = 1
`;

export const CANCEL_APPOINTMENT = `
  UPDATE appointments SET appointment_status = ? WHERE id = ?
`;

export const MARK_APPOINTMENT_NO_SHOW = `
  UPDATE appointments SET appointment_status = ? WHERE id = ?
`;
