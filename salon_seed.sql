-- ============================================================
-- suratsalon hub — seed data
-- ============================================================


-- ------------------------------------------------------------
-- 1. users (1 admin, 1 stylist, 1 receptionist)
-- ------------------------------------------------------------
insert into users (name, email, password_hash, role) values
('admin user',       'admin@suratsalon.com',       '$2b$10$hashedpassword1', 'admin'),
('stylist user',     'stylist@suratsalon.com',     '$2b$10$hashedpassword2', 'stylist'),
('receptionist user','receptionist@suratsalon.com','$2b$10$hashedpassword3', 'receptionist');


-- ------------------------------------------------------------
-- 2. services (10 across all categories)
-- ------------------------------------------------------------
insert into services (service_code, name, category, duration_minutes, price, gender, description) values
('SRV-001', 'haircut women',         'hair',   45,  500.00, 'female', 'precision cut and blow dry'),
('SRV-002', 'haircut men',           'hair',   30,  300.00, 'male',   'classic cut with wash'),
('SRV-003', 'hair color full',       'hair',   90, 2000.00, 'female', 'full head color with toner'),
('SRV-004', 'hair spa',              'hair',   60,  800.00, 'unisex', 'deep conditioning treatment'),
('SRV-005', 'facial basic',          'skin',   60,  600.00, 'female', 'cleansing and moisturising facial'),
('SRV-006', 'cleanup men',           'skin',   45,  400.00, 'male',   'deep cleanse and scrub'),
('SRV-007', 'manicure',              'nails',  45,  350.00, 'female', 'nail shaping filing and polish'),
('SRV-008', 'pedicure',              'nails',  60,  450.00, 'female', 'foot soak scrub and polish'),
('SRV-009', 'bridal makeup',         'makeup', 120,5000.00, 'female', 'full bridal look with setting'),
('SRV-010', 'swedish body massage',  'spa',    90, 1800.00, 'unisex', 'full body relaxing massage');


-- ------------------------------------------------------------
-- 3. stylists (5 with different specialisations)
-- ------------------------------------------------------------
insert into stylists (name, specialisation, working_days, shift_start, shift_end, commission_rate, stylist_status) values
('neha sharma',   'hair_stylist',   'mon,tue,wed,thu,fri',     '10:00', '18:00', 20.00, 'active'),
('priya patel',   'beautician',     'mon,tue,wed,thu,fri,sat', '09:00', '17:00', 18.00, 'active'),
('riya desai',    'makeup_artist',  'tue,wed,thu,fri,sat',     '11:00', '19:00', 22.00, 'active'),
('kavita mehta',  'spa_therapist',  'mon,wed,fri,sat',         '10:00', '18:00', 20.00, 'active'),
('sneha joshi',   'hair_stylist',   'mon,tue,thu,fri,sat',     '09:30', '17:30', 18.00, 'active');


-- ------------------------------------------------------------
-- 4. stylist_services (which stylist can do which service)
-- ------------------------------------------------------------
insert into stylist_services (stylist_id, service_id) values
-- neha sharma (hair stylist) — hair services
(1, 1), (1, 2), (1, 3), (1, 4),
-- priya patel (beautician) — skin and nail services
(2, 5), (2, 6), (2, 7), (2, 8),
-- riya desai (makeup artist) — makeup and skin
(3, 9), (3, 5),
-- kavita mehta (spa therapist) — spa and hair spa
(4, 10), (4, 4),
-- sneha joshi (hair stylist) — hair services
(5, 1), (5, 2), (5, 3), (5, 4);


-- ------------------------------------------------------------
-- 5. customers (15)
-- ------------------------------------------------------------
insert into customers (customer_code, name, phone, email, gender, dob) values
('CUST-2025-001', 'priya shah',     '9898001001', 'priya.shah@gmail.com',     'female', '1995-03-12'),
('CUST-2025-002', 'anjali verma',   '9898001002', 'anjali.v@gmail.com',       'female', '1992-07-22'),
('CUST-2025-003', 'rahul mehta',    '9898001003', 'rahul.m@gmail.com',        'male',   '1990-11-05'),
('CUST-2025-004', 'deepa joshi',    '9898001004', 'deepa.j@gmail.com',        'female', '1998-01-30'),
('CUST-2025-005', 'amit patel',     '9898001005', 'amit.p@gmail.com',         'male',   '1988-06-14'),
('CUST-2025-006', 'kavya nair',     '9898001006', 'kavya.n@gmail.com',        'female', '1996-09-18'),
('CUST-2025-007', 'rohan desai',    '9898001007', 'rohan.d@gmail.com',        'male',   '1993-04-25'),
('CUST-2025-008', 'meera gupta',    '9898001008', 'meera.g@gmail.com',        'female', '1997-12-08'),
('CUST-2025-009', 'suresh kumar',   '9898001009', 'suresh.k@gmail.com',       'male',   '1985-08-19'),
('CUST-2025-010', 'pooja singh',    '9898001010', 'pooja.s@gmail.com',        'female', '1999-02-14'),
('CUST-2025-011', 'nikhil shah',    '9898001011', 'nikhil.s@gmail.com',       'male',   '1991-05-30'),
('CUST-2025-012', 'hetal patel',    '9898001012', 'hetal.p@gmail.com',        'female', '1994-10-22'),
('CUST-2025-013', 'vishal modi',    '9898001013', 'vishal.m@gmail.com',       'male',   '1987-03-07'),
('CUST-2025-014', 'ritu agarwal',   '9898001014', 'ritu.a@gmail.com',         'female', '2000-07-16'),
('CUST-2025-015', 'karan thakkar',  '9898001015', 'karan.t@gmail.com',        'male',   '1996-11-28');


-- ------------------------------------------------------------
-- 6. appointments (20 across mixed statuses)
-- note: all dates in jan 2025
-- ------------------------------------------------------------
insert into appointments
  (appointment_number, customer_id, stylist_id, appointment_date, start_time, end_time, total_duration_minutes, total_amount, appointment_status)
values
('APT-2025-001', 1,  1, '2025-01-05', '10:00', '11:15', 135, 2500.00, 'completed'),
('APT-2025-002', 2,  2, '2025-01-05', '09:00', '10:00',  60,  600.00, 'completed'),
('APT-2025-003', 3,  5, '2025-01-06', '11:00', '11:30',  30,  300.00, 'completed'),
('APT-2025-004', 4,  2, '2025-01-06', '10:00', '11:30',  90,  800.00, 'cancelled'),
('APT-2025-005', 5,  5, '2025-01-07', '09:30', '10:00',  30,  300.00, 'completed'),
('APT-2025-006', 6,  3, '2025-01-07', '11:00', '13:00', 120, 5000.00, 'completed'),
('APT-2025-007', 7,  4, '2025-01-08', '10:00', '11:30',  90, 1800.00, 'no_show'),
('APT-2025-008', 8,  1, '2025-01-08', '10:00', '10:45',  45,  500.00, 'completed'),
('APT-2025-009', 9,  5, '2025-01-09', '09:30', '10:00',  30,  300.00, 'completed'),
('APT-2025-010', 10, 2, '2025-01-09', '09:00', '10:30',  90,  950.00, 'cancelled'),
('APT-2025-011', 11, 1, '2025-01-10', '11:00', '12:30',  90, 2000.00, 'completed'),
('APT-2025-012', 12, 2, '2025-01-10', '10:00', '11:00',  60,  600.00, 'completed'),
('APT-2025-013', 13, 5, '2025-01-11', '09:30', '10:00',  30,  300.00, 'no_show'),
('APT-2025-014', 14, 3, '2025-01-11', '11:00', '13:00', 120, 5000.00, 'completed'),
('APT-2025-015', 15, 4, '2025-01-12', '10:00', '11:30',  90, 1800.00, 'completed'),
('APT-2025-016', 1,  1, '2025-01-13', '10:00', '10:45',  45,  500.00, 'completed'),
('APT-2025-017', 2,  2, '2025-01-13', '09:00', '10:00',  60,  600.00, 'cancelled'),
('APT-2025-018', 3,  5, '2025-01-14', '09:30', '10:30',  60,  800.00, 'completed'),
('APT-2025-019', 4,  1, '2025-01-15', '14:00', '16:15', 135, 2500.00, 'scheduled'),
('APT-2025-020', 5,  4, '2025-01-15', '10:00', '11:30',  90, 1800.00, 'scheduled');


-- ------------------------------------------------------------
-- 7. appointment_services (line items for each appointment)
-- ------------------------------------------------------------
insert into appointment_services
  (appointment_id, service_id, price_at_booking, duration_minutes, appointment_service_status)
values
-- APT-2025-001: hair color + haircut women
(1,  3, 2000.00, 90, 'completed'),
(1,  1,  500.00, 45, 'completed'),
-- APT-2025-002: facial basic
(2,  5,  600.00, 60, 'completed'),
-- APT-2025-003: haircut men
(3,  2,  300.00, 30, 'completed'),
-- APT-2025-004: hair spa (cancelled)
(4,  4,  800.00, 60, 'pending'),
-- APT-2025-005: haircut men
(5,  2,  300.00, 30, 'completed'),
-- APT-2025-006: bridal makeup
(6,  9, 5000.00,120, 'completed'),
-- APT-2025-007: swedish body massage (no_show)
(7,  10,1800.00, 90, 'pending'),
-- APT-2025-008: haircut women
(8,  1,  500.00, 45, 'completed'),
-- APT-2025-009: haircut men
(9,  2,  300.00, 30, 'completed'),
-- APT-2025-010: manicure + pedicure (cancelled)
(10, 7,  350.00, 45, 'pending'),
(10, 8,  450.00, 60, 'pending'),
-- APT-2025-011: hair color full
(11, 3, 2000.00, 90, 'completed'),
-- APT-2025-012: facial basic
(12, 5,  600.00, 60, 'completed'),
-- APT-2025-013: haircut men (no_show)
(13, 2,  300.00, 30, 'pending'),
-- APT-2025-014: bridal makeup
(14, 9, 5000.00,120, 'completed'),
-- APT-2025-015: swedish body massage
(15,10, 1800.00, 90, 'completed'),
-- APT-2025-016: haircut women
(16, 1,  500.00, 45, 'completed'),
-- APT-2025-017: facial basic (cancelled)
(17, 5,  600.00, 60, 'pending'),
-- APT-2025-018: hair spa
(18, 4,  800.00, 60, 'completed'),
-- APT-2025-019: hair color + haircut women (scheduled)
(19, 3, 2000.00, 90, 'pending'),
(19, 1,  500.00, 45, 'pending'),
-- APT-2025-020: swedish body massage (scheduled)
(20,10, 1800.00, 90, 'pending');


-- ------------------------------------------------------------
-- 8. time_slots (30 records — mix of booked and available)
-- showing slots for jan 15 2025 for stylists 1 and 4
-- and some available slots for other dates
-- ------------------------------------------------------------
insert into time_slots
  (stylist_id, appointment_id, slot_date, start_time, end_time, slot_status, block_reason)
values

-- stylist 1 (neha) — jan 15, apt 19 blocks 14:00 to 16:00
(1, null, '2025-01-15', '10:00', '10:30', 'available', null),
(1, null, '2025-01-15', '10:30', '11:00', 'available', null),
(1, null, '2025-01-15', '11:00', '11:30', 'available', null),
(1, null, '2025-01-15', '11:30', '12:00', 'available', null),
(1, null, '2025-01-15', '12:00', '12:30', 'available', null),
(1, null, '2025-01-15', '12:30', '13:00', 'available', null),
(1, null, '2025-01-15', '13:00', '13:30', 'available', null),
(1, null, '2025-01-15', '13:30', '14:00', 'available', null),
(1, 19,   '2025-01-15', '14:00', '14:30', 'booked',    'appointment'),
(1, 19,   '2025-01-15', '14:30', '15:00', 'booked',    'appointment'),
(1, 19,   '2025-01-15', '15:00', '15:30', 'booked',    'appointment'),
(1, 19,   '2025-01-15', '15:30', '16:00', 'booked',    'appointment'),
(1, 19,   '2025-01-15', '16:00', '16:30', 'booked',    'appointment'),
(1, null, '2025-01-15', '16:30', '17:00', 'available', null),
(1, null, '2025-01-15', '17:00', '17:30', 'available', null),
(1, null, '2025-01-15', '17:30', '18:00', 'available', null),

-- stylist 4 (kavita) — jan 15, apt 20 blocks 10:00 to 11:30
(4, 20,   '2025-01-15', '10:00', '10:30', 'booked',    'appointment'),
(4, 20,   '2025-01-15', '10:30', '11:00', 'booked',    'appointment'),
(4, 20,   '2025-01-15', '11:00', '11:30', 'booked',    'appointment'),
(4, null, '2025-01-15', '11:30', '12:00', 'available', null),
(4, null, '2025-01-15', '12:00', '12:30', 'available', null),
(4, null, '2025-01-15', '12:30', '13:00', 'available', null),
(4, null, '2025-01-15', '13:00', '13:30', 'available', null),
(4, null, '2025-01-15', '13:30', '14:00', 'available', null),
(4, null, '2025-01-15', '14:00', '14:30', 'available', null),
(4, null, '2025-01-15', '14:30', '15:00', 'available', null),
(4, null, '2025-01-15', '15:00', '15:30', 'available', null),
(4, null, '2025-01-15', '15:30', '16:00', 'available', null),
(4, null, '2025-01-15', '16:00', '16:30', 'available', null),
(4, null, '2025-01-15', '16:30', '17:00', 'available', null);


-- ------------------------------------------------------------
-- 9. bills (for completed appointments only)
-- ------------------------------------------------------------
insert into bills
  (appointment_id, bill_number, subtotal, discount, tax, total, payment_method, bill_status, paid_at)
values
(1,  'BILL-2025-001', 2500.00, 0.00,   0.00, 2500.00, 'card',  'paid', '2025-01-05 11:20:00'),
(2,  'BILL-2025-002',  600.00, 0.00,   0.00,  600.00, 'cash',  'paid', '2025-01-05 10:05:00'),
(3,  'BILL-2025-003',  300.00, 0.00,   0.00,  300.00, 'upi',   'paid', '2025-01-06 11:35:00'),
(5,  'BILL-2025-004',  300.00, 0.00,   0.00,  300.00, 'cash',  'paid', '2025-01-07 10:05:00'),
(6,  'BILL-2025-005', 5000.00, 0.00,   0.00, 5000.00, 'card',  'paid', '2025-01-07 13:10:00'),
(8,  'BILL-2025-006',  500.00, 0.00,   0.00,  500.00, 'upi',   'paid', '2025-01-08 10:50:00'),
(9,  'BILL-2025-007',  300.00, 0.00,   0.00,  300.00, 'cash',  'paid', '2025-01-09 10:05:00'),
(11, 'BILL-2025-008', 2000.00, 100.00, 0.00, 1900.00, 'card',  'paid', '2025-01-10 12:35:00'),
(12, 'BILL-2025-009',  600.00, 0.00,   0.00,  600.00, 'cash',  'paid', '2025-01-10 11:05:00'),
(14, 'BILL-2025-010', 5000.00, 500.00, 0.00, 4500.00, 'card',  'paid', '2025-01-11 13:10:00'),
(15, 'BILL-2025-011', 1800.00, 0.00,   0.00, 1800.00, 'upi',   'paid', '2025-01-12 11:35:00'),
(16, 'BILL-2025-012',  500.00, 0.00,   0.00,  500.00, 'cash',  'paid', '2025-01-13 10:50:00'),
(18, 'BILL-2025-013',  800.00, 0.00,   0.00,  800.00, 'wallet','paid', '2025-01-14 10:35:00'),
-- pending bills for scheduled appointments
(19, 'BILL-2025-014', 2500.00, 0.00,   0.00, 2500.00, null,    'pending', null),
(20, 'BILL-2025-015', 1800.00, 0.00,   0.00, 1800.00, null,    'pending', null);