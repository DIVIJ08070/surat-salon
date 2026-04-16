drop database surat_salon;
create database surat_salon;
use surat_salon;
create table users (
  id int not null auto_increment primary key,
  email varchar(150) not null,
  password_hash text not null,
  role enum('admin','stylist','receptionist') not null,
  failed_attempts tinyint unsigned not null default 0,
  locked_until datetime null,
  status          tinyint(1)       not null default 1, 
  created_at      datetime         not null default current_timestamp,
  updated_at      datetime         not null default current_timestamp on update current_timestamp,

  unique index uq_users_email (email),
  index idx_users_status      (status)
);


create table refresh_tokens (
  id int not null auto_increment primary key,
  user_id int not null,
  token_hash varchar(255) not null,
  device_id varchar(255) null,   
  device_name varchar(100) null,   
  ip_address varchar(45) null,    
  expires_at datetime not null,
  is_revoked tinyint(1) not null default 0,
  status tinyint(1) not null default 1, 
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  index idx_rt_user_id (user_id),
  index idx_rt_token_hash (token_hash),
  index idx_rt_expires_at (expires_at),

  constraint fk_rt_user foreign key (user_id) references users(id) on delete cascade
);


-- 3. token_blacklist
create table token_blacklist (
  id int not null auto_increment primary key,
  jti varchar(36) not null,
  expires_at datetime not null,  
  status tinyint(1) not null default 1, 
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  unique index uq_blacklist_jti (jti),       
  index idx_blacklist_expires_at (expires_at) 
);

create table services (
  id int not null auto_increment primary key,
  service_code varchar(20) not null,
  name varchar(150) not null,
  category enum('hair','skin','nails','makeup','spa') not null,
  duration_minutes smallint unsigned not null,
  price decimal(10,2) not null,
  gender enum('male','female','unisex') not null default 'unisex',
  description text null,
  is_available tinyint(1) not null default 1,
  status tinyint(1) not null default 1, 
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  unique index uq_services_code (service_code),

  constraint chk_services_duration check (duration_minutes > 0),
  constraint chk_services_price    check (price >= 0)
);


create table stylists (
  id int not null auto_increment primary key,
  name varchar(100) not null,
  specialisation enum('hair_stylist','beautician','makeup_artist','spa_therapist') not null,
  working_days varchar(50) not null,
  shift_start time not null,
  shift_end time not null,
  commission_rate decimal(5,2) not null default 0.00,
  stylist_status enum('active','on_leave') not null default 'active',
  status tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  constraint chk_stylists_commission check (commission_rate >= 0 and commission_rate <= 100),
  constraint chk_stylists_shift check (shift_end > shift_start)
);


create table stylist_services (
  id int not null auto_increment primary key,
  stylist_id int not null,
  service_id int not null,
  status tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  unique index uq_ss_stylist_service (stylist_id, service_id),
  index idx_ss_service_id (service_id),

  constraint fk_ss_stylist foreign key (stylist_id) references stylists(id) on delete cascade,
  constraint fk_ss_service foreign key (service_id) references services(id) on delete cascade
);


create table customers (
  id int not null auto_increment primary key,
  customer_code varchar(20) not null,
  name varchar(100) not null,
  phone varchar(15) not null,
  email varchar(150) null,
  gender enum('male','female','unisex') null,
  dob date null,
  status tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  unique index uq_customers_code  (customer_code),
  unique index uq_customers_phone (phone),
  index idx_customers_name (name)
);  


create table appointments (
  id int not null auto_increment primary key,
  appointment_number varchar(20) not null,
  customer_id int not null,
  stylist_id int not null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  total_duration_minutes smallint unsigned not null,
  total_amount decimal(10,2) not null,
  appointment_status enum('scheduled','completed','cancelled','no_show') not null default 'scheduled',
  notes text null,
  status tinyint(1) not null default 1, 
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  unique index uq_apt_number (appointment_number),
  index idx_apt_stylist_date (stylist_id, appointment_date),
  index idx_apt_customer_id  (customer_id),
  index idx_apt_date_status  (appointment_date, appointment_status),

  constraint chk_apt_time check (end_time > start_time),
  constraint chk_apt_duration check (total_duration_minutes > 0),
  constraint chk_apt_amount check (total_amount >= 0),

  constraint fk_apt_customer foreign key (customer_id) references customers(id),
  constraint fk_apt_stylist  foreign key (stylist_id)  references stylists(id)
);


create table appointment_services (
  id int not null auto_increment primary key,
  appointment_id int not null,
  service_id int not null,
  price_at_booking decimal(10,2) not null,
  duration_minutes smallint unsigned not null,
  appointment_service_status enum('pending','completed') not null default 'pending',
  status tinyint(1) not null default 1, 
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  index idx_aptsvc_appointment_id (appointment_id),
  index idx_aptsvc_service_id (service_id),

  constraint fk_aptsvc_appointment foreign key (appointment_id) references appointments(id) on delete cascade,
  constraint fk_aptsvc_service foreign key (service_id) references services(id)
);


create table time_slots (
  id int not null auto_increment primary key,
  stylist_id int not null,
  appointment_id int null,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  slot_status enum('available','booked') not null default 'available',
  block_reason enum('appointment','leave') null default null,
  status tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  unique index uq_slot_stylist_date_start (stylist_id, slot_date, start_time),
  index idx_ts_appointment_id (appointment_id),

  constraint fk_ts_stylist foreign key (stylist_id) references stylists(id) on delete cascade,
  constraint fk_ts_appointment foreign key (appointment_id) references appointments(id) on delete set null
);


-- 11. bills
create table bills (
  id int not null auto_increment primary key,
  appointment_id int not null,
  bill_number varchar(20) not null,
  subtotal decimal(10,2) not null,
  discount decimal(10,2) not null default 0.00,
  tax decimal(10,2) not null default 0.00,
  total decimal(10,2) not null,
  commission_amount decimal(10,2) not null default 0.00,
  payment_method enum('cash','card','upi','wallet') null,
  bill_status enum('pending','paid','refunded') not null default 'pending',
  paid_at datetime null,
  status tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  unique index uq_bills_appointment_id (appointment_id),
  unique index uq_bills_number (bill_number),

  constraint chk_bills_total    check (total >= 0),
  constraint chk_bills_discount check (discount >= 0),
  constraint chk_bills_tax      check (tax >= 0),
  constraint chk_bills_commission check (commission_amount >= 0),

  constraint fk_bills_appointment foreign key (appointment_id) references appointments(id) on delete cascade
);


-- 12. stylist_leaves
create table stylist_leaves (
  id int not null auto_increment primary key,
  stylist_id int not null,
  leave_date date not null,
  leave_start time null,
  leave_end time null,
  reason varchar(255) null,
  leave_status enum('pending','approved','rejected') not null default 'pending',
  status tinyint(1) not null default 1,  
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,

  index idx_sl_stylist_date (stylist_id, leave_date),

  constraint fk_sl_stylist foreign key (stylist_id) references stylists(id) on delete cascade
);

-- 1
select sum(total_amount),sum(case when appointment_status = "completed" then 1 else 0 end) as total_appointment,
sum(case when appointment_status != "completed" then 1 else 0 end) as cancelled_appointment from appointments 
where appointment_date = "2025-01-07" and status = 1
group by appointment_date;

select a.id,count(ass.appointment_id) from appointment_services as ass
join appointments as a 
on	 a.id = ass.appointment_id 
where a.appointment_date = "2025-01-05" and a.status = 1
group by ass.appointment_id 
order by count(ass.appointment_id) 
limit 1;

select start_time,count(*) as total from time_slots 
where slot_status = "booked" and status = 1	
group by start_time
order by total desc;

-- 2

select s.name,s.category,count(*),sum(a.total_amount) as total,avg(a.total_duration_minutes),
rank() over (order by count(*) desc) from services s
left join appointment_services aps on s.id = aps.service_id
left join appointments a on aps.appointment_id = a.id
where year(a.appointment_date) = 2025 and month(a.appointment_date) = 1 and a.appointment_status = 'completed' 
group by s.name,s.category	
order by total desc;

-- 3 

select s.name,s.specialisation,count(*),
sum(case when a.appointment_status = 'completed' then a.total_duration_minutes else 0 end)/60,
sum(a.total_amount),sum(b.commission_amount),(sum(case when a.appointment_status = 'completed' then a.total_duration_minutes else 0 end)/sum(a.total_duration_minutes)*100) 
from stylists s 
left join appointments a on a.stylist_id = s.id
left join bills b  on a.id = b.appointment_id
group by s.name,s.specialisation
order by sum(a.total_amount) desc;

-- 4
select c.name,c.customer_code,c.phone,count(case when a.appointment_status = 'complete' then 1 else 0 end),
max(a.appointment_date),sum(a.total_amount),
case when count(distinct a.id) >= 10 then 'VIP'
when count(distinct a.id) >= 5 then 'Regular'
when count(distinct a.id) >= 1 then 'Ocassional'
else 'new' end,
( select s.name from appointment_services aps2
join appointments a2 ON a2.id = aps2.appointment_id and a2.customer_id = c.id
and a2.appointment_status = 'completed' and a2.status = 1
join services s ON s.id = aps2.service_id
where aps2.status = 1 group by s.id, s.name
order by COUNT(*) desc limit 1) AS favourite_service 
from customers as c join appointments as a on a.customer_id = c.id
group by c.name,c.customer_code;

