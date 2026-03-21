--
-- PostgreSQL database dump
--

\restrict v6W4mYGRc7zX12eSrtqdpRH0vgD2Y41qXmmvNEI36aqR5gzGtK0Rnrn3AI1uYqg

-- Dumped from database version 18.1 (Debian 18.1-1.pgdg12+2)
-- Dumped by pg_dump version 18.3

-- Started on 2026-03-21 14:41:26

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3473 (class 1262 OID 16389)
-- Name: alupla_db; Type: DATABASE; Schema: -; Owner: alupla_db_user
--

CREATE DATABASE alupla_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF8';


ALTER DATABASE alupla_db OWNER TO alupla_db_user;

\unrestrict v6W4mYGRc7zX12eSrtqdpRH0vgD2Y41qXmmvNEI36aqR5gzGtK0Rnrn3AI1uYqg
\connect alupla_db
\restrict v6W4mYGRc7zX12eSrtqdpRH0vgD2Y41qXmmvNEI36aqR5gzGtK0Rnrn3AI1uYqg

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3474 (class 0 OID 0)
-- Name: alupla_db; Type: DATABASE PROPERTIES; Schema: -; Owner: alupla_db_user
--

ALTER DATABASE alupla_db SET "TimeZone" TO 'utc';


\unrestrict v6W4mYGRc7zX12eSrtqdpRH0vgD2Y41qXmmvNEI36aqR5gzGtK0Rnrn3AI1uYqg
\connect alupla_db
\restrict v6W4mYGRc7zX12eSrtqdpRH0vgD2Y41qXmmvNEI36aqR5gzGtK0Rnrn3AI1uYqg

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: alupla_db_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO alupla_db_user;

--
-- TOC entry 2 (class 3079 OID 16553)
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- TOC entry 3475 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- TOC entry 887 (class 1247 OID 16493)
-- Name: enum_graduates_gender; Type: TYPE; Schema: public; Owner: alupla_db_user
--

CREATE TYPE public.enum_graduates_gender AS ENUM (
    'M',
    'F'
);


ALTER TYPE public.enum_graduates_gender OWNER TO alupla_db_user;

--
-- TOC entry 881 (class 1247 OID 16466)
-- Name: enum_regions_type; Type: TYPE; Schema: public; Owner: alupla_db_user
--

CREATE TYPE public.enum_regions_type AS ENUM (
    'PERIPHERY',
    'NOMOS',
    'DIMOS',
    'CITY'
);


ALTER TYPE public.enum_regions_type OWNER TO alupla_db_user;

--
-- TOC entry 869 (class 1247 OID 16399)
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: alupla_db_user
--

CREATE TYPE public.enum_users_role AS ENUM (
    'super_admin',
    'secretariat'
);


ALTER TYPE public.enum_users_role OWNER TO alupla_db_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 231 (class 1259 OID 16537)
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: alupla_db_user
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    details json,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO alupla_db_user;

--
-- TOC entry 230 (class 1259 OID 16536)
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: alupla_db_user
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO alupla_db_user;

--
-- TOC entry 3478 (class 0 OID 0)
-- Dependencies: 230
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alupla_db_user
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- TOC entry 229 (class 1259 OID 16498)
-- Name: graduates; Type: TABLE; Schema: public; Owner: alupla_db_user
--

CREATE TABLE public.graduates (
    id integer NOT NULL,
    ad_code character varying(20) NOT NULL,
    last_name character varying(100) NOT NULL,
    first_name character varying(100) NOT NULL,
    father_name character varying(100) NOT NULL,
    degree_grade numeric(4,2) NOT NULL,
    graduation_date date NOT NULL,
    oath_date date NOT NULL,
    entry_year smallint NOT NULL,
    student_number character varying(50) NOT NULL,
    birth_date date NOT NULL,
    gender public.enum_graduates_gender NOT NULL,
    study_program_id integer NOT NULL,
    program_direction_id integer,
    origin_region_id integer,
    origin_municipality character varying(150),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.graduates OWNER TO alupla_db_user;

--
-- TOC entry 228 (class 1259 OID 16497)
-- Name: graduates_id_seq; Type: SEQUENCE; Schema: public; Owner: alupla_db_user
--

CREATE SEQUENCE public.graduates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.graduates_id_seq OWNER TO alupla_db_user;

--
-- TOC entry 3479 (class 0 OID 0)
-- Dependencies: 228
-- Name: graduates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alupla_db_user
--

ALTER SEQUENCE public.graduates_id_seq OWNED BY public.graduates.id;


--
-- TOC entry 225 (class 1259 OID 16445)
-- Name: program_directions; Type: TABLE; Schema: public; Owner: alupla_db_user
--

CREATE TABLE public.program_directions (
    id integer NOT NULL,
    study_program_id integer NOT NULL,
    code character varying(50) NOT NULL,
    name_el character varying(255) NOT NULL,
    name_en character varying(255),
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.program_directions OWNER TO alupla_db_user;

--
-- TOC entry 224 (class 1259 OID 16444)
-- Name: program_directions_id_seq; Type: SEQUENCE; Schema: public; Owner: alupla_db_user
--

CREATE SEQUENCE public.program_directions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.program_directions_id_seq OWNER TO alupla_db_user;

--
-- TOC entry 3480 (class 0 OID 0)
-- Dependencies: 224
-- Name: program_directions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alupla_db_user
--

ALTER SEQUENCE public.program_directions_id_seq OWNED BY public.program_directions.id;


--
-- TOC entry 227 (class 1259 OID 16476)
-- Name: regions; Type: TABLE; Schema: public; Owner: alupla_db_user
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    type public.enum_regions_type NOT NULL,
    parent_id integer,
    latitude numeric(10,7),
    longitude numeric(10,7),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.regions OWNER TO alupla_db_user;

--
-- TOC entry 226 (class 1259 OID 16475)
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: alupla_db_user
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.regions_id_seq OWNER TO alupla_db_user;

--
-- TOC entry 3481 (class 0 OID 0)
-- Dependencies: 226
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alupla_db_user
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- TOC entry 223 (class 1259 OID 16427)
-- Name: study_programs; Type: TABLE; Schema: public; Owner: alupla_db_user
--

CREATE TABLE public.study_programs (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name_el character varying(255) NOT NULL,
    name_en character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.study_programs OWNER TO alupla_db_user;

--
-- TOC entry 222 (class 1259 OID 16426)
-- Name: study_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: alupla_db_user
--

CREATE SEQUENCE public.study_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.study_programs_id_seq OWNER TO alupla_db_user;

--
-- TOC entry 3482 (class 0 OID 0)
-- Dependencies: 222
-- Name: study_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alupla_db_user
--

ALTER SEQUENCE public.study_programs_id_seq OWNED BY public.study_programs.id;


--
-- TOC entry 221 (class 1259 OID 16404)
-- Name: users; Type: TABLE; Schema: public; Owner: alupla_db_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.enum_users_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_token character(64),
    email_verification_expires timestamp with time zone,
    password_reset_token character(64),
    password_reset_expires timestamp with time zone,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    admin_approved boolean DEFAULT true NOT NULL
);


ALTER TABLE public.users OWNER TO alupla_db_user;

--
-- TOC entry 220 (class 1259 OID 16403)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: alupla_db_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO alupla_db_user;

--
-- TOC entry 3483 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alupla_db_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3283 (class 2604 OID 16540)
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- TOC entry 3282 (class 2604 OID 16501)
-- Name: graduates id; Type: DEFAULT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.graduates ALTER COLUMN id SET DEFAULT nextval('public.graduates_id_seq'::regclass);


--
-- TOC entry 3279 (class 2604 OID 16448)
-- Name: program_directions id; Type: DEFAULT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.program_directions ALTER COLUMN id SET DEFAULT nextval('public.program_directions_id_seq'::regclass);


--
-- TOC entry 3281 (class 2604 OID 16479)
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- TOC entry 3277 (class 2604 OID 16430)
-- Name: study_programs id; Type: DEFAULT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.study_programs ALTER COLUMN id SET DEFAULT nextval('public.study_programs_id_seq'::regclass);


--
-- TOC entry 3273 (class 2604 OID 16407)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3467 (class 0 OID 16537)
-- Dependencies: 231
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: alupla_db_user
--

COPY public.activity_logs (id, user_id, action, entity_type, entity_id, details, created_at) FROM stdin;
1	1	login	system	\N	\N	2026-03-02 17:52:13.264+00
2	1	import_graduates	graduate	\N	{"file":"graduates_sample.xlsx","total_rows":3,"inserted":0,"updated":0,"skipped":3,"errors":3}	2026-03-02 18:00:11.465+00
3	1	import_graduates	graduate	\N	{"file":"graduates_10_valid_dates.xlsx","total_rows":10,"inserted":0,"updated":0,"skipped":10,"errors":10}	2026-03-02 18:03:46.447+00
4	1	login	system	\N	\N	2026-03-02 18:21:03.67+00
5	1	login	system	\N	\N	2026-03-04 12:50:25.457+00
6	1	login	system	\N	\N	2026-03-04 13:38:55.721+00
7	1	login	system	\N	\N	2026-03-04 14:03:13.937+00
8	1	login	system	\N	\N	2026-03-04 14:12:49.805+00
9	1	create_graduate	graduate	1	{"student_number":"1050360"}	2026-03-04 14:14:23.151+00
10	1	login	system	\N	\N	2026-03-04 14:24:36.806+00
11	1	login	system	\N	\N	2026-03-04 14:40:19.322+00
12	1	login	system	\N	\N	2026-03-04 14:50:05.411+00
13	1	login	system	\N	\N	2026-03-04 14:51:48.186+00
14	1	login	system	\N	\N	2026-03-04 15:00:18.366+00
15	1	login	system	\N	\N	2026-03-04 15:07:50.033+00
16	1	login	system	\N	\N	2026-03-04 15:17:25.82+00
17	1	create_graduate	graduate	2	{"student_number":"1059879"}	2026-03-04 15:28:50.449+00
18	1	login	system	\N	\N	2026-03-04 15:37:04.193+00
19	1	login	system	\N	\N	2026-03-04 15:50:01.321+00
20	1	login	system	\N	\N	2026-03-04 16:41:04.241+00
21	1	login	system	\N	\N	2026-03-04 16:55:47.555+00
22	2	register	user	2	\N	2026-03-04 17:06:33.331+00
23	2	verify_email	user	2	\N	2026-03-04 17:06:37.097+00
24	2	login	system	\N	\N	2026-03-04 17:07:01.622+00
25	1	login	system	\N	\N	2026-03-04 17:07:41.529+00
26	1	login	system	\N	\N	2026-03-04 17:17:51.137+00
27	1	login	system	\N	\N	2026-03-04 17:42:58.593+00
28	1	login	system	\N	\N	2026-03-05 13:05:34.019+00
29	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":2}	2026-03-05 13:15:06.773+00
30	1	update_graduate	graduate	1	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-05 13:16:42.642+00
31	1	login	system	\N	\N	2026-03-05 13:36:32.349+00
32	1	login	system	\N	\N	2026-03-05 13:39:54.94+00
33	1	login	system	\N	\N	2026-03-05 13:49:47.225+00
34	1	login	system	\N	\N	2026-03-05 14:11:46.847+00
35	1	login	system	\N	\N	2026-03-05 14:33:23.636+00
36	2	login	system	\N	\N	2026-03-05 14:34:35.645+00
37	1	login	system	\N	\N	2026-03-05 14:35:06.947+00
38	1	login	system	\N	\N	2026-03-05 14:37:18.349+00
39	1	create_graduate	graduate	3	{"student_number":"1090990"}	2026-03-05 14:38:52.116+00
40	1	update_graduate	graduate	2	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-05 14:49:59.123+00
41	1	update_graduate	graduate	1	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-05 14:50:26.921+00
42	1	login	system	\N	\N	2026-03-05 14:53:41.248+00
43	1	login	system	\N	\N	2026-03-05 15:02:34.65+00
44	1	update_graduate	graduate	3	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-05 15:03:17.552+00
45	1	update_graduate	graduate	3	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-05 15:10:35.418+00
46	1	update_graduate	graduate	2	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-05 15:10:50.841+00
47	1	login	system	\N	\N	2026-03-05 15:22:50.447+00
48	1	login	system	\N	\N	2026-03-05 15:40:13.747+00
49	1	create_graduate	graduate	4	{"student_number":"1045608"}	2026-03-05 15:44:32.218+00
50	1	update_graduate	graduate	2	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-05 15:44:54.726+00
51	1	create_user	user	3	\N	2026-03-05 15:45:51.646+00
52	1	update_user	user	3	{"changed":["role"]}	2026-03-05 15:46:01.318+00
53	1	update_user	user	3	{"changed":["role"]}	2026-03-05 15:46:04.299+00
54	1	login	system	\N	\N	2026-03-05 16:25:10.645+00
55	1	login	system	\N	\N	2026-03-05 16:27:35.037+00
56	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":4}	2026-03-05 16:41:07.616+00
57	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":4}	2026-03-05 16:51:58.398+00
58	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":4}	2026-03-05 16:55:19.984+00
59	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":4}	2026-03-05 16:57:48.967+00
60	1	import_graduates	graduate	\N	{"file":"graduates_sample_10_records_FIXED_dir34.xlsx","total_rows":10,"inserted":10,"updated":0,"skipped":0,"errors":0}	2026-03-05 16:57:56.145+00
61	1	import_graduates	graduate	\N	{"file":"graduates_additional_86_to_reach_100.xlsx","total_rows":86,"inserted":86,"updated":0,"skipped":0,"errors":0}	2026-03-05 17:05:02.535+00
62	1	login	system	\N	\N	2026-03-05 17:10:02.041+00
63	1	update_graduate	graduate	2	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-05 17:19:06.024+00
64	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":100}	2026-03-05 17:19:46.918+00
65	1	login	system	\N	\N	2026-03-05 17:24:50.349+00
66	1	login	system	\N	\N	2026-03-05 17:36:38.448+00
67	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":100}	2026-03-05 17:54:04.876+00
68	1	login	system	\N	\N	2026-03-05 17:56:04.642+00
69	1	login	system	\N	\N	2026-03-05 17:57:09.35+00
70	1	login	system	\N	\N	2026-03-05 18:23:27.682+00
71	1	login	system	\N	\N	2026-03-05 18:27:59.782+00
72	1	login	system	\N	\N	2026-03-05 18:42:06.972+00
73	1	login	system	\N	\N	2026-03-07 12:45:10.62+00
74	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":100}	2026-03-07 12:48:01.433+00
272	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":94}	2026-03-08 23:21:52.404+00
75	1	import_graduates	graduate	\N	{"file":"graduates_additional_86_to_reach_100.xlsx","total_rows":86,"inserted":0,"updated":86,"skipped":0,"errors":0}	2026-03-07 12:51:03.608+00
76	1	login	system	\N	\N	2026-03-07 13:10:11.396+00
77	1	map_export	map	\N	{"format":"csv"}	2026-03-07 13:10:30.88+00
78	\N	statistics_export	statistics	\N	{"format":"csv","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"rows":100}	2026-03-07 13:10:54.515+00
79	\N	map_export	map	\N	{"format":"csv"}	2026-03-07 13:11:00.995+00
80	1	statistics_export	statistics	\N	{"format":"csv","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"rows":100}	2026-03-07 13:11:17.793+00
81	1	login	system	\N	\N	2026-03-07 13:24:51.843+00
82	1	login	system	\N	\N	2026-03-07 14:22:31.933+00
83	2	login	system	\N	\N	2026-03-07 14:31:21.121+00
84	1	login	system	\N	\N	2026-03-07 14:34:30.012+00
85	1	login	system	\N	\N	2026-03-07 15:00:12.985+00
86	1	login	system	\N	\N	2026-03-07 15:10:42.052+00
87	\N	map_export	map	\N	{"format":"csv"}	2026-03-07 15:31:00.458+00
88	1	statistics_export	statistics	\N	{"format":"csv","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"rows":100}	2026-03-07 15:36:16.475+00
89	1	login	system	\N	\N	2026-03-07 15:44:48.462+00
90	1	login	system	\N	\N	2026-03-07 16:01:34.727+00
91	1	login	system	\N	\N	2026-03-07 16:10:49.93+00
92	1	login	system	\N	\N	2026-03-07 16:16:06.102+00
93	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":100}	2026-03-07 16:34:56.344+00
94	1	login	system	\N	\N	2026-03-07 16:56:47.755+00
95	1	login	system	\N	\N	2026-03-07 17:02:26.052+00
96	1	login	system	\N	\N	2026-03-07 17:13:39.145+00
97	1	statistics_export	statistics	\N	{"format":"csv","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"rows":100}	2026-03-07 17:29:08.898+00
98	1	login	system	\N	\N	2026-03-07 17:41:54.655+00
99	1	login	system	\N	\N	2026-03-07 17:45:59.209+00
102	1	approve_user	user	4	\N	2026-03-07 17:54:39.423+00
103	1	reject_user	user	4	\N	2026-03-07 17:54:47.744+00
104	1	login	system	\N	\N	2026-03-07 17:57:37.614+00
105	1	login	system	\N	\N	2026-03-07 18:08:41.513+00
106	1	update_user	user	4	{"changed":["admin_approved"]}	2026-03-07 18:08:58.25+00
107	1	login	system	\N	\N	2026-03-07 23:32:44.727+00
108	1	login	system	\N	\N	2026-03-07 23:55:39.43+00
109	1	login	system	\N	\N	2026-03-08 00:05:58.424+00
110	1	login	system	\N	\N	2026-03-08 00:16:41.941+00
111	1	deactivate_user	user	4	\N	2026-03-08 00:16:56.918+00
100	\N	register	user	4	\N	2026-03-07 17:47:38.113+00
101	\N	verify_email	user	4	\N	2026-03-07 17:47:42.037+00
112	1	login	system	\N	\N	2026-03-08 00:25:04.213+00
113	1	διαγραφή χρήστη	user	3	\N	2026-03-08 00:25:31.071+00
114	1	login	system	\N	\N	2026-03-08 00:33:44.004+00
115	1	login	system	\N	\N	2026-03-08 00:43:13.209+00
116	1	login	system	\N	\N	2026-03-08 00:51:15.01+00
117	1	login	system	\N	\N	2026-03-08 00:58:18.116+00
118	1	login	system	\N	\N	2026-03-08 01:11:36.708+00
119	1	login	system	\N	\N	2026-03-08 01:34:23.591+00
120	1	login	system	\N	\N	2026-03-08 01:44:46.284+00
121	1	login	system	\N	\N	2026-03-08 01:50:39.098+00
122	1	login	system	\N	\N	2026-03-08 09:02:25.506+00
123	1	login	system	\N	\N	2026-03-08 15:04:14.788+00
124	1	login	system	\N	\N	2026-03-08 15:13:13.883+00
125	1	login	system	\N	\N	2026-03-08 15:29:11.583+00
126	1	login	system	\N	\N	2026-03-08 15:35:53.375+00
127	1	login	system	\N	\N	2026-03-08 16:14:57.418+00
128	1	login	system	\N	\N	2026-03-08 16:22:26.473+00
129	1	login	system	\N	\N	2026-03-08 16:31:52.726+00
130	1	login	system	\N	\N	2026-03-08 16:42:41.024+00
131	1	login	system	\N	\N	2026-03-08 16:48:28.433+00
132	1	login	system	\N	\N	2026-03-08 17:12:36.539+00
133	1	login	system	\N	\N	2026-03-08 19:26:50.929+00
134	\N	map_export	map	\N	{"format":"csv"}	2026-03-08 20:02:04.565+00
135	\N	map_export	map	\N	{"format":"xls"}	2026-03-08 20:15:51.686+00
136	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:24:26.553+00
137	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:32:09.197+00
138	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:32:35.762+00
139	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:32:59.042+00
140	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:39:09.909+00
141	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:39:29.738+00
142	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:40:11.865+00
143	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:40:26.886+00
144	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:40:59.98+00
145	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:47:57.199+00
146	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 20:49:18.492+00
147	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 21:02:48.304+00
148	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-08 21:02:59.204+00
149	\N	statistics_export	statistics	\N	{"format":"csv","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"rows":100}	2026-03-08 21:59:10.778+00
150	\N	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"rows":100}	2026-03-08 22:07:32.525+00
151	1	login	system	\N	\N	2026-03-08 22:14:55.858+00
152	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":100}	2026-03-08 22:15:31.723+00
153	\N	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"year","gender_mode":"year","rows":6}	2026-03-08 22:21:39.368+00
154	\N	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"semester","gender_mode":"year","rows":12}	2026-03-08 22:22:47.528+00
155	1	login	system	\N	\N	2026-03-08 22:27:05.72+00
156	\N	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"year","gender_mode":"year","rows":6}	2026-03-08 22:30:16.233+00
157	\N	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"semester","gender_mode":"semester","rows":12}	2026-03-08 22:30:33.742+00
158	1	login	system	\N	\N	2026-03-08 22:31:08.645+00
159	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":100}	2026-03-08 22:35:56.684+00
160	1	login	system	\N	\N	2026-03-08 22:38:27.846+00
161	1	login	system	\N	\N	2026-03-08 22:57:41.269+00
162	1	delete_graduate	graduate	3	\N	2026-03-08 22:57:55.92+00
163	1	delete_graduate	graduate	2	\N	2026-03-08 22:58:02.994+00
164	1	delete_graduate	graduate	4	\N	2026-03-08 22:58:18.616+00
165	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":97}	2026-03-08 22:58:34.229+00
166	1	import_graduates	graduate	\N	{"file":"graduates1.xlsx","total_rows":86,"inserted":0,"updated":86,"skipped":0,"errors":0}	2026-03-08 23:04:11.657+00
167	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":97,"inserted":0,"updated":0,"skipped":97,"errors":97}	2026-03-08 23:07:34.563+00
168	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":97,"inserted":97,"updated":0,"skipped":0,"errors":0}	2026-03-08 23:10:45.168+00
169	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":97,"inserted":0,"updated":97,"skipped":0,"errors":0}	2026-03-08 23:13:46.262+00
170	1	delete_graduate	graduate	34	\N	2026-03-08 23:18:11.413+00
171	1	delete_graduate	graduate	30	\N	2026-03-08 23:18:12.977+00
172	1	delete_graduate	graduate	27	\N	2026-03-08 23:18:14.712+00
173	1	delete_graduate	graduate	26	\N	2026-03-08 23:18:16.305+00
174	1	delete_graduate	graduate	28	\N	2026-03-08 23:18:17.744+00
175	1	delete_graduate	graduate	32	\N	2026-03-08 23:18:19.561+00
176	1	delete_graduate	graduate	35	\N	2026-03-08 23:18:21.134+00
177	1	delete_graduate	graduate	29	\N	2026-03-08 23:18:22.659+00
178	1	delete_graduate	graduate	24	\N	2026-03-08 23:18:24.186+00
179	1	delete_graduate	graduate	31	\N	2026-03-08 23:18:25.816+00
180	1	delete_graduate	graduate	38	\N	2026-03-08 23:18:27.239+00
181	1	delete_graduate	graduate	33	\N	2026-03-08 23:18:28.465+00
182	1	delete_graduate	graduate	25	\N	2026-03-08 23:18:30.161+00
183	1	delete_graduate	graduate	41	\N	2026-03-08 23:18:31.821+00
184	1	delete_graduate	graduate	44	\N	2026-03-08 23:18:34.937+00
185	1	delete_graduate	graduate	46	\N	2026-03-08 23:18:36.595+00
186	1	delete_graduate	graduate	43	\N	2026-03-08 23:18:38.291+00
187	1	delete_graduate	graduate	40	\N	2026-03-08 23:18:39.898+00
188	1	delete_graduate	graduate	39	\N	2026-03-08 23:18:41.765+00
189	1	delete_graduate	graduate	47	\N	2026-03-08 23:18:43.062+00
190	1	delete_graduate	graduate	51	\N	2026-03-08 23:18:44.621+00
191	1	delete_graduate	graduate	53	\N	2026-03-08 23:18:46.22+00
192	1	delete_graduate	graduate	42	\N	2026-03-08 23:18:48.271+00
193	1	delete_graduate	graduate	48	\N	2026-03-08 23:18:49.662+00
194	1	delete_graduate	graduate	50	\N	2026-03-08 23:18:51.1+00
195	1	delete_graduate	graduate	49	\N	2026-03-08 23:18:52.444+00
196	1	delete_graduate	graduate	54	\N	2026-03-08 23:18:55.117+00
197	1	delete_graduate	graduate	56	\N	2026-03-08 23:18:56.646+00
198	1	delete_graduate	graduate	55	\N	2026-03-08 23:18:58.491+00
199	1	delete_graduate	graduate	52	\N	2026-03-08 23:19:00.152+00
200	1	delete_graduate	graduate	58	\N	2026-03-08 23:19:01.622+00
201	1	delete_graduate	graduate	59	\N	2026-03-08 23:19:03.228+00
202	1	delete_graduate	graduate	57	\N	2026-03-08 23:19:04.62+00
203	1	delete_graduate	graduate	60	\N	2026-03-08 23:19:06.343+00
204	1	delete_graduate	graduate	62	\N	2026-03-08 23:19:08.11+00
205	1	delete_graduate	graduate	63	\N	2026-03-08 23:19:09.932+00
206	1	delete_graduate	graduate	64	\N	2026-03-08 23:19:11.796+00
207	1	delete_graduate	graduate	65	\N	2026-03-08 23:19:13.449+00
208	1	delete_graduate	graduate	66	\N	2026-03-08 23:19:14.899+00
209	1	delete_graduate	graduate	67	\N	2026-03-08 23:19:16.496+00
210	1	delete_graduate	graduate	68	\N	2026-03-08 23:19:18.017+00
211	1	delete_graduate	graduate	69	\N	2026-03-08 23:19:19.577+00
212	1	delete_graduate	graduate	70	\N	2026-03-08 23:19:20.959+00
213	1	delete_graduate	graduate	71	\N	2026-03-08 23:19:22.569+00
214	1	delete_graduate	graduate	77	\N	2026-03-08 23:19:27.64+00
215	1	delete_graduate	graduate	72	\N	2026-03-08 23:19:29.09+00
216	1	delete_graduate	graduate	61	\N	2026-03-08 23:19:30.512+00
217	1	delete_graduate	graduate	45	\N	2026-03-08 23:19:32.13+00
218	1	delete_graduate	graduate	73	\N	2026-03-08 23:19:33.524+00
219	1	delete_graduate	graduate	74	\N	2026-03-08 23:19:35.077+00
220	1	delete_graduate	graduate	78	\N	2026-03-08 23:19:36.898+00
221	1	delete_graduate	graduate	80	\N	2026-03-08 23:19:38.496+00
222	1	delete_graduate	graduate	79	\N	2026-03-08 23:19:40.169+00
223	1	delete_graduate	graduate	75	\N	2026-03-08 23:19:42.068+00
224	1	delete_graduate	graduate	36	\N	2026-03-08 23:19:43.547+00
225	1	delete_graduate	graduate	81	\N	2026-03-08 23:19:45.241+00
226	1	delete_graduate	graduate	83	\N	2026-03-08 23:19:46.69+00
227	1	delete_graduate	graduate	85	\N	2026-03-08 23:19:48.295+00
228	1	delete_graduate	graduate	84	\N	2026-03-08 23:19:49.842+00
229	1	delete_graduate	graduate	86	\N	2026-03-08 23:19:51.38+00
230	1	delete_graduate	graduate	87	\N	2026-03-08 23:19:52.873+00
231	1	delete_graduate	graduate	89	\N	2026-03-08 23:19:54.441+00
232	1	delete_graduate	graduate	90	\N	2026-03-08 23:19:56.127+00
233	1	delete_graduate	graduate	92	\N	2026-03-08 23:19:57.539+00
234	1	delete_graduate	graduate	93	\N	2026-03-08 23:19:59.284+00
235	1	delete_graduate	graduate	94	\N	2026-03-08 23:20:04.394+00
236	1	delete_graduate	graduate	82	\N	2026-03-08 23:20:05.962+00
237	1	delete_graduate	graduate	95	\N	2026-03-08 23:20:10.171+00
238	1	delete_graduate	graduate	88	\N	2026-03-08 23:20:12.159+00
239	1	delete_graduate	graduate	76	\N	2026-03-08 23:20:13.778+00
240	1	delete_graduate	graduate	100	\N	2026-03-08 23:20:15.389+00
241	1	delete_graduate	graduate	97	\N	2026-03-08 23:20:16.933+00
242	1	delete_graduate	graduate	96	\N	2026-03-08 23:20:18.637+00
243	1	delete_graduate	graduate	37	\N	2026-03-08 23:20:20.097+00
244	1	delete_graduate	graduate	99	\N	2026-03-08 23:20:21.604+00
245	1	delete_graduate	graduate	104	\N	2026-03-08 23:20:23.569+00
246	1	delete_graduate	graduate	102	\N	2026-03-08 23:20:24.948+00
247	1	delete_graduate	graduate	101	\N	2026-03-08 23:20:26.515+00
248	1	delete_graduate	graduate	109	\N	2026-03-08 23:20:28.068+00
249	1	delete_graduate	graduate	111	\N	2026-03-08 23:20:29.85+00
250	1	delete_graduate	graduate	110	\N	2026-03-08 23:20:31.72+00
251	1	delete_graduate	graduate	114	\N	2026-03-08 23:20:33.121+00
252	1	delete_graduate	graduate	108	\N	2026-03-08 23:20:34.679+00
253	1	delete_graduate	graduate	115	\N	2026-03-08 23:20:36.291+00
254	1	delete_graduate	graduate	106	\N	2026-03-08 23:20:37.853+00
255	1	delete_graduate	graduate	103	\N	2026-03-08 23:20:39.423+00
256	1	delete_graduate	graduate	107	\N	2026-03-08 23:20:40.823+00
257	1	delete_graduate	graduate	112	\N	2026-03-08 23:20:42.289+00
258	1	delete_graduate	graduate	113	\N	2026-03-08 23:20:43.747+00
259	1	delete_graduate	graduate	117	\N	2026-03-08 23:20:45.336+00
260	1	delete_graduate	graduate	118	\N	2026-03-08 23:20:47.506+00
261	1	delete_graduate	graduate	18	\N	2026-03-08 23:20:58.819+00
262	1	delete_graduate	graduate	20	\N	2026-03-08 23:21:02.177+00
263	1	delete_graduate	graduate	19	\N	2026-03-08 23:21:04.008+00
264	1	delete_graduate	graduate	21	\N	2026-03-08 23:21:05.971+00
265	1	delete_graduate	graduate	23	\N	2026-03-08 23:21:08.181+00
266	1	delete_graduate	graduate	22	\N	2026-03-08 23:21:19.518+00
267	1	delete_graduate	graduate	91	\N	2026-03-08 23:21:21.066+00
268	1	delete_graduate	graduate	98	\N	2026-03-08 23:21:22.7+00
269	1	delete_graduate	graduate	105	\N	2026-03-08 23:21:24.336+00
270	1	map_export	map	\N	{"format":"xlsx"}	2026-03-08 23:21:43.534+00
271	1	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"year","gender_mode":"year","rows":6}	2026-03-08 23:21:47.518+00
273	1	login	system	\N	\N	2026-03-08 23:39:29.47+00
274	5	register	user	5	\N	2026-03-08 23:50:07.367+00
275	5	verify_email	user	5	\N	2026-03-08 23:50:16.954+00
276	1	update_user	user	5	{"changed":["admin_approved"]}	2026-03-08 23:51:35.913+00
277	1	update_user	user	5	{"changed":["role"]}	2026-03-08 23:51:40.729+00
278	5	login	system	\N	\N	2026-03-09 00:01:08.363+00
279	5	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":51}	2026-03-09 00:04:22.489+00
280	5	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"year","gender_mode":"year","rows":6}	2026-03-09 00:08:20.161+00
281	1	login	system	\N	\N	2026-03-09 13:09:55.777+00
282	1	login	system	\N	\N	2026-03-09 13:39:15.33+00
283	1	login	system	\N	\N	2026-03-09 14:22:52.564+00
284	1	login	system	\N	\N	2026-03-09 14:40:39.33+00
285	1	import_graduates	graduate	\N	{"file":"graduates-import-template.xlsx","total_rows":1,"inserted":0,"updated":0,"skipped":1,"errors":2}	2026-03-09 14:46:47.934+00
286	1	import_graduates	graduate	\N	{"file":"graduates-import-template.xlsx","total_rows":1,"inserted":0,"updated":0,"skipped":1,"errors":2}	2026-03-09 14:46:58.69+00
287	1	login	system	\N	\N	2026-03-09 15:22:36.564+00
288	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":94,"selected":0}	2026-03-09 15:24:54.049+00
289	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":94,"selected":0}	2026-03-09 15:25:39.589+00
290	1	login	system	\N	\N	2026-03-09 15:38:56.458+00
291	1	login	system	\N	\N	2026-03-09 16:01:43.251+00
292	1	login	system	\N	\N	2026-03-09 16:03:37.258+00
293	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":94,"selected":0}	2026-03-09 16:04:57.254+00
294	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1}	2026-03-09 16:05:12.813+00
295	1	login	system	\N	\N	2026-03-09 16:22:47.509+00
296	1	login	system	\N	\N	2026-03-09 16:28:40.105+00
297	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":94,"selected":0}	2026-03-09 16:30:29.62+00
298	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":94,"selected":0}	2026-03-09 16:32:30.013+00
299	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1}	2026-03-09 16:32:37.704+00
300	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":43,"selected":43}	2026-03-09 16:33:48.579+00
301	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":5,"selected":5}	2026-03-09 16:50:30.64+00
302	1	login	system	\N	\N	2026-03-09 17:12:54.864+00
303	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":94,"selected":0}	2026-03-09 17:22:12.13+00
304	1	login	system	\N	\N	2026-03-09 17:33:21.932+00
305	1	login	system	\N	\N	2026-03-09 17:38:03.935+00
306	1	login	system	\N	\N	2026-03-09 18:05:49.829+00
307	1	login	system	\N	\N	2026-03-09 18:08:52.376+00
308	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":94,"selected":0}	2026-03-09 18:09:47.066+00
309	1	login	system	\N	\N	2026-03-09 18:42:56.584+00
310	1	delete_graduate	graduate	116	\N	2026-03-09 18:43:26.415+00
311	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":93,"selected":0}	2026-03-09 18:44:22.435+00
312	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1}	2026-03-09 18:44:41.218+00
313	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":6,"selected":0}	2026-03-09 18:45:46.516+00
314	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":93,"selected":0}	2026-03-09 18:46:32.97+00
315	1	login	system	\N	\N	2026-03-09 19:50:04.492+00
316	1	login	system	\N	\N	2026-03-10 15:01:58.332+00
317	1	login	system	\N	\N	2026-03-10 20:58:03.949+00
318	1	login	system	\N	\N	2026-03-10 21:32:07.142+00
319	1	login	system	\N	\N	2026-03-11 17:15:26.191+00
320	1	login	system	\N	\N	2026-03-12 12:29:20.013+00
321	1	login	system	\N	\N	2026-03-12 12:31:40.206+00
322	1	update_profile	user	1	\N	2026-03-12 12:32:29.411+00
323	1	update_profile	user	1	\N	2026-03-12 12:32:42.763+00
324	1	login	system	\N	\N	2026-03-12 13:30:03.955+00
325	1	login	system	\N	\N	2026-03-12 13:49:25.879+00
326	1	login	system	\N	\N	2026-03-12 13:49:56.358+00
327	1	update_profile	user	1	\N	2026-03-12 13:50:20.236+00
328	1	login	system	\N	\N	2026-03-12 14:02:53.256+00
329	1	login	system	\N	\N	2026-03-12 14:21:10.417+00
330	1	login	system	\N	\N	2026-03-12 14:27:39.514+00
331	1	login	system	\N	\N	2026-03-12 14:40:39.301+00
332	1	login	system	\N	\N	2026-03-12 14:54:52.214+00
333	1	login	system	\N	\N	2026-03-12 15:35:22.502+00
334	1	login	system	\N	\N	2026-03-12 15:46:18.511+00
335	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-12 15:47:15.88+00
336	1	login	system	\N	\N	2026-03-12 16:05:02.215+00
337	1	login	system	\N	\N	2026-03-12 16:15:48.41+00
338	1	login	system	\N	\N	2026-03-12 16:25:03.004+00
339	1	login	system	\N	\N	2026-03-12 16:50:14.034+00
340	1	login	system	\N	\N	2026-03-12 16:55:34.331+00
341	1	login	system	\N	\N	2026-03-12 17:02:10.195+00
342	1	login	system	\N	\N	2026-03-12 17:45:58.301+00
343	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":7,"inserted":7,"updated":0,"skipped":0,"errors":0}	2026-03-12 17:47:33.11+00
344	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":10,"inserted":0,"updated":0,"skipped":10,"errors":20}	2026-03-12 17:51:47.993+00
345	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":10,"inserted":0,"updated":0,"skipped":10,"errors":20}	2026-03-12 17:52:02.731+00
346	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":10,"inserted":10,"updated":0,"skipped":0,"errors":0}	2026-03-12 17:56:46.503+00
347	1	login	system	\N	\N	2026-03-12 18:42:24.722+00
348	1	login	system	\N	\N	2026-03-12 18:53:46.325+00
349	1	login	system	\N	\N	2026-03-12 19:02:14.127+00
350	1	login	system	\N	\N	2026-03-12 19:10:05.619+00
351	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":110,"selected":0}	2026-03-12 19:10:49.554+00
352	1	import_graduates	graduate	\N	{"file":"graduates_broader_years.xlsx","total_rows":110,"inserted":0,"updated":110,"skipped":0,"errors":0}	2026-03-12 19:20:12.538+00
353	1	login	system	\N	\N	2026-03-12 19:34:24.522+00
354	1	login	system	\N	\N	2026-03-12 19:42:01.118+00
355	1	login	system	\N	\N	2026-03-12 20:08:01.73+00
356	1	login	system	\N	\N	2026-03-13 16:04:45.521+00
357	1	update_study_program	study_program	2	{"code":"EU_CEID Π2","name_el":"Προόγραμμα σπουδών εισακτέοι 2015-2021","name_en":"Computer Engineering & Informatics Curriculum 2015–2021","is_active":true}	2026-03-13 16:07:30.52+00
358	1	login	system	\N	\N	2026-03-14 15:32:11.596+00
359	1	login	system	\N	\N	2026-03-16 17:31:25.856+00
360	1	login	system	\N	\N	2026-03-20 13:06:53.423+00
361	1	login	system	\N	\N	2026-03-20 13:27:09.522+00
362	1	login	system	\N	\N	2026-03-20 13:38:02.618+00
363	1	login	system	\N	\N	2026-03-20 14:12:17.904+00
364	1	login	system	\N	\N	2026-03-20 14:20:43.012+00
365	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":2,"selected":2}	2026-03-20 14:28:09.623+00
366	1	login	system	\N	\N	2026-03-20 14:36:34.396+00
367	1	login	system	\N	\N	2026-03-20 15:58:39.175+00
368	1	login	system	\N	\N	2026-03-20 16:36:31.178+00
369	1	login	system	\N	\N	2026-03-20 17:24:11.405+00
370	1	login	system	\N	\N	2026-03-20 17:51:59.806+00
371	1	login	system	\N	\N	2026-03-20 18:10:20.696+00
372	1	login	system	\N	\N	2026-03-20 18:35:28.684+00
373	1	login	system	\N	\N	2026-03-20 18:50:21.775+00
374	1	map_export	map	\N	{"format":"png"}	2026-03-20 18:52:26.567+00
375	1	map_export	map	\N	{"format":"png"}	2026-03-20 18:53:26.853+00
376	1	login	system	\N	\N	2026-03-20 19:09:56.381+00
377	1	login	system	\N	\N	2026-03-20 19:11:06.689+00
378	1	login	system	\N	\N	2026-03-21 10:27:21.214+00
379	1	login	system	\N	\N	2026-03-21 10:39:51.921+00
380	1	login	system	\N	\N	2026-03-21 11:23:24.433+00
381	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":110,"selected":0}	2026-03-21 11:23:27.917+00
\.


--
-- TOC entry 3465 (class 0 OID 16498)
-- Dependencies: 229
-- Data for Name: graduates; Type: TABLE DATA; Schema: public; Owner: alupla_db_user
--

COPY public.graduates (id, ad_code, last_name, first_name, father_name, degree_grade, graduation_date, oath_date, entry_year, student_number, birth_date, gender, study_program_id, program_direction_id, origin_region_id, origin_municipality, created_at, updated_at) FROM stdin;
1	1	Μπίρμπας	Παναγιώτης	Θεόδωρος	10.00	2021-03-09	2021-04-16	2017	1050360	1999-01-01	M	2	3	6	Λάρισσα	2026-03-04 14:14:23.142+00	2026-03-12 19:20:10.231+00
211	101	Παπαδόπουλος	Γεώργιος	Αντώνιος	8.75	2021-06-18	2021-07-02	2017	1050370	1999-01-01	M	2	3	1	Αθήνα	2026-03-12 17:47:32.929+00	2026-03-12 19:20:12.326+00
212	102	Καραγιάννη	Μαρία	Δημήτριος	9.12	2024-07-10	2024-07-24	2019	1050371	2001-01-01	F	2	4	2	Θεσσαλονίκη	2026-03-12 17:47:33.004+00	2026-03-12 19:20:12.413+00
213	103	Ιωαννίδης	Νικόλαος	Παναγιώτης	7.64	2022-05-28	2022-06-12	2016	1050372	1998-01-01	M	2	3	6	Λάρισα	2026-03-12 17:47:33.014+00	2026-03-12 19:20:12.417+00
214	104	Αλεξίου	Ελένη	Σπυρίδων	8.33	2023-06-25	2023-07-09	2019	1050373	2001-01-01	F	2	4	5	Ιωάννινα	2026-03-12 17:47:33.02+00	2026-03-12 19:20:12.421+00
215	105	Δημητρίου	Κωνσταντίνος	Ιωάννης	6.88	2023-04-30	2023-05-15	2018	1050374	2000-01-01	M	2	3	9	Χαλκίδα	2026-03-12 17:47:33.093+00	2026-03-12 19:20:12.425+00
216	106	Παπακώστα	Αναστασία	Γεώργιος	8.91	2025-07-03	2025-07-17	2019	1050375	2001-01-01	F	2	4	13	Ηράκλειο	2026-03-12 17:47:33.1+00	2026-03-12 19:20:12.428+00
217	107	Νικολάου	Αλέξανδρος	Σταύρος	7.42	2021-06-12	2021-06-26	2017	1050376	1999-01-01	M	2	3	7	Κέρκυρα	2026-03-12 17:47:33.105+00	2026-03-12 19:20:12.431+00
218	301	Παπαδόπουλος	Νίκος	Αντώνιος	8.12	2022-06-10	2022-06-24	2017	1050501	1999-01-01	M	2	3	1	Αθήνα	2026-03-12 17:56:46.315+00	2026-03-12 19:20:12.434+00
219	302	Ιωάννου	Μαρία	Δημήτριος	9.05	2025-07-05	2025-07-19	2019	1050502	2001-01-01	F	2	4	2	Θεσσαλονίκη	2026-03-12 17:56:46.321+00	2026-03-12 19:20:12.437+00
220	303	Καραγιάννης	Πέτρος	Νικόλαος	7.45	2020-05-29	2020-06-12	2016	1050503	1998-01-01	M	2	3	6	Λάρισα	2026-03-12 17:56:46.326+00	2026-03-12 19:20:12.441+00
221	304	Αλεξίου	Ελένη	Σπύρος	8.67	2024-06-20	2024-07-03	2019	1050504	2001-01-01	F	2	4	5	Ιωάννινα	2026-03-12 17:56:46.331+00	2026-03-12 19:20:12.515+00
222	305	Νικολάου	Ανδρέας	Παναγιώτης	6.95	2024-04-22	2024-05-06	2018	1050505	2000-01-01	M	2	3	9	Χαλκίδα	2026-03-12 17:56:46.393+00	2026-03-12 19:20:12.518+00
223	306	Κωστοπούλου	Άννα	Σταύρος	8.91	2023-07-02	2023-07-16	2019	1050506	2001-01-01	F	2	4	13	Ηράκλειο	2026-03-12 17:56:46.399+00	2026-03-12 19:20:12.521+00
224	307	Θεοδωρίδης	Γιώργος	Ιωάννης	7.33	2022-06-12	2022-06-26	2017	1050507	1999-01-01	M	2	3	7	Κέρκυρα	2026-03-12 17:56:46.403+00	2026-03-12 19:20:12.524+00
225	308	Παπακωνσταντίνου	Σοφία	Νικόλαος	8.61	2026-06-30	2026-07-14	2020	1050508	2002-01-01	F	2	4	10	Τρίπολη	2026-03-12 17:56:46.408+00	2026-03-12 19:20:12.528+00
226	309	Γεωργιάδης	Νικόλαος	Γεώργιος	7.82	2021-05-18	2021-06-01	2017	1050509	1999-01-01	M	2	3	8	Πάτρα	2026-03-12 17:56:46.496+00	2026-03-12 19:20:12.532+00
227	310	Παπαγεωργίου	Κατερίνα	Δημήτριος	9.14	2024-07-08	2024-07-22	2019	1050510	2001-01-01	F	2	4	9	Λαμία	2026-03-12 17:56:46.501+00	2026-03-12 19:20:12.536+00
119	18	Αθανασίου	Παναγιώτης	Ιωάννης	6.95	2022-05-31	2022-06-14	2017	15	1999-01-01	M	2	4	5	Ιωάννινα	2026-03-08 23:10:43.466+00	2026-03-12 19:20:10.318+00
120	20	Κωνσταντίνου	Σοφία	Χρήστος	9.10	2025-06-21	2025-07-04	2019	16	2001-01-01	F	2	3	2	Θεσσαλονίκη	2026-03-08 23:10:43.472+00	2026-03-12 19:20:10.322+00
121	22	Νικολάου	Αλέξανδρος	Παναγιώτης	7.55	2024-07-18	2024-08-01	2020	17	2002-01-01	M	2	4	7	Κέρκυρα	2026-03-08 23:10:43.481+00	2026-03-12 19:20:10.326+00
122	24	Χριστοπούλου	Κατερίνα	Στέφανος	8.05	2024-06-14	2024-06-28	2019	18	2001-01-01	F	2	3	13	Ηράκλειο	2026-03-08 23:10:43.489+00	2026-03-12 19:20:10.33+00
123	26	Βασιλείου	Νίκος	Ευάγγελος	6.40	2024-05-24	2024-06-06	2018	19	2000-01-01	M	2	4	9	Χαλκίδα	2026-03-08 23:10:43.495+00	2026-03-12 19:20:10.333+00
124	28	Οικονόμου	Αναστασία	Νικόλαος	8.60	2023-07-02	2023-07-16	2019	20	2001-01-01	F	2	4	10	Τρίπολη	2026-03-08 23:10:43.561+00	2026-03-12 19:20:10.414+00
125	30	Θεοδωρίδης	Γιώργος	Δημήτριος	6.98	2019-08-27	2019-10-09	2014	21	1996-01-01	M	2	4	1	Αθήνα	2026-03-08 23:10:43.566+00	2026-03-12 19:20:10.419+00
126	32	Χαρίτου	Στέφανος	Γεώργιος	8.41	2023-12-04	2024-01-18	2017	22	1999-01-01	M	2	3	8	Αίγιο	2026-03-08 23:10:43.576+00	2026-03-12 19:20:10.423+00
127	34	Σπυρόπουλος	Μαρία	Ανδρέας	8.79	2022-02-23	2022-03-04	2018	23	2000-01-01	F	2	3	2	Έδεσσα	2026-03-08 23:10:43.662+00	2026-03-12 19:20:10.429+00
128	36	Τσολάκης	Λευτέρης	Αθανάσιος	8.41	2022-08-28	2022-10-01	2017	24	1999-01-01	M	2	3	9	Θήβα	2026-03-08 23:10:43.668+00	2026-03-12 19:20:10.433+00
129	38	Αρβανιτάκη	Νάντια	Ιωάννης	6.28	2023-03-07	2023-03-12	2017	25	1999-01-01	F	2	4	5	Ηγουμενίτσα	2026-03-08 23:10:43.673+00	2026-03-12 19:20:10.515+00
130	40	Γρηγορίου	Ιωάννα	Χρήστος	6.84	2019-03-09	2019-03-13	2015	26	1997-01-01	F	2	3	9	Άμφισσα	2026-03-08 23:10:43.679+00	2026-03-12 19:20:10.521+00
131	42	Μαυρομάτης	Παναγιώτης	Παναγιώτης	7.08	2024-12-25	2025-02-06	2019	27	2001-01-01	M	2	3	1	Περιστέρι	2026-03-08 23:10:43.685+00	2026-03-12 19:20:10.528+00
132	44	Καραμήτρου	Βασιλική	Στέφανος	9.65	2024-04-02	2024-04-15	2018	28	2000-01-01	F	2	4	3	Καστοριά	2026-03-08 23:10:43.759+00	2026-03-12 19:20:10.534+00
133	46	Μουστάκας	Μιχάλης	Ευάγγελος	8.16	2022-07-27	2022-09-02	2018	29	2000-01-01	M	2	3	3	Γρεβενά	2026-03-08 23:10:43.764+00	2026-03-12 19:20:10.616+00
134	48	Νικολάου	Σοφία	Νικόλαος	9.44	2020-02-16	2020-02-26	2015	30	1997-01-01	F	2	3	7	Λευκάδα	2026-03-08 23:10:43.773+00	2026-03-12 19:20:10.621+00
135	50	Καρανάσιου	Αγγελική	Δημήτριος	9.44	2019-09-09	2019-10-22	2013	31	1995-01-01	F	2	4	2	Βέροια	2026-03-08 23:10:43.784+00	2026-03-12 19:20:10.625+00
136	52	Παπαδόπουλος	Ιωάννα	Γεώργιος	9.82	2019-10-09	2019-10-20	2015	32	1997-01-01	F	2	4	11	Ικαρία	2026-03-08 23:10:43.789+00	2026-03-12 19:20:10.629+00
137	54	Σπυρόπουλος	Νίκος	Ανδρέας	8.16	2024-05-15	2024-06-22	2019	33	2001-01-01	M	2	3	2	Βέροια	2026-03-08 23:10:43.795+00	2026-03-12 19:20:10.72+00
138	56	Γαλάνη	Δέσποινα	Αθανάσιος	9.51	2023-08-10	2023-09-10	2017	34	1999-01-01	F	2	3	3	Σιάτιστα	2026-03-08 23:10:43.857+00	2026-03-12 19:20:10.727+00
139	58	Αποστολίδης	Μυρτώ	Ιωάννης	8.11	2021-07-22	2021-08-04	2017	35	1999-01-01	F	2	3	12	Νάξος	2026-03-08 23:10:43.864+00	2026-03-12 19:20:10.734+00
140	60	Σαμαρά	Δανάη	Χρήστος	7.81	2021-12-31	2022-01-04	2016	36	1998-01-01	F	2	3	10	Σπάρτη	2026-03-08 23:10:43.87+00	2026-03-12 19:20:10.738+00
141	62	Δημοπούλου	Δημήτρης	Παναγιώτης	6.24	2023-06-16	2023-07-07	2017	37	1999-01-01	M	2	3	5	Μέτσοβο	2026-03-08 23:10:43.957+00	2026-03-12 19:20:10.744+00
142	64	Αγγελίδης	Χριστίνα	Στέφανος	8.89	2024-12-26	2025-01-25	2020	38	2002-01-01	F	2	4	4	Κομοτηνή	2026-03-08 23:10:43.966+00	2026-03-12 19:20:10.815+00
143	66	Καρβούνης	Πέτρος	Ευάγγελος	7.64	2022-03-15	2022-04-25	2017	39	1999-01-01	M	2	4	12	Νάξος	2026-03-08 23:10:43.973+00	2026-03-12 19:20:10.82+00
144	68	Τριανταφύλλου	Μιχάλης	Νικόλαος	8.15	2022-07-21	2022-08-01	2016	40	1998-01-01	M	2	3	2	Έδεσσα	2026-03-08 23:10:43.979+00	2026-03-12 19:20:10.823+00
145	70	Τσιώλης	Κωνσταντίνος	Δημήτριος	9.34	2018-01-12	2018-01-22	2014	41	1996-01-01	M	2	4	4	Σουφλί	2026-03-08 23:10:43.985+00	2026-03-12 19:20:10.832+00
146	72	Μαυρομάτης	Ελένη	Γεώργιος	6.01	2023-02-10	2023-03-11	2018	42	2000-01-01	F	2	4	3	Φλώρινα	2026-03-08 23:10:44.062+00	2026-03-12 19:20:10.836+00
147	74	Αργυρίου	Χριστίνα	Ανδρέας	8.94	2023-04-01	2023-04-04	2017	43	1999-01-01	F	2	4	9	Ιτέα	2026-03-08 23:10:44.07+00	2026-03-12 19:20:10.918+00
148	76	Παπανικολάου	Κωνσταντίνος	Αθανάσιος	9.41	2020-01-14	2020-01-18	2016	44	1998-01-01	M	2	3	10	Σπάρτη	2026-03-08 23:10:44.074+00	2026-03-12 19:20:10.923+00
149	78	Μαρινάκη	Νεκτάριος	Ιωάννης	8.63	2024-11-01	2024-11-21	2019	45	2001-01-01	M	2	4	4	Ξάνθη	2026-03-08 23:10:44.08+00	2026-03-12 19:20:11.013+00
150	80	Σιδηροπούλου	Κατερίνα	Χρήστος	7.20	2022-07-28	2022-07-28	2016	46	1998-01-01	F	2	3	2	Γιαννιτσά	2026-03-08 23:10:44.087+00	2026-03-12 19:20:11.021+00
152	84	Κυριαζίδης	Ολυμπία	Στέφανος	8.12	2026-03-17	2026-04-28	2021	48	2003-01-01	F	2	4	2	Θεσσαλονίκη	2026-03-08 23:10:44.099+00	2026-03-12 19:20:11.032+00
153	86	Καραλής	Αντώνης	Ευάγγελος	6.84	2023-12-09	2024-01-21	2017	49	1999-01-01	M	2	4	5	Ιωάννινα	2026-03-08 23:10:44.161+00	2026-03-12 19:20:11.036+00
154	88	Θεοδωρίδης	Πέτρος	Νικόλαος	6.18	2021-09-25	2021-11-04	2017	50	1999-01-01	M	2	4	9	Άμφισσα	2026-03-08 23:10:44.167+00	2026-03-12 19:20:11.116+00
155	90	Κυριακίδης	Μυρτώ	Δημήτριος	6.30	2021-11-24	2021-11-26	2016	51	1998-01-01	F	2	3	7	Ζάκυνθος	2026-03-08 23:10:44.173+00	2026-03-12 19:20:11.12+00
156	92	Κωνσταντίνου	Χρήστος	Γεώργιος	9.60	2024-01-25	2024-03-07	2018	52	2000-01-01	M	2	4	10	Κόρινθος	2026-03-08 23:10:44.184+00	2026-03-12 19:20:11.216+00
157	94	Σπυρόπουλος	Μιχάλης	Ανδρέας	9.90	2021-07-11	2021-07-12	2017	53	1999-01-01	M	2	4	13	Ιεράπετρα	2026-03-08 23:10:44.191+00	2026-03-12 19:20:11.221+00
158	96	Τσουκαλάς	Αντώνης	Αθανάσιος	6.43	2021-09-08	2021-09-22	2016	54	1998-01-01	M	2	4	5	Άρτα	2026-03-08 23:10:44.197+00	2026-03-12 19:20:11.226+00
159	98	Τριανταφύλλου	Γιώργος	Ιωάννης	7.59	2023-07-25	2023-08-11	2017	55	1999-01-01	M	2	4	11	Ικαρία	2026-03-08 23:10:44.267+00	2026-03-12 19:20:11.313+00
160	100	Αποστολίδης	Μαρία	Χρήστος	6.71	2019-06-23	2019-06-29	2015	56	1997-01-01	F	2	4	12	Θήρα	2026-03-08 23:10:44.274+00	2026-03-12 19:20:11.318+00
161	102	Λυμπερόπουλος	Ιρις	Παναγιώτης	6.46	2026-11-25	2026-12-11	2021	57	2003-01-01	F	2	4	1	Γλυφάδα	2026-03-08 23:10:44.282+00	2026-03-12 19:20:11.321+00
162	104	Βασιλείου	Λευτέρης	Στέφανος	9.80	2025-02-12	2025-03-04	2019	58	2001-01-01	M	2	4	11	Λήμνος	2026-03-08 23:10:44.286+00	2026-03-12 19:20:11.325+00
163	106	Καρράς	Μελίνα	Ευάγγελος	8.22	2019-07-19	2019-08-30	2015	59	1997-01-01	F	2	3	10	Άργος	2026-03-08 23:10:44.293+00	2026-03-12 19:20:11.417+00
164	108	Παπαδόπουλος	Μελίνα	Νικόλαος	7.22	2019-07-29	2019-09-04	2014	60	1996-01-01	F	2	4	8	Μεσολόγγι	2026-03-08 23:10:44.357+00	2026-03-12 19:20:11.423+00
165	110	Μακρόπουλος	Χριστίνα	Δημήτριος	9.17	2022-03-20	2022-03-25	2016	61	1998-01-01	F	2	4	2	Σέρρες	2026-03-08 23:10:44.365+00	2026-03-12 19:20:11.427+00
166	112	Πετράκη	Δέσποινα	Γεώργιος	6.59	2017-01-20	2017-02-19	2013	62	1995-01-01	F	2	4	7	Κεφαλονιά	2026-03-08 23:10:44.377+00	2026-03-12 19:20:11.431+00
167	114	Δούκα	Θανάσης	Ανδρέας	6.98	2021-09-01	2021-09-28	2016	63	1998-01-01	M	2	4	1	Γλυφάδα	2026-03-08 23:10:44.393+00	2026-03-12 19:20:11.434+00
168	116	Μακρή	Αλέξανδρος	Αθανάσιος	9.21	2025-12-08	2026-01-15	2019	64	2001-01-01	M	2	4	9	Λιβαδειά	2026-03-08 23:10:44.46+00	2026-03-12 19:20:11.515+00
169	118	Αποστολίδης	Μάριος	Ιωάννης	9.01	2022-10-30	2022-11-30	2018	65	2000-01-01	M	2	4	2	Καλαμαριά	2026-03-08 23:10:44.469+00	2026-03-12 19:20:11.519+00
170	120	Κούγιας	Δέσποινα	Χρήστος	7.28	2025-08-05	2025-08-13	2020	66	2002-01-01	F	2	4	12	Σύρος	2026-03-08 23:10:44.474+00	2026-03-12 19:20:11.526+00
171	122	Λεμονής	Δημήτρης	Παναγιώτης	7.32	2025-07-14	2025-07-17	2019	67	2001-01-01	M	2	4	13	Σητεία	2026-03-08 23:10:44.486+00	2026-03-12 19:20:11.53+00
172	124	Κανελλοπούλου	Σωτήρης	Στέφανος	6.02	2020-03-16	2020-04-09	2016	68	1998-01-01	M	2	3	8	Αγρίνιο	2026-03-08 23:10:44.497+00	2026-03-12 19:20:11.534+00
173	126	Δημητρίου	Ιρις	Ευάγγελος	7.56	2024-10-31	2024-11-29	2019	69	2001-01-01	F	2	3	7	Ιθάκη	2026-03-08 23:10:44.503+00	2026-03-12 19:20:11.538+00
174	128	Καρβούνης	Δημήτρης	Νικόλαος	6.54	2024-11-17	2024-11-20	2018	70	2000-01-01	M	2	4	4	Καβάλα	2026-03-08 23:10:44.561+00	2026-03-12 19:20:11.613+00
175	130	Μαυρομάτης	Νεφέλη	Δημήτριος	7.11	2021-01-28	2021-02-02	2017	71	1999-01-01	F	2	3	6	Βόλος	2026-03-08 23:10:44.568+00	2026-03-12 19:20:11.62+00
177	134	Παπαϊωάννου	Σωτήρης	Ανδρέας	8.80	2021-11-02	2021-12-10	2015	73	1997-01-01	M	2	3	5	Ιωάννινα	2026-03-08 23:10:44.581+00	2026-03-12 19:20:11.63+00
178	136	Παπακωνσταντίνου	Χρήστος	Αθανάσιος	9.63	2023-06-25	2023-08-09	2019	74	2001-01-01	M	2	3	2	Καλαμαριά	2026-03-08 23:10:44.586+00	2026-03-12 19:20:11.635+00
179	138	Σταυροπούλου	Ολυμπία	Ιωάννης	9.18	2022-06-26	2022-07-18	2017	75	1999-01-01	F	2	4	2	Γιαννιτσά	2026-03-08 23:10:44.662+00	2026-03-12 19:20:11.641+00
180	140	Μαρινάκη	Μαρία	Χρήστος	9.29	2020-08-01	2020-08-24	2014	76	1996-01-01	F	2	3	7	Ζάκυνθος	2026-03-08 23:10:44.673+00	2026-03-12 19:20:11.718+00
181	142	Βενιζέλου	Ολυμπία	Παναγιώτης	9.10	2022-08-04	2022-09-10	2018	77	2000-01-01	F	2	3	2	Βέροια	2026-03-08 23:10:44.681+00	2026-03-12 19:20:11.722+00
182	144	Παπαϊωάννου	Δέσποινα	Στέφανος	8.28	2022-04-24	2022-04-25	2017	78	1999-01-01	F	2	3	8	Αγρίνιο	2026-03-08 23:10:44.687+00	2026-03-12 19:20:11.725+00
183	146	Θεοδωρίδης	Βασιλική	Ευάγγελος	9.52	2021-12-05	2021-12-05	2015	79	1997-01-01	F	2	3	4	Ορεστιάδα	2026-03-08 23:10:44.697+00	2026-03-12 19:20:11.729+00
184	148	Γαλάνη	Αλεξάνδρα	Νικόλαος	8.76	2024-08-16	2024-08-17	2020	80	2002-01-01	F	2	3	7	Κεφαλονιά	2026-03-08 23:10:44.708+00	2026-03-12 19:20:11.733+00
185	150	Αργυρίου	Χρήστος	Δημήτριος	7.48	2023-11-09	2023-12-01	2018	81	2000-01-01	M	2	4	6	Ελασσόνα	2026-03-08 23:10:44.716+00	2026-03-12 19:20:11.817+00
186	152	Κωστοπούλου	Βασιλική	Γεώργιος	6.92	2020-04-03	2020-04-10	2014	82	1996-01-01	F	2	3	4	Αλεξανδρούπολη	2026-03-08 23:10:44.759+00	2026-03-12 19:20:11.82+00
187	154	Καραβίας	Βασιλική	Ανδρέας	9.91	2025-01-16	2025-02-03	2021	83	2003-01-01	F	2	4	4	Ξάνθη	2026-03-08 23:10:44.765+00	2026-03-12 19:20:11.825+00
188	156	Αρβανιτάκη	Χρήστος	Αθανάσιος	8.14	2020-06-30	2020-07-03	2015	84	1997-01-01	M	2	3	11	Λήμνος	2026-03-08 23:10:44.771+00	2026-03-12 19:20:11.828+00
189	158	Σταματίου	Γιώργος	Ιωάννης	7.88	2026-04-28	2026-05-09	2020	85	2002-01-01	M	2	4	2	Θεσσαλονίκη	2026-03-08 23:10:44.777+00	2026-03-12 19:20:11.833+00
190	160	Δεληγιάννης	Αλεξάνδρα	Χρήστος	8.52	2017-10-17	2017-10-26	2013	86	1995-01-01	F	2	3	4	Κομοτηνή	2026-03-08 23:10:44.79+00	2026-03-12 19:20:11.915+00
191	162	Μαθιός	Ολυμπία	Παναγιώτης	6.90	2023-06-08	2023-07-06	2018	87	2000-01-01	F	2	4	5	Κόνιτσα	2026-03-08 23:10:44.797+00	2026-03-12 19:20:12.015+00
192	164	Καραγιάννης	Νεκτάριος	Στέφανος	9.79	2022-02-14	2022-02-27	2016	88	1998-01-01	M	2	3	3	Φλώρινα	2026-03-08 23:10:44.802+00	2026-03-12 19:20:12.018+00
193	166	Σπυρόπουλος	Άρης	Ευάγγελος	6.01	2022-01-13	2022-02-12	2018	89	2000-01-01	M	2	3	5	Μέτσοβο	2026-03-08 23:10:44.864+00	2026-03-12 19:20:12.022+00
194	168	Τζιόλας	Ειρήνη	Νικόλαος	6.93	2023-02-14	2023-03-23	2018	90	2000-01-01	F	2	3	9	Χαλκίδα	2026-03-08 23:10:44.87+00	2026-03-12 19:20:12.025+00
195	170	Ζαχαρίου	Αντώνης	Δημήτριος	6.29	2020-03-25	2020-05-02	2014	91	1996-01-01	M	2	4	2	Έδεσσα	2026-03-08 23:10:44.876+00	2026-03-12 19:20:12.029+00
196	172	Χαρίτου	Μελίνα	Γεώργιος	8.16	2024-08-05	2024-09-12	2020	92	2002-01-01	F	2	4	10	Καλαμάτα	2026-03-08 23:10:44.882+00	2026-03-12 19:20:12.032+00
197	174	Παπακωνσταντίνου	Δημήτρης	Ανδρέας	9.34	2024-01-06	2024-01-07	2019	93	2001-01-01	M	2	3	13	Χανιά	2026-03-08 23:10:44.888+00	2026-03-12 19:20:12.035+00
198	176	Περικλής	Αγγελική	Αθανάσιος	9.66	2021-01-04	2021-01-31	2015	94	1997-01-01	F	2	4	6	Καρδίτσα	2026-03-08 23:10:44.96+00	2026-03-12 19:20:12.039+00
151	82	Αγγελίδης	Ιάσονας	Παναγιώτης	9.73	2019-01-20	2019-02-12	2015	47	1997-01-01	M	2	4	9	Άμφισσα	2026-03-08 23:10:44.093+00	2026-03-12 19:20:11.026+00
176	132	Δημητρίου	Κωνσταντίνος	Γεώργιος	9.80	2022-06-04	2022-07-13	2017	72	1999-01-01	M	2	3	8	Αμαλιάδα	2026-03-08 23:10:44.574+00	2026-03-12 19:20:11.625+00
199	178	Παναγιωτίδου	Νεφέλη	Ιωάννης	9.43	2020-07-10	2020-08-23	2016	95	1998-01-01	F	2	4	13	Σητεία	2026-03-08 23:10:44.969+00	2026-03-12 19:20:12.118+00
200	180	Κατσαρός	Απόστολος	Χρήστος	7.01	2022-07-02	2022-08-03	2017	96	1999-01-01	M	2	4	7	Κέρκυρα	2026-03-08 23:10:44.977+00	2026-03-12 19:20:12.121+00
201	182	Μαθιός	Ιάσονας	Παναγιώτης	9.03	2024-07-06	2024-07-19	2018	97	2000-01-01	M	2	3	5	Ηγουμενίτσα	2026-03-08 23:10:44.983+00	2026-03-12 19:20:12.124+00
202	184	Δημοπούλου	Αναστασία	Στέφανος	8.44	2018-10-24	2018-11-12	2014	98	1996-01-01	F	2	4	2	Σέρρες	2026-03-08 23:10:44.989+00	2026-03-12 19:20:12.128+00
203	186	Σιδηροπούλου	Απόστολος	Ευάγγελος	9.33	2023-03-09	2023-04-10	2018	99	2000-01-01	M	2	4	8	Αγρίνιο	2026-03-08 23:10:44.994+00	2026-03-12 19:20:12.131+00
204	188	Παππά	Μυρτώ	Νικόλαος	6.76	2027-10-17	2027-10-25	2021	100	2003-01-01	F	2	4	6	Καλαμπάκα	2026-03-08 23:10:45.065+00	2026-03-12 19:20:12.134+00
205	190	Σαραντίδου	Μαρία	Δημήτριος	7.19	2022-12-29	2023-02-09	2018	101	2000-01-01	F	2	4	9	Λιβαδειά	2026-03-08 23:10:45.071+00	2026-03-12 19:20:12.221+00
206	192	Τσιώλης	Νεφέλη	Γεώργιος	7.51	2023-11-24	2024-01-07	2018	102	2000-01-01	F	2	4	4	Σουφλί	2026-03-08 23:10:45.078+00	2026-03-12 19:20:12.224+00
207	194	Μακρόπουλος	Ελένη	Ανδρέας	8.82	2025-06-14	2025-07-26	2019	103	2001-01-01	F	2	3	3	Γρεβενά	2026-03-08 23:10:45.083+00	2026-03-12 19:20:12.228+00
208	196	Περικλής	Αναστασία	Αθανάσιος	6.40	2021-05-30	2021-06-08	2017	104	1999-01-01	F	2	3	2	Έδεσσα	2026-03-08 23:10:45.089+00	2026-03-12 19:20:12.314+00
209	198	Κοκκίνου	Νεφέλη	Ιωάννης	7.59	2018-04-16	2018-05-29	2013	105	1995-01-01	F	2	4	11	Άγιος Ευστράτιος	2026-03-08 23:10:45.099+00	2026-03-12 19:20:12.319+00
210	200	Μαθιός	Μυρτώ	Χρήστος	6.27	2022-01-02	2022-01-07	2016	106	1998-01-01	F	2	3	8	Αγρίνιο	2026-03-08 23:10:45.163+00	2026-03-12 19:20:12.322+00
\.


--
-- TOC entry 3461 (class 0 OID 16445)
-- Dependencies: 225
-- Data for Name: program_directions; Type: TABLE DATA; Schema: public; Owner: alupla_db_user
--

COPY public.program_directions (id, study_program_id, code, name_el, name_en, is_active) FROM stdin;
3	2	SW	Μηχανική Λογισμικού	Software Engineering	t
4	2	HW	Υλικό και Συστήματα	Hardware and Systems	t
\.


--
-- TOC entry 3463 (class 0 OID 16476)
-- Dependencies: 227
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: alupla_db_user
--

COPY public.regions (id, name, type, parent_id, latitude, longitude, created_at, updated_at) FROM stdin;
1	Αττική	PERIPHERY	\N	37.9838000	23.7275000	2026-03-02 17:21:07.577+00	2026-03-02 17:21:07.577+00
2	Κεντρική Μακεδονία	PERIPHERY	\N	40.6401000	22.9444000	2026-03-02 17:21:07.585+00	2026-03-02 17:21:07.585+00
3	Δυτική Μακεδονία	PERIPHERY	\N	40.3000000	21.7900000	2026-03-02 17:21:07.589+00	2026-03-02 17:21:07.589+00
4	Ανατολική Μακεδονία και Θράκη	PERIPHERY	\N	41.1200000	25.4050000	2026-03-02 17:21:07.592+00	2026-03-02 17:21:07.592+00
5	Ήπειρος	PERIPHERY	\N	39.6650000	20.8530000	2026-03-02 17:21:07.671+00	2026-03-02 17:21:07.671+00
6	Θεσσαλία	PERIPHERY	\N	39.6390000	22.4190000	2026-03-02 17:21:07.676+00	2026-03-02 17:21:07.676+00
7	Ιόνια Νησιά	PERIPHERY	\N	39.6240000	19.9210000	2026-03-02 17:21:07.68+00	2026-03-02 17:21:07.68+00
8	Δυτική Ελλάδα	PERIPHERY	\N	38.2466000	21.7346000	2026-03-02 17:21:07.682+00	2026-03-02 17:21:07.682+00
9	Στερεά Ελλάδα	PERIPHERY	\N	38.9000000	22.4330000	2026-03-02 17:21:07.686+00	2026-03-02 17:21:07.686+00
10	Πελοπόννησος	PERIPHERY	\N	37.5090000	22.3790000	2026-03-02 17:21:07.69+00	2026-03-02 17:21:07.69+00
11	Βόρειο Αιγαίο	PERIPHERY	\N	39.1000000	26.5500000	2026-03-02 17:21:07.694+00	2026-03-02 17:21:07.694+00
12	Νότιο Αιγαίο	PERIPHERY	\N	37.4400000	24.9400000	2026-03-02 17:21:07.771+00	2026-03-02 17:21:07.771+00
13	Κρήτη	PERIPHERY	\N	35.3387000	25.1442000	2026-03-02 17:21:07.775+00	2026-03-02 17:21:07.775+00
\.


--
-- TOC entry 3459 (class 0 OID 16427)
-- Dependencies: 223
-- Data for Name: study_programs; Type: TABLE DATA; Schema: public; Owner: alupla_db_user
--

COPY public.study_programs (id, code, name_el, name_en, is_active, created_at, updated_at) FROM stdin;
2	EU_CEID Π2	Προόγραμμα σπουδών εισακτέοι 2015-2021	Computer Engineering & Informatics Curriculum 2015–2021	t	2026-03-04 14:11:28.557497+00	2026-03-13 16:07:30.517+00
\.


--
-- TOC entry 3457 (class 0 OID 16404)
-- Dependencies: 221
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: alupla_db_user
--

COPY public.users (id, first_name, last_name, email, password_hash, role, is_active, email_verified, email_verification_token, email_verification_expires, password_reset_token, password_reset_expires, last_seen_at, created_at, updated_at, admin_approved) FROM stdin;
2	Secre	Tary	secretariat1@alupla.gr	$2a$10$6E3lDCJuA.3GHrYqQ3Bgouv8Jx1twltseDITvDDtyOgx8DWKfRcZe	secretariat	t	t	\N	\N	\N	\N	2026-03-07 14:31:21.115+00	2026-03-04 17:06:33.323+00	2026-03-07 14:31:21.115+00	t
1	Super	Admin	admin@alupla.gr	$2a$10$S8Kxk8jRMLVF3cnRgXI.8uaTY3JtxoztL6s24QJ2pIHhN.3J0PFjK	super_admin	t	t	\N	\N	\N	\N	2026-03-21 11:34:10.77+00	2026-03-02 17:50:54.999087+00	2026-03-21 11:34:10.77+00	t
5	E	P	papaioan@ceid.upatras.gr	$2a$10$bHfAql9L8dDj.jonfk3oquY0djDToWufqQUqOUPWgxQJn.k8UwOUO	super_admin	t	t	\N	\N	\N	\N	2026-03-09 00:06:54.628+00	2026-03-08 23:50:07.363+00	2026-03-09 00:06:54.628+00	t
\.


--
-- TOC entry 3484 (class 0 OID 0)
-- Dependencies: 230
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alupla_db_user
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 381, true);


--
-- TOC entry 3485 (class 0 OID 0)
-- Dependencies: 228
-- Name: graduates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alupla_db_user
--

SELECT pg_catalog.setval('public.graduates_id_seq', 227, true);


--
-- TOC entry 3486 (class 0 OID 0)
-- Dependencies: 224
-- Name: program_directions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alupla_db_user
--

SELECT pg_catalog.setval('public.program_directions_id_seq', 4, true);


--
-- TOC entry 3487 (class 0 OID 0)
-- Dependencies: 226
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alupla_db_user
--

SELECT pg_catalog.setval('public.regions_id_seq', 13, true);


--
-- TOC entry 3488 (class 0 OID 0)
-- Dependencies: 222
-- Name: study_programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alupla_db_user
--

SELECT pg_catalog.setval('public.study_programs_id_seq', 2, true);


--
-- TOC entry 3489 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alupla_db_user
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- TOC entry 3300 (class 2606 OID 16547)
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3298 (class 2606 OID 16520)
-- Name: graduates graduates_pkey; Type: CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.graduates
    ADD CONSTRAINT graduates_pkey PRIMARY KEY (id);


--
-- TOC entry 3293 (class 2606 OID 16458)
-- Name: program_directions program_directions_pkey; Type: CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.program_directions
    ADD CONSTRAINT program_directions_pkey PRIMARY KEY (id);


--
-- TOC entry 3296 (class 2606 OID 16486)
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- TOC entry 3289 (class 2606 OID 16443)
-- Name: study_programs study_programs_code_key; Type: CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.study_programs
    ADD CONSTRAINT study_programs_code_key UNIQUE (code);


--
-- TOC entry 3291 (class 2606 OID 16441)
-- Name: study_programs study_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.study_programs
    ADD CONSTRAINT study_programs_pkey PRIMARY KEY (id);


--
-- TOC entry 3285 (class 2606 OID 16425)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3287 (class 2606 OID 16423)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3294 (class 1259 OID 16464)
-- Name: program_directions_study_program_id_code; Type: INDEX; Schema: public; Owner: alupla_db_user
--

CREATE UNIQUE INDEX program_directions_study_program_id_code ON public.program_directions USING btree (study_program_id, code);


--
-- TOC entry 3306 (class 2606 OID 16548)
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3303 (class 2606 OID 16531)
-- Name: graduates graduates_origin_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.graduates
    ADD CONSTRAINT graduates_origin_region_id_fkey FOREIGN KEY (origin_region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3304 (class 2606 OID 16526)
-- Name: graduates graduates_program_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.graduates
    ADD CONSTRAINT graduates_program_direction_id_fkey FOREIGN KEY (program_direction_id) REFERENCES public.program_directions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3305 (class 2606 OID 16521)
-- Name: graduates graduates_study_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.graduates
    ADD CONSTRAINT graduates_study_program_id_fkey FOREIGN KEY (study_program_id) REFERENCES public.study_programs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3301 (class 2606 OID 16459)
-- Name: program_directions program_directions_study_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.program_directions
    ADD CONSTRAINT program_directions_study_program_id_fkey FOREIGN KEY (study_program_id) REFERENCES public.study_programs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3302 (class 2606 OID 16487)
-- Name: regions regions_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alupla_db_user
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3476 (class 0 OID 0)
-- Dependencies: 247
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT wal_buffers_full bigint, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT parallel_workers_to_launch bigint, OUT parallel_workers_launched bigint, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT wal_buffers_full bigint, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT parallel_workers_to_launch bigint, OUT parallel_workers_launched bigint, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO alupla_db_user;


--
-- TOC entry 3477 (class 0 OID 0)
-- Dependencies: 245
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO alupla_db_user;


--
-- TOC entry 2097 (class 826 OID 16391)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO alupla_db_user;


--
-- TOC entry 2099 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO alupla_db_user;


--
-- TOC entry 2098 (class 826 OID 16392)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO alupla_db_user;


--
-- TOC entry 2096 (class 826 OID 16390)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO alupla_db_user;


-- Completed on 2026-03-21 14:41:48

--
-- PostgreSQL database dump complete
--

\unrestrict v6W4mYGRc7zX12eSrtqdpRH0vgD2Y41qXmmvNEI36aqR5gzGtK0Rnrn3AI1uYqg

