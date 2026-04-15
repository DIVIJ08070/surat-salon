export const GENERATE_BILL_NUMBER = (year: number) => `
  SELECT MAX(CAST(SUBSTRING_INDEX(bill_number, '-', -1) AS UNSIGNED)) AS max_num
  FROM bills
  WHERE bill_number REGEXP '^BILL-${year}-[0-9]+$'
`;

export const CHECK_APPOINTMENT_FOR_BILL = `
  SELECT id, appointment_status, total_amount
  FROM appointments
  WHERE id = ? AND status = 1
`;

export const CHECK_BILL_ALREADY_EXISTS = `
  SELECT id FROM bills WHERE appointment_id = ? AND status = 1
`;

export const GET_STYLIST_COMMISSION_RATE = `
  SELECT st.commission_rate
  FROM appointments a
  JOIN stylists st ON st.id = a.stylist_id
  WHERE a.id = ? AND a.status = 1
  LIMIT 1
`;

export const INSERT_BILL = `
  INSERT INTO bills (appointment_id, bill_number, subtotal, discount, tax, total, commission_amount, bill_status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

export const BILL_DETAIL_SELECT = `
  SELECT b.id, b.bill_number, b.subtotal, b.discount AS discount_amount, b.tax AS tax_amount, b.total AS total_amount,
         b.commission_amount, b.payment_method, b.bill_status, b.paid_at, b.created_at,
         a.appointment_number, a.appointment_date, a.start_time,
         c.name AS customer_name, c.phone AS customer_phone, c.customer_code,
         st.name AS stylist_name
  FROM bills b
  JOIN appointments a ON a.id = b.appointment_id
  JOIN customers c ON c.id = a.customer_id
  JOIN stylists st ON st.id = a.stylist_id
`;

export const FIND_BILL_BY_NUMBER = `
  SELECT b.id, b.bill_number, b.subtotal, b.discount AS discount_amount, b.tax AS tax_amount, b.total AS total_amount,
         b.commission_amount, b.payment_method, b.bill_status, b.paid_at, b.created_at,
         a.appointment_number, a.appointment_date, a.start_time,
         c.name AS customer_name, c.phone AS customer_phone, c.customer_code,
         st.name AS stylist_name
  FROM bills b
  JOIN appointments a ON a.id = b.appointment_id
  JOIN customers c ON c.id = a.customer_id
  JOIN stylists st ON st.id = a.stylist_id
  WHERE b.bill_number = ?
`;

export const FIND_BILL_BY_ID = `
  SELECT b.id, b.bill_number, b.subtotal, b.discount AS discount_amount, b.tax AS tax_amount, b.total AS total_amount,
         b.commission_amount, b.payment_method, b.bill_status, b.paid_at, b.created_at,
         a.appointment_number, a.appointment_date, a.start_time,
         c.name AS customer_name, c.phone AS customer_phone, c.customer_code,
         st.name AS stylist_name
  FROM bills b
  JOIN appointments a ON a.id = b.appointment_id
  JOIN customers c ON c.id = a.customer_id
  JOIN stylists st ON st.id = a.stylist_id
  WHERE b.id = ? AND b.status = 1
`;

export const FIND_BILL_BY_APPOINTMENT = `
  SELECT b.id, b.bill_number, b.subtotal, b.discount AS discount_amount, b.tax AS tax_amount, b.total AS total_amount,
         b.commission_amount, b.payment_method, b.bill_status, b.paid_at, b.created_at,
         a.appointment_number, a.appointment_date, a.start_time,
         c.name AS customer_name, c.phone AS customer_phone, c.customer_code,
         st.name AS stylist_name
  FROM bills b
  JOIN appointments a ON a.id = b.appointment_id
  JOIN customers c ON c.id = a.customer_id
  JOIN stylists st ON st.id = a.stylist_id
  WHERE b.appointment_id = ? AND b.status = 1
`;

export const COUNT_ALL_BILLS = `
  SELECT COUNT(*) AS total FROM bills b WHERE b.status = 1
`;

export const FIND_ALL_BILLS = (whereSql: string) => `
  SELECT b.id, b.bill_number, b.subtotal, b.discount AS discount_amount, b.tax AS tax_amount, b.total AS total_amount,
         b.commission_amount, b.payment_method, b.bill_status, b.paid_at, b.created_at,
         a.appointment_number, a.appointment_date,
         c.name AS customer_name, c.customer_code,
         st.name AS stylist_name
  FROM bills b
  JOIN appointments a ON a.id = b.appointment_id
  JOIN customers c ON c.id = a.customer_id
  JOIN stylists st ON st.id = a.stylist_id
  ${whereSql}
  ORDER BY b.created_at DESC
  LIMIT ? OFFSET ?
`;

export const PAY_BILL = `
  UPDATE bills SET bill_status = ?, payment_method = ?, paid_at = NOW()
  WHERE id = ?
`;

export const REFUND_BILL = `
  UPDATE bills SET bill_status = ? WHERE id = ?
`;
