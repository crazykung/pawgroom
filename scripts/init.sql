-- =============================================================================
-- PawGroom — PostgreSQL Init Script
-- รันอัตโนมัติตอน container เริ่มครั้งแรก
-- =============================================================================

-- Extensions ที่จำเป็น
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- สำหรับ fuzzy search ชื่อ/เบอร์
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- สำหรับ search ไม่สนวรรณยุกต์

-- Database collation สำหรับภาษาไทย
-- (ตั้งค่าตอนสร้าง database ผ่าน docker env แล้ว)

-- Performance settings สำหรับ session
ALTER DATABASE pawgroom SET timezone TO 'Asia/Bangkok';
ALTER DATABASE pawgroom SET default_text_search_config TO 'pg_catalog.simple';

-- สร้าง schema ถ้ายังไม่มี
CREATE SCHEMA IF NOT EXISTS public;

GRANT ALL ON SCHEMA public TO pawgroom;
GRANT ALL PRIVILEGES ON DATABASE pawgroom TO pawgroom;
