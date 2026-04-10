export const GENERATE_CUSTOMER_CODE = (year: number) => `
  SELECT MAX(CAST(SUBSTRING_INDEX(customer_code, '-', -1) AS UNSIGNED)) AS max_num
  FROM customers
  WHERE customer_code REGEXP '^CUST-${year}-[0-9]+$'
`;

export const CHECK_CUSTOMER_PHONE_EXISTS = `
  SELECT id FROM customers WHERE phone = ? AND status = 1
`;

export const CHECK_CUSTOMER_PHONE_CONFLICT = `
  SELECT id FROM customers WHERE phone = ? AND id != ? AND status = 1
`;

export const INSERT_CUSTOMER = `
  INSERT INTO customers (customer_code, name, phone, email, gender, dob)
  VALUES (?, ?, ?, ?, ?, ?)
`;

export const FIND_CUSTOMER_BY_CODE = `
  SELECT id, customer_code, name, phone, email, gender, dob, created_at
  FROM customers
  WHERE customer_code = ?
`;

export const FIND_ALL_CUSTOMERS = `
  SELECT id, customer_code, name, phone, email, gender, dob, created_at
  FROM customers
  WHERE status = 1
  ORDER BY name ASC
`;

export const FIND_ALL_CUSTOMERS_SEARCH = `
  SELECT id, customer_code, name, phone, email, gender, dob, created_at
  FROM customers
  WHERE status = 1 AND (name LIKE ? OR phone LIKE ? OR customer_code LIKE ?)
  ORDER BY name ASC
`;

export const FIND_CUSTOMER_BY_ID = `
  SELECT id, customer_code, name, phone, email, gender, dob, created_at
  FROM customers
  WHERE id = ? AND status = 1
`;

export const DELETE_CUSTOMER = `
  UPDATE customers SET status = 0 WHERE id = ?
`;

export const UPDATE_CUSTOMER = (fields: string[]) => `
  UPDATE customers SET ${fields.join(', ')} WHERE id = ?
`;
