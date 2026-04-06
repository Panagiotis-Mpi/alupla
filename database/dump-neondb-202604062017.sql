--
-- PostgreSQL database dump
--

\restrict hSirh4d4TD243q947Q37aR9tYveFengSJC8F54m2Ct9RWb0UOWLhxvoGeboeNzY

-- Dumped from database version 17.8 (a48d9ca)
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-06 20:17:17

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
-- TOC entry 3501 (class 1262 OID 16391)
-- Name: neondb; Type: DATABASE; Schema: -; Owner: neondb_owner
--

CREATE DATABASE neondb WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = builtin LOCALE = 'C.UTF-8' BUILTIN_LOCALE = 'C.UTF-8';


ALTER DATABASE neondb OWNER TO neondb_owner;

\unrestrict hSirh4d4TD243q947Q37aR9tYveFengSJC8F54m2Ct9RWb0UOWLhxvoGeboeNzY
\connect neondb
\restrict hSirh4d4TD243q947Q37aR9tYveFengSJC8F54m2Ct9RWb0UOWLhxvoGeboeNzY

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
-- TOC entry 5 (class 2615 OID 24711)
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO neondb_owner;

--
-- TOC entry 871 (class 1247 OID 24713)
-- Name: enum_graduates_gender; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.enum_graduates_gender AS ENUM (
    'M',
    'F'
);


ALTER TYPE public.enum_graduates_gender OWNER TO neondb_owner;

--
-- TOC entry 874 (class 1247 OID 24718)
-- Name: enum_regions_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.enum_regions_type AS ENUM (
    'COUNTRY',
    'PERIPHERY',
    'NOMOS',
    'DIMOS',
    'CITY',
    'FOREIGN_CITY'
);


ALTER TYPE public.enum_regions_type OWNER TO neondb_owner;

--
-- TOC entry 877 (class 1247 OID 24728)
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.enum_users_role AS ENUM (
    'super_admin',
    'secretariat'
);


ALTER TYPE public.enum_users_role OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 24733)
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.activity_logs OWNER TO neondb_owner;

--
-- TOC entry 219 (class 1259 OID 24738)
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO neondb_owner;

--
-- TOC entry 3504 (class 0 OID 0)
-- Dependencies: 219
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- TOC entry 220 (class 1259 OID 24739)
-- Name: graduates; Type: TABLE; Schema: public; Owner: neondb_owner
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
    updated_at timestamp with time zone NOT NULL,
    origin_city_region_id integer,
    origin_country_region_id integer,
    origin_periphery_region_id integer,
    origin_country character varying(120),
    origin_foreign_city character varying(120)
);


ALTER TABLE public.graduates OWNER TO neondb_owner;

--
-- TOC entry 221 (class 1259 OID 24744)
-- Name: graduates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.graduates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.graduates_id_seq OWNER TO neondb_owner;

--
-- TOC entry 3505 (class 0 OID 0)
-- Dependencies: 221
-- Name: graduates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.graduates_id_seq OWNED BY public.graduates.id;


--
-- TOC entry 222 (class 1259 OID 24745)
-- Name: program_directions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.program_directions (
    id integer NOT NULL,
    study_program_id integer NOT NULL,
    code character varying(50) NOT NULL,
    name_el character varying(255) NOT NULL,
    name_en character varying(255),
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.program_directions OWNER TO neondb_owner;

--
-- TOC entry 223 (class 1259 OID 24751)
-- Name: program_directions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.program_directions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.program_directions_id_seq OWNER TO neondb_owner;

--
-- TOC entry 3506 (class 0 OID 0)
-- Dependencies: 223
-- Name: program_directions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.program_directions_id_seq OWNED BY public.program_directions.id;


--
-- TOC entry 231 (class 1259 OID 40961)
-- Name: region_aliases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.region_aliases (
    id integer NOT NULL,
    region_id integer NOT NULL,
    alias character varying(255) NOT NULL,
    normalized_alias character varying(255) DEFAULT ''::character varying NOT NULL,
    alias_type character varying(30) DEFAULT 'manual'::character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.region_aliases OWNER TO neondb_owner;

--
-- TOC entry 230 (class 1259 OID 40960)
-- Name: region_aliases_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.region_aliases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.region_aliases_id_seq OWNER TO neondb_owner;

--
-- TOC entry 3507 (class 0 OID 0)
-- Dependencies: 230
-- Name: region_aliases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.region_aliases_id_seq OWNED BY public.region_aliases.id;


--
-- TOC entry 224 (class 1259 OID 24752)
-- Name: regions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    type public.enum_regions_type NOT NULL,
    parent_id integer,
    latitude numeric(10,7),
    longitude numeric(10,7),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    normalized_name character varying(255) DEFAULT ''::character varying NOT NULL,
    external_ref_id character varying(255)
);


ALTER TABLE public.regions OWNER TO neondb_owner;

--
-- TOC entry 225 (class 1259 OID 24755)
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.regions_id_seq OWNER TO neondb_owner;

--
-- TOC entry 3508 (class 0 OID 0)
-- Dependencies: 225
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- TOC entry 226 (class 1259 OID 24756)
-- Name: study_programs; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.study_programs OWNER TO neondb_owner;

--
-- TOC entry 227 (class 1259 OID 24762)
-- Name: study_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.study_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.study_programs_id_seq OWNER TO neondb_owner;

--
-- TOC entry 3509 (class 0 OID 0)
-- Dependencies: 227
-- Name: study_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.study_programs_id_seq OWNED BY public.study_programs.id;


--
-- TOC entry 233 (class 1259 OID 40977)
-- Name: unresolved_regions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.unresolved_regions (
    id integer NOT NULL,
    raw_name character varying(255) NOT NULL,
    normalized_raw_name character varying(255) DEFAULT ''::character varying NOT NULL,
    periphery_id integer,
    count integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    canonical_region_id integer,
    resolved_by_user_id integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    country_region_id integer
);


ALTER TABLE public.unresolved_regions OWNER TO neondb_owner;

--
-- TOC entry 232 (class 1259 OID 40976)
-- Name: unresolved_regions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.unresolved_regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unresolved_regions_id_seq OWNER TO neondb_owner;

--
-- TOC entry 3510 (class 0 OID 0)
-- Dependencies: 232
-- Name: unresolved_regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.unresolved_regions_id_seq OWNED BY public.unresolved_regions.id;


--
-- TOC entry 228 (class 1259 OID 24763)
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- TOC entry 229 (class 1259 OID 24771)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- TOC entry 3511 (class 0 OID 0)
-- Dependencies: 229
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3282 (class 2604 OID 24772)
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- TOC entry 3283 (class 2604 OID 24773)
-- Name: graduates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.graduates ALTER COLUMN id SET DEFAULT nextval('public.graduates_id_seq'::regclass);


--
-- TOC entry 3284 (class 2604 OID 24774)
-- Name: program_directions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.program_directions ALTER COLUMN id SET DEFAULT nextval('public.program_directions_id_seq'::regclass);


--
-- TOC entry 3294 (class 2604 OID 40964)
-- Name: region_aliases id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.region_aliases ALTER COLUMN id SET DEFAULT nextval('public.region_aliases_id_seq'::regclass);


--
-- TOC entry 3286 (class 2604 OID 24775)
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- TOC entry 3288 (class 2604 OID 24776)
-- Name: study_programs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.study_programs ALTER COLUMN id SET DEFAULT nextval('public.study_programs_id_seq'::regclass);


--
-- TOC entry 3297 (class 2604 OID 40980)
-- Name: unresolved_regions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.unresolved_regions ALTER COLUMN id SET DEFAULT nextval('public.unresolved_regions_id_seq'::regclass);


--
-- TOC entry 3290 (class 2604 OID 24777)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3480 (class 0 OID 24733)
-- Dependencies: 218
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
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
382	1	login	system	\N	\N	2026-03-22 20:56:51.161+00
383	1	login	system	\N	\N	2026-03-22 21:07:15.455+00
384	1	login	system	\N	\N	2026-03-22 21:46:37.9+00
385	1	login	system	\N	\N	2026-03-22 22:13:54.801+00
386	1	login	system	\N	\N	2026-03-22 22:33:16.25+00
387	1	login	system	\N	\N	2026-03-22 22:50:34.401+00
388	1	login	system	\N	\N	2026-03-24 14:15:11.561+00
389	1	login	system	\N	\N	2026-03-24 14:29:32.149+00
390	1	login	system	\N	\N	2026-03-24 15:15:54.349+00
391	1	login	system	\N	\N	2026-03-24 15:28:32.742+00
392	1	login	system	\N	\N	2026-03-24 15:41:53.64+00
393	1	login	system	\N	\N	2026-03-24 16:02:10.942+00
394	1	login	system	\N	\N	2026-03-24 16:22:44.493+00
395	1	login	system	\N	\N	2026-03-24 16:32:18.186+00
396	1	login	system	\N	\N	2026-03-24 16:59:08.212+00
397	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":110,"selected":0}	2026-03-24 17:00:02.548+00
398	1	login	system	\N	\N	2026-03-24 17:23:55.243+00
399	1	login	system	\N	\N	2026-03-24 17:36:53.85+00
400	1	login	system	\N	\N	2026-03-24 18:32:23.879+00
401	1	create_study_program	study_program	3	{"code":"EU_CEID Π3","name_el":"Προόγραμμα σπουδών εισακτέοι 2022-σήμερα"}	2026-03-24 18:38:57.012+00
402	1	create_program_direction	program_direction	5	{"study_program_id":3,"code":"SW","name_el":"Μηχανική Λογισμικού"}	2026-03-24 18:39:49.966+00
403	1	create_program_direction	program_direction	6	{"study_program_id":3,"code":"HW","name_el":"Υλικό και Συστήματα"}	2026-03-24 18:40:08.477+00
404	1	delete_program_direction	program_direction	5	{"code":"SW","name_el":"Μηχανική Λογισμικού","study_program_id":3}	2026-03-24 18:44:34.583+00
405	1	delete_program_direction	program_direction	6	{"code":"HW","name_el":"Υλικό και Συστήματα","study_program_id":3}	2026-03-24 18:44:39.317+00
406	1	create_program_direction	program_direction	7	{"study_program_id":3,"code":"Κ1","name_el":"Αλγοριθμικές Θεμελιώσεις και Ευφυής Υπολογιστική"}	2026-03-24 18:44:56.603+00
407	1	create_program_direction	program_direction	8	{"study_program_id":3,"code":"Κ2","name_el":"Δίκτυα και Επικοινωνίες"}	2026-03-24 18:45:20.498+00
408	1	create_program_direction	program_direction	9	{"study_program_id":3,"code":"Κ3","name_el":"Τεχνολογία της Πληροφορίας"}	2026-03-24 18:45:32.439+00
409	1	create_program_direction	program_direction	10	{"study_program_id":3,"code":"Κ4","name_el":"Τεχνολογία Υλικού & Αρχιτεκτονική Υπολογιστών"}	2026-03-24 18:45:56.102+00
410	1	create_program_direction	program_direction	11	{"study_program_id":3,"code":"Κ5","name_el":"Τεχνολογία και Συστήματα Λογισμικού"}	2026-03-24 18:46:11.181+00
411	1	create_program_direction	program_direction	12	{"study_program_id":3,"code":"Κ6","name_el":"Ευφυή Συστήματα και Ανάλυση Μεγάλων Δεδομένων"}	2026-03-24 18:46:38.052+00
412	1	login	system	\N	\N	2026-03-24 18:52:59.839+00
413	1	login	system	\N	\N	2026-03-24 19:10:39.069+00
414	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":110,"selected":0}	2026-03-24 19:12:20.425+00
415	1	create_program_direction	program_direction	13	{"study_program_id":2,"code":"CS","name_el":"Τομέας Εφαρμογών και Θεμελιώσεων της Επιστήμης των Υπολογιστών"}	2026-03-24 19:18:54.492+00
416	1	update_program_direction	program_direction	4	{"study_program_id":2,"code":"HW","name_el":"Τομέας Υλικού & Αρχιτεκτονικής","name_en":"Hardware and Systems","is_active":true}	2026-03-24 19:19:40.114+00
417	1	update_program_direction	program_direction	3	{"study_program_id":2,"code":"SW","name_el":"Τομέας Λογισμικού","name_en":"Software Engineering","is_active":true}	2026-03-24 19:20:00.689+00
418	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-24-19-12-21-plus-50.xlsx","total_rows":160,"inserted":50,"updated":110,"skipped":0,"errors":0}	2026-03-24 19:24:25.56+00
419	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":160,"selected":0}	2026-03-24 19:25:04.183+00
420	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":160,"inserted":0,"updated":160,"skipped":0,"errors":0}	2026-03-24 19:34:11.322+00
421	1	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"year","gender_mode":"year","rows":22}	2026-03-24 19:45:13.5+00
422	1	login	system	\N	\N	2026-03-24 19:51:06.212+00
424	1	login	system	\N	\N	2026-03-24 22:37:44.757+00
425	1	login	system	\N	\N	2026-03-24 22:58:11.008+00
426	1	login	system	\N	\N	2026-03-24 23:28:47.559+00
427	1	login	system	\N	\N	2026-03-25 00:07:07.432+00
428	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":160,"selected":0}	2026-03-25 00:12:17.363+00
429	1	login	system	\N	\N	2026-03-25 00:33:32.653+00
430	1	login	system	\N	\N	2026-03-25 01:04:14.958+00
431	1	login	system	\N	\N	2026-03-25 01:24:42.245+00
433	1	login	system	\N	\N	2026-03-25 01:43:24.428+00
434	1	login	system	\N	\N	2026-03-25 02:06:14.455+00
435	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":160,"selected":0}	2026-03-25 02:06:22.458+00
436	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":160,"inserted":0,"updated":160,"skipped":0,"errors":0}	2026-03-25 02:13:31.392+00
437	1	login	system	\N	\N	2026-03-25 18:16:27.355+00
438	1	login	system	\N	\N	2026-03-25 18:26:02.05+00
439	1	login	system	\N	\N	2026-03-25 18:58:45.799+00
440	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":160,"selected":0}	2026-03-25 19:00:01.908+00
441	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":160,"selected":0}	2026-03-25 19:00:09.713+00
442	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-25-19-00-02.xlsx","total_rows":160,"inserted":0,"updated":160,"skipped":0,"errors":0}	2026-03-25 19:02:29.279+00
443	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-25-19-00-09.csv","total_rows":160,"inserted":0,"updated":160,"skipped":0,"errors":0}	2026-03-25 19:03:26.237+00
444	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":160,"selected":0}	2026-03-25 19:04:39.088+00
445	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":160,"selected":0}	2026-03-25 19:04:52.438+00
446	1	login	system	\N	\N	2026-03-25 20:10:15.239+00
447	1	export_graduates	graduate	\N	{"format":"pdf","limit":5000,"count":160,"selected":0}	2026-03-25 20:10:53.979+00
448	1	login	system	\N	\N	2026-03-25 20:46:29.179+00
449	1	login	system	\N	\N	2026-03-25 21:23:08.282+00
450	1	login	system	\N	\N	2026-03-25 22:19:13.298+00
451	1	login	system	\N	\N	2026-03-25 22:51:50.489+00
452	1	login	system	\N	\N	2026-03-25 23:12:04.863+00
453	1	update_graduate	graduate	1	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-25 23:16:05.123+00
454	1	login	system	\N	\N	2026-03-25 23:24:11.276+00
455	1	login	system	\N	\N	2026-03-25 23:40:03.287+00
456	1	login	system	\N	\N	2026-03-25 23:59:33.369+00
457	1	login	system	\N	\N	2026-03-26 13:18:23.719+00
460	1	login	system	\N	\N	2026-03-26 13:49:11.548+00
461	1	login	system	\N	\N	2026-03-26 14:53:15.131+00
462	1	διαγραφή χρήστη	user	7	\N	2026-03-26 15:37:30.075+00
458	\N	register	user	7	\N	2026-03-26 13:47:51.459+00
459	\N	resend_verify_email	user	7	\N	2026-03-26 13:48:36.688+00
465	1	login	system	\N	\N	2026-03-26 15:41:06.63+00
466	1	login	system	\N	\N	2026-03-26 15:49:00.623+00
467	1	διαγραφή χρήστη	user	8	\N	2026-03-26 15:49:12.058+00
463	\N	register	user	8	\N	2026-03-26 15:38:43.596+00
464	\N	resend_verify_email	user	8	\N	2026-03-26 15:38:54.78+00
470	1	login	system	\N	\N	2026-03-26 16:04:30.815+00
471	1	διαγραφή χρήστη	user	9	\N	2026-03-26 16:04:37.92+00
468	\N	register	user	9	\N	2026-03-26 15:50:18.793+00
469	\N	resend_verify_email	user	9	\N	2026-03-26 15:50:36.998+00
474	1	login	system	\N	\N	2026-03-26 16:28:50.498+00
475	1	διαγραφή χρήστη	user	10	\N	2026-03-26 16:29:01.666+00
472	\N	register	user	10	\N	2026-03-26 16:05:06.685+00
473	\N	resend_verify_email	user	10	\N	2026-03-26 16:06:00.454+00
476	1	login	system	\N	\N	2026-03-27 13:09:23.255+00
477	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":160,"selected":0}	2026-03-27 13:18:57.338+00
478	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":160,"inserted":160,"updated":0,"skipped":0,"errors":0}	2026-03-27 13:23:42.383+00
479	1	login	system	\N	\N	2026-03-27 13:36:36.996+00
481	1	login	system	\N	\N	2026-03-27 13:39:54.096+00
482	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":320,"selected":0}	2026-03-27 13:42:06.794+00
483	1	login	system	\N	\N	2026-03-27 13:57:32.593+00
484	1	διαγραφή χρήστη	user	11	\N	2026-03-27 13:57:50.655+00
480	\N	register	user	11	\N	2026-03-27 13:38:32.724+00
487	1	login	system	\N	\N	2026-03-27 14:32:24.005+00
488	1	διαγραφή χρήστη	user	12	\N	2026-03-27 14:33:00.38+00
485	\N	register	user	12	\N	2026-03-27 13:58:28.017+00
486	\N	resend_verify_email	user	12	\N	2026-03-27 13:59:02.897+00
491	1	login	system	\N	\N	2026-03-27 15:23:22.803+00
492	1	διαγραφή χρήστη	user	13	\N	2026-03-27 15:23:38.58+00
489	\N	register	user	13	\N	2026-03-27 14:33:41.484+00
490	\N	resend_verify_email	user	13	\N	2026-03-27 14:34:01.134+00
494	1	login	system	\N	\N	2026-03-27 15:24:55.499+00
495	1	login	system	\N	\N	2026-03-27 15:41:38.284+00
496	1	διαγραφή χρήστη	user	14	\N	2026-03-27 15:41:59.628+00
493	\N	register	user	14	\N	2026-03-27 15:24:13.243+00
497	1	login	system	\N	\N	2026-03-27 16:05:35.494+00
499	1	login	system	\N	\N	2026-03-27 16:16:16.203+00
500	1	διαγραφή χρήστη	user	15	\N	2026-03-27 16:16:46.2+00
498	\N	register	user	15	\N	2026-03-27 16:06:38.244+00
501	16	register	user	16	\N	2026-03-27 16:20:08.969+00
502	1	login	system	\N	\N	2026-03-27 16:23:46.593+00
503	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":320,"selected":0}	2026-03-27 16:23:54.069+00
504	1	delete_graduate	graduate	130	\N	2026-03-27 16:29:35.822+00
505	1	delete_graduate	graduate	141	\N	2026-03-27 16:29:35.872+00
506	1	delete_graduate	graduate	140	\N	2026-03-27 16:29:35.91+00
507	1	delete_graduate	graduate	123	\N	2026-03-27 16:29:35.926+00
508	1	delete_graduate	graduate	154	\N	2026-03-27 16:29:35.956+00
509	1	delete_graduate	graduate	128	\N	2026-03-27 16:29:35.968+00
510	1	delete_graduate	graduate	119	\N	2026-03-27 16:29:36.018+00
511	1	delete_graduate	graduate	136	\N	2026-03-27 16:29:36.051+00
512	1	delete_graduate	graduate	145	\N	2026-03-27 16:29:36.068+00
513	1	delete_graduate	graduate	129	\N	2026-03-27 16:29:36.102+00
514	1	delete_graduate	graduate	146	\N	2026-03-27 16:29:36.115+00
515	1	delete_graduate	graduate	153	\N	2026-03-27 16:29:36.164+00
516	1	delete_graduate	graduate	121	\N	2026-03-27 16:29:36.193+00
517	1	delete_graduate	graduate	159	\N	2026-03-27 16:29:36.21+00
518	1	delete_graduate	graduate	122	\N	2026-03-27 16:29:36.249+00
519	1	delete_graduate	graduate	125	\N	2026-03-27 16:29:36.261+00
520	1	delete_graduate	graduate	127	\N	2026-03-27 16:29:36.311+00
521	1	delete_graduate	graduate	126	\N	2026-03-27 16:29:36.334+00
522	1	delete_graduate	graduate	132	\N	2026-03-27 16:29:36.352+00
523	1	delete_graduate	graduate	155	\N	2026-03-27 16:29:36.395+00
524	1	delete_graduate	graduate	149	\N	2026-03-27 16:29:36.408+00
525	1	delete_graduate	graduate	131	\N	2026-03-27 16:29:36.457+00
526	1	delete_graduate	graduate	151	\N	2026-03-27 16:29:36.475+00
527	1	delete_graduate	graduate	278	\N	2026-03-27 16:29:36.494+00
528	1	delete_graduate	graduate	158	\N	2026-03-27 16:29:36.541+00
529	1	delete_graduate	graduate	134	\N	2026-03-27 16:29:36.554+00
530	1	delete_graduate	graduate	139	\N	2026-03-27 16:29:36.603+00
531	1	delete_graduate	graduate	156	\N	2026-03-27 16:29:36.616+00
532	1	delete_graduate	graduate	144	\N	2026-03-27 16:29:36.637+00
533	1	delete_graduate	graduate	150	\N	2026-03-27 16:29:36.687+00
912	1	login	system	\N	\N	2026-04-01 14:26:25.48+00
913	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1}	2026-04-01 14:34:01.82+00
914	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-01-14-34-00.xlsx","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0}	2026-04-01 14:35:57.519+00
915	1	dismiss_unmatched_cities	region	\N	{"ids":[24]}	2026-04-01 14:36:33.083+00
918	1	login	system	\N	\N	2026-04-01 15:21:18.338+00
919	1	login	system	\N	\N	2026-04-01 15:38:00.737+00
922	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1}	2026-04-01 15:45:22.055+00
924	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-01-15-45-20.xlsx","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0}	2026-04-01 15:46:50.285+00
534	1	delete_graduate	graduate	135	\N	2026-03-27 16:29:36.701+00
535	1	delete_graduate	graduate	152	\N	2026-03-27 16:29:36.75+00
536	1	delete_graduate	graduate	133	\N	2026-03-27 16:29:36.757+00
537	1	delete_graduate	graduate	157	\N	2026-03-27 16:29:36.779+00
538	1	delete_graduate	graduate	148	\N	2026-03-27 16:29:36.833+00
539	1	delete_graduate	graduate	138	\N	2026-03-27 16:29:36.848+00
540	1	delete_graduate	graduate	137	\N	2026-03-27 16:29:36.898+00
541	1	delete_graduate	graduate	120	\N	2026-03-27 16:29:36.899+00
542	1	delete_graduate	graduate	160	\N	2026-03-27 16:29:36.921+00
543	1	delete_graduate	graduate	143	\N	2026-03-27 16:29:36.98+00
544	1	delete_graduate	graduate	124	\N	2026-03-27 16:29:36.995+00
545	1	delete_graduate	graduate	147	\N	2026-03-27 16:29:37.04+00
546	1	delete_graduate	graduate	142	\N	2026-03-27 16:29:37.044+00
560	1	delete_graduate	graduate	260	\N	2026-03-27 16:33:38.469+00
561	1	delete_graduate	graduate	223	\N	2026-03-27 16:33:38.537+00
562	1	delete_graduate	graduate	265	\N	2026-03-27 16:33:38.588+00
568	1	delete_graduate	graduate	248	\N	2026-03-27 16:33:38.731+00
569	1	delete_graduate	graduate	269	\N	2026-03-27 16:33:38.737+00
570	1	delete_graduate	graduate	249	\N	2026-03-27 16:33:38.88+00
571	1	delete_graduate	graduate	257	\N	2026-03-27 16:33:38.978+00
572	1	delete_graduate	graduate	197	\N	2026-03-27 16:33:39.025+00
573	1	delete_graduate	graduate	226	\N	2026-03-27 16:33:39.025+00
574	1	delete_graduate	graduate	255	\N	2026-03-27 16:33:39.051+00
575	1	delete_graduate	graduate	259	\N	2026-03-27 16:33:39.124+00
576	1	delete_graduate	graduate	245	\N	2026-03-27 16:33:39.169+00
577	1	delete_graduate	graduate	224	\N	2026-03-27 16:33:39.17+00
578	1	delete_graduate	graduate	210	\N	2026-03-27 16:33:39.198+00
579	1	delete_graduate	graduate	256	\N	2026-03-27 16:33:39.269+00
580	1	delete_graduate	graduate	190	\N	2026-03-27 16:33:39.305+00
581	1	delete_graduate	graduate	199	\N	2026-03-27 16:33:39.313+00
582	1	delete_graduate	graduate	183	\N	2026-03-27 16:33:39.314+00
583	1	delete_graduate	graduate	225	\N	2026-03-27 16:33:39.343+00
584	1	delete_graduate	graduate	185	\N	2026-03-27 16:33:39.414+00
585	1	delete_graduate	graduate	263	\N	2026-03-27 16:33:39.448+00
586	1	delete_graduate	graduate	230	\N	2026-03-27 16:33:39.457+00
587	1	delete_graduate	graduate	261	\N	2026-03-27 16:33:39.459+00
588	1	delete_graduate	graduate	187	\N	2026-03-27 16:33:39.49+00
589	1	delete_graduate	graduate	191	\N	2026-03-27 16:33:39.559+00
590	1	delete_graduate	graduate	171	\N	2026-03-27 16:33:39.592+00
591	1	delete_graduate	graduate	188	\N	2026-03-27 16:33:39.601+00
592	1	delete_graduate	graduate	196	\N	2026-03-27 16:33:39.604+00
593	1	delete_graduate	graduate	258	\N	2026-03-27 16:33:39.636+00
594	1	delete_graduate	graduate	271	\N	2026-03-27 16:33:39.705+00
595	1	delete_graduate	graduate	241	\N	2026-03-27 16:33:39.736+00
596	1	delete_graduate	graduate	176	\N	2026-03-27 16:33:39.745+00
597	1	delete_graduate	graduate	181	\N	2026-03-27 16:33:39.75+00
598	1	delete_graduate	graduate	247	\N	2026-03-27 16:33:39.782+00
599	1	delete_graduate	graduate	175	\N	2026-03-27 16:33:39.85+00
600	1	delete_graduate	graduate	177	\N	2026-03-27 16:33:39.879+00
601	1	delete_graduate	graduate	170	\N	2026-03-27 16:33:39.889+00
602	1	delete_graduate	graduate	168	\N	2026-03-27 16:33:39.895+00
603	1	delete_graduate	graduate	165	\N	2026-03-27 16:33:39.929+00
604	1	delete_graduate	graduate	251	\N	2026-03-27 16:33:39.995+00
605	1	delete_graduate	graduate	194	\N	2026-03-27 16:33:40.022+00
606	1	delete_graduate	graduate	264	\N	2026-03-27 16:33:40.032+00
608	1	delete_graduate	graduate	238	\N	2026-03-27 16:33:40.075+00
609	1	delete_graduate	graduate	276	\N	2026-03-27 16:33:40.166+00
610	1	delete_graduate	graduate	166	\N	2026-03-27 16:33:40.176+00
611	1	delete_graduate	graduate	189	\N	2026-03-27 16:33:40.221+00
645	1	delete_graduate	graduate	169	\N	2026-03-27 16:33:41.455+00
646	1	delete_graduate	graduate	174	\N	2026-03-27 16:33:41.473+00
647	1	delete_graduate	graduate	193	\N	2026-03-27 16:33:41.495+00
648	1	delete_graduate	graduate	192	\N	2026-03-27 16:33:41.539+00
649	1	delete_graduate	graduate	164	\N	2026-03-27 16:33:41.601+00
650	1	delete_graduate	graduate	253	\N	2026-03-27 16:33:41.617+00
651	1	delete_graduate	graduate	167	\N	2026-03-27 16:33:41.747+00
652	1	delete_graduate	graduate	205	\N	2026-03-27 16:33:41.748+00
653	1	delete_graduate	graduate	200	\N	2026-03-27 16:33:41.761+00
547	1	delete_graduate	graduate	267	\N	2026-03-27 16:33:35.409+00
548	1	delete_graduate	graduate	206	\N	2026-03-27 16:33:35.727+00
549	1	delete_graduate	graduate	254	\N	2026-03-27 16:33:35.728+00
550	1	delete_graduate	graduate	246	\N	2026-03-27 16:33:36.138+00
551	1	delete_graduate	graduate	208	\N	2026-03-27 16:33:36.443+00
552	1	delete_graduate	graduate	272	\N	2026-03-27 16:33:36.731+00
553	1	delete_graduate	graduate	218	\N	2026-03-27 16:33:37.088+00
554	1	delete_graduate	graduate	239	\N	2026-03-27 16:33:37.141+00
555	1	delete_graduate	graduate	228	\N	2026-03-27 16:33:37.379+00
556	1	delete_graduate	graduate	202	\N	2026-03-27 16:33:37.721+00
557	1	delete_graduate	graduate	204	\N	2026-03-27 16:33:38.032+00
558	1	delete_graduate	graduate	242	\N	2026-03-27 16:33:38.158+00
559	1	delete_graduate	graduate	274	\N	2026-03-27 16:33:38.163+00
563	1	delete_graduate	graduate	198	\N	2026-03-27 16:33:38.59+00
564	1	delete_graduate	graduate	233	\N	2026-03-27 16:33:38.593+00
565	1	delete_graduate	graduate	219	\N	2026-03-27 16:33:38.615+00
566	1	delete_graduate	graduate	250	\N	2026-03-27 16:33:38.686+00
567	1	delete_graduate	graduate	252	\N	2026-03-27 16:33:38.735+00
607	1	delete_graduate	graduate	180	\N	2026-03-27 16:33:40.04+00
612	1	delete_graduate	graduate	172	\N	2026-03-27 16:33:40.185+00
613	1	delete_graduate	graduate	201	\N	2026-03-27 16:33:40.287+00
614	1	delete_graduate	graduate	243	\N	2026-03-27 16:33:40.331+00
615	1	delete_graduate	graduate	178	\N	2026-03-27 16:33:40.367+00
616	1	delete_graduate	graduate	236	\N	2026-03-27 16:33:40.433+00
617	1	delete_graduate	graduate	203	\N	2026-03-27 16:33:40.454+00
618	1	delete_graduate	graduate	275	\N	2026-03-27 16:33:40.465+00
619	1	delete_graduate	graduate	237	\N	2026-03-27 16:33:40.476+00
620	1	delete_graduate	graduate	266	\N	2026-03-27 16:33:40.578+00
621	1	delete_graduate	graduate	262	\N	2026-03-27 16:33:40.597+00
622	1	delete_graduate	graduate	207	\N	2026-03-27 16:33:40.609+00
623	1	delete_graduate	graduate	273	\N	2026-03-27 16:33:40.621+00
624	1	delete_graduate	graduate	232	\N	2026-03-27 16:33:40.66+00
625	1	delete_graduate	graduate	229	\N	2026-03-27 16:33:40.741+00
626	1	delete_graduate	graduate	186	\N	2026-03-27 16:33:40.753+00
627	1	delete_graduate	graduate	227	\N	2026-03-27 16:33:40.767+00
628	1	delete_graduate	graduate	235	\N	2026-03-27 16:33:40.807+00
629	1	delete_graduate	graduate	234	\N	2026-03-27 16:33:40.87+00
630	1	delete_graduate	graduate	240	\N	2026-03-27 16:33:40.897+00
631	1	delete_graduate	graduate	209	\N	2026-03-27 16:33:40.912+00
632	1	delete_graduate	graduate	220	\N	2026-03-27 16:33:40.953+00
633	1	delete_graduate	graduate	182	\N	2026-03-27 16:33:41.015+00
634	1	delete_graduate	graduate	222	\N	2026-03-27 16:33:41.028+00
635	1	delete_graduate	graduate	244	\N	2026-03-27 16:33:41.1+00
636	1	delete_graduate	graduate	221	\N	2026-03-27 16:33:41.164+00
637	1	delete_graduate	graduate	277	\N	2026-03-27 16:33:41.172+00
638	1	delete_graduate	graduate	179	\N	2026-03-27 16:33:41.186+00
639	1	delete_graduate	graduate	231	\N	2026-03-27 16:33:41.246+00
640	1	delete_graduate	graduate	184	\N	2026-03-27 16:33:41.31+00
641	1	delete_graduate	graduate	268	\N	2026-03-27 16:33:41.315+00
642	1	delete_graduate	graduate	195	\N	2026-03-27 16:33:41.33+00
643	1	delete_graduate	graduate	270	\N	2026-03-27 16:33:41.349+00
644	1	delete_graduate	graduate	173	\N	2026-03-27 16:33:41.459+00
654	1	delete_graduate	graduate	433	\N	2026-03-27 16:34:36.752+00
655	1	delete_graduate	graduate	427	\N	2026-03-27 16:34:36.766+00
656	1	delete_graduate	graduate	424	\N	2026-03-27 16:34:36.781+00
657	1	delete_graduate	graduate	428	\N	2026-03-27 16:34:36.895+00
658	1	delete_graduate	graduate	432	\N	2026-03-27 16:34:36.897+00
659	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":165,"selected":0}	2026-03-27 16:34:52.379+00
660	1	login	system	\N	\N	2026-03-27 16:40:11.484+00
661	1	delete_graduate	graduate	211	\N	2026-03-27 16:42:43.211+00
662	1	delete_graduate	graduate	161	\N	2026-03-27 16:42:43.234+00
663	1	delete_graduate	graduate	214	\N	2026-03-27 16:42:43.251+00
664	1	delete_graduate	graduate	162	\N	2026-03-27 16:42:43.273+00
665	1	delete_graduate	graduate	213	\N	2026-03-27 16:42:43.341+00
666	1	delete_graduate	graduate	322	\N	2026-03-27 16:42:43.354+00
667	1	delete_graduate	graduate	215	\N	2026-03-27 16:42:43.381+00
668	1	delete_graduate	graduate	372	\N	2026-03-27 16:42:43.396+00
669	1	delete_graduate	graduate	163	\N	2026-03-27 16:43:24.287+00
670	1	delete_graduate	graduate	216	\N	2026-03-27 16:43:24.327+00
671	1	delete_graduate	graduate	217	\N	2026-03-27 16:43:24.356+00
672	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":154,"selected":0}	2026-03-27 16:43:32.037+00
673	1	login	system	\N	\N	2026-03-27 16:59:40.772+00
674	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":154,"selected":0}	2026-03-27 17:00:29.384+00
675	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":154,"selected":0}	2026-03-27 17:00:57.21+00
676	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":204,"inserted":50,"updated":152,"skipped":2,"errors":2}	2026-03-27 17:08:22.233+00
677	1	import_graduates	graduate	\N	{"file":"graduates_update.xlsx","total_rows":20,"inserted":0,"updated":20,"skipped":0,"errors":0}	2026-03-27 17:10:41.095+00
678	1	delete_graduate	graduate	376	\N	2026-03-27 17:12:57.738+00
679	1	delete_graduate	graduate	212	\N	2026-03-27 17:12:57.74+00
680	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":202,"selected":0}	2026-03-27 17:13:14.697+00
681	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":500,"inserted":298,"updated":202,"skipped":0,"errors":0}	2026-03-27 17:22:02.857+00
682	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":500,"selected":0}	2026-03-27 17:25:28.833+00
683	1	import_graduates	graduate	\N	{"file":"graduates.csv","total_rows":500,"inserted":0,"updated":500,"skipped":0,"errors":0}	2026-03-27 17:35:16.929+00
684	1	login	system	\N	\N	2026-03-27 17:48:06.068+00
685	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":500,"selected":0}	2026-03-27 17:48:29.115+00
686	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":500,"selected":0}	2026-03-27 17:50:57.534+00
687	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":500,"inserted":0,"updated":500,"skipped":0,"errors":0}	2026-03-27 18:04:24.862+00
688	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":500,"selected":0}	2026-03-27 18:06:47.405+00
689	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":500,"inserted":0,"updated":500,"skipped":0,"errors":0}	2026-03-27 18:07:40.505+00
690	1	login	system	\N	\N	2026-03-27 18:19:54.374+00
691	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":500,"selected":0}	2026-03-27 18:19:59.976+00
692	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-27-18-20-01.xlsx","total_rows":500,"inserted":0,"updated":500,"skipped":0,"errors":0}	2026-03-27 18:23:47.641+00
693	1	login	system	\N	\N	2026-03-28 10:22:45.932+00
694	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":500,"selected":0}	2026-03-28 10:22:53.074+00
695	1	import_graduates	graduate	\N	{"file":"graduates_updates.xlsx","total_rows":10,"inserted":0,"updated":10,"skipped":0,"errors":0}	2026-03-28 10:34:14.43+00
696	1	import_graduates	graduate	\N	{"file":"graduates_new.xlsx","total_rows":10,"inserted":10,"updated":0,"skipped":0,"errors":0}	2026-03-28 10:34:58.876+00
697	1	import_graduates	graduate	\N	{"file":"graduates_invalid.xlsx","total_rows":10,"inserted":0,"updated":0,"skipped":10,"errors":50}	2026-03-28 10:36:22.144+00
698	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":30,"inserted":0,"updated":20,"skipped":10,"errors":50}	2026-03-28 10:37:37.564+00
699	1	import_graduates	graduate	\N	{"file":"graduates_invalid.xlsx","total_rows":10,"inserted":0,"updated":0,"skipped":10,"errors":50}	2026-03-28 10:41:43.579+00
700	1	login	system	\N	\N	2026-03-28 10:58:16.933+00
701	1	import_graduates	graduate	\N	{"file":"graduates_invalid.xlsx","total_rows":10,"inserted":0,"updated":0,"skipped":10,"errors":50}	2026-03-28 10:58:57.772+00
702	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 11:04:26.039+00
703	1	login	system	\N	\N	2026-03-28 11:33:28.703+00
704	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 11:34:14.143+00
705	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 11:34:48.145+00
706	1	import_graduates	graduate	\N	{"file":"graduates_invalid.xlsx","total_rows":10,"inserted":0,"updated":0,"skipped":10,"errors":50}	2026-03-28 11:36:27.371+00
707	1	login	system	\N	\N	2026-03-28 11:46:37.365+00
708	1	login	system	\N	\N	2026-03-28 11:58:42.467+00
709	1	login	system	\N	\N	2026-03-28 12:13:05.856+00
710	1	login	system	\N	\N	2026-03-28 12:25:21.235+00
711	1	login	system	\N	\N	2026-03-28 12:43:07.922+00
712	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 12:44:39.604+00
713	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 12:45:18.24+00
714	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 13:09:45.867+00
715	1	login	system	\N	\N	2026-03-28 13:21:09.004+00
716	1	login	system	\N	\N	2026-03-28 13:45:29.81+00
717	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 13:45:57.673+00
718	1	login	system	\N	\N	2026-03-28 13:53:48.867+00
719	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 13:54:08.516+00
720	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 13:54:35.109+00
721	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 14:12:59.484+00
722	1	login	system	\N	\N	2026-03-28 14:24:58.033+00
723	1	login	system	\N	\N	2026-03-28 14:32:51.539+00
724	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 14:33:09.943+00
725	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 14:33:33.097+00
726	1	login	system	\N	\N	2026-03-28 14:36:36.347+00
727	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 14:37:47.902+00
728	1	login	system	\N	\N	2026-03-28 14:56:53.535+00
729	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 14:58:00.443+00
730	1	login	system	\N	\N	2026-03-28 15:15:39.583+00
731	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 15:16:16.328+00
732	1	login	system	\N	\N	2026-03-28 15:30:56.581+00
733	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 15:31:23.748+00
734	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 15:31:46.742+00
735	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 15:32:24.233+00
736	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 15:33:02.539+00
737	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 15:33:12.853+00
738	1	login	system	\N	\N	2026-03-28 21:54:50.27+00
739	1	login	system	\N	\N	2026-03-28 22:00:19.273+00
740	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 22:01:39.636+00
741	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":510,"inserted":0,"updated":509,"skipped":1,"errors":1}	2026-03-28 22:16:25.067+00
742	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 22:17:38.212+00
743	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":510,"inserted":0,"updated":374,"skipped":136,"errors":136}	2026-03-28 22:29:53.821+00
744	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 22:32:35.38+00
745	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":510,"inserted":0,"updated":510,"skipped":0,"errors":0}	2026-03-28 22:36:25.46+00
746	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 22:37:13.022+00
747	1	login	system	\N	\N	2026-03-28 22:49:12.32+00
748	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 22:49:44.477+00
749	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 22:50:41.779+00
750	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 22:53:15.718+00
751	1	login	system	\N	\N	2026-03-28 23:09:28.464+00
752	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 23:10:14.414+00
753	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 23:10:37.011+00
754	1	login	system	\N	\N	2026-03-28 23:12:25.363+00
755	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 23:13:17.114+00
756	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 23:13:34.811+00
757	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 23:14:22.111+00
758	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-28-23-14-19.xlsx","total_rows":510,"inserted":0,"updated":510,"skipped":0,"errors":0}	2026-03-28 23:17:50.468+00
759	1	login	system	\N	\N	2026-03-28 23:35:33.228+00
760	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 23:36:13.583+00
761	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":510,"selected":0}	2026-03-28 23:38:18.578+00
762	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":510,"selected":0}	2026-03-28 23:44:53.579+00
763	1	import_graduates	graduate	\N	{"file":"1_10_new_records.xlsx","total_rows":510,"inserted":10,"updated":0,"skipped":0,"errors":0}	2026-03-28 23:52:31.676+00
764	1	import_graduates	graduate	\N	{"file":"2_10_existing_changed_birth_dates.xlsx","total_rows":510,"inserted":0,"updated":10,"skipped":0,"errors":0}	2026-03-28 23:52:52.776+00
765	1	import_graduates	graduate	\N	{"file":"3_10_invalid_records.xlsx","total_rows":510,"inserted":5,"updated":0,"skipped":5,"errors":5}	2026-03-28 23:53:10.208+00
766	1	update_graduate	graduate	808	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_region_id","origin_municipality","created_at","updated_at"]}	2026-03-28 23:56:40.297+00
767	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-28 23:59:30.402+00
768	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-28 23:59:42.611+00
769	1	import_graduates	graduate	\N	{"file":"graduates_gaussian_years.xlsx","total_rows":510,"inserted":0,"updated":351,"skipped":159,"errors":159}	2026-03-29 00:07:38.811+00
770	1	import_graduates	graduate	\N	{"file":"graduates_smoothed_realistic_random.xlsx","total_rows":510,"inserted":0,"updated":340,"skipped":170,"errors":170}	2026-03-29 00:10:25.994+00
771	1	import_graduates	graduate	\N	{"file":"graduates_smoothed_years_proportional.xlsx","total_rows":510,"inserted":0,"updated":390,"skipped":120,"errors":120}	2026-03-29 00:23:29.112+00
772	1	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"year","gender_mode":"year","rows":32}	2026-03-29 00:28:42.759+00
773	1	login	system	\N	\N	2026-03-29 12:38:34.191+00
774	1	login	system	\N	\N	2026-03-29 13:00:15.968+00
775	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-29 13:00:27.916+00
776	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":2,"selected":2}	2026-03-29 13:00:51.923+00
777	1	login	system	\N	\N	2026-03-29 13:35:17.555+00
778	1	login	system	\N	\N	2026-03-29 13:57:49.856+00
779	1	login	system	\N	\N	2026-03-29 14:23:45.563+00
780	1	login	system	\N	\N	2026-03-29 18:42:53.712+00
781	1	login	system	\N	\N	2026-03-29 18:55:26.018+00
782	1	login	system	\N	\N	2026-03-29 19:19:41.71+00
783	\N	statistics_export	statistics	\N	{"format":"xls","graduation_year":null,"study_program_id":null,"gender":null,"age_group":null,"counts_mode":"year","gender_mode":"year","rows":32}	2026-03-29 21:04:39.463+00
784	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-03-29 21:43:54.772+00
785	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-03-29 21:45:15.24+00
786	\N	statistics_export	statistics	\N	{"format":"png"}	2026-03-29 21:45:31.232+00
787	\N	statistics_export	statistics	\N	{"format":"png"}	2026-03-29 21:47:01.76+00
788	\N	statistics_export	statistics	\N	{"format":"png"}	2026-03-29 22:16:46.121+00
789	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-03-29 22:24:51.158+00
790	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-03-29 22:25:28.226+00
791	1	login	system	\N	\N	2026-03-29 22:29:56.003+00
792	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-03-29 22:33:28.682+00
793	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-03-29 22:34:16.108+00
794	\N	statistics_export	statistics	\N	{"format":"png"}	2026-03-29 23:28:23.713+00
795	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-03-29 23:57:40.82+00
796	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-03-29 23:58:36.234+00
797	\N	statistics_export	statistics	\N	{"format":"png"}	2026-03-29 23:58:59.559+00
798	1	login	system	\N	\N	2026-03-30 16:19:14.941+00
799	1	login	system	\N	\N	2026-03-30 16:46:45.539+00
800	\N	map_export	map	\N	{"format":"png"}	2026-03-30 18:13:49.442+00
801	\N	map_export	map	\N	{"format":"png"}	2026-03-30 18:13:55.508+00
802	\N	map_export	map	\N	{"format":"xlsx"}	2026-03-30 18:14:07.246+00
803	\N	map_export	map	\N	{"format":"csv"}	2026-03-30 18:14:30.063+00
804	1	login	system	\N	\N	2026-03-30 23:21:54.515+00
805	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-30 23:22:25.961+00
806	1	map_export	map	\N	{"format":"xlsx"}	2026-03-30 23:26:59.999+00
807	1	map_export	map	\N	{"format":"csv"}	2026-03-30 23:27:37.641+00
808	1	map_export	map	\N	{"format":"png"}	2026-03-30 23:27:47.026+00
809	1	map_export	map	\N	{"format":"png"}	2026-03-30 23:28:14.005+00
810	\N	map_export	map	\N	{"format":"png"}	2026-03-30 23:41:02.611+00
811	\N	map_export	map	\N	{"format":"png"}	2026-03-30 23:41:21.486+00
812	\N	map_export	map	\N	{"format":"png"}	2026-03-30 23:50:58.355+00
813	\N	map_export	map	\N	{"format":"png"}	2026-03-30 23:51:08.142+00
814	\N	map_export	map	\N	{"format":"png"}	2026-03-30 23:51:24.069+00
815	\N	map_export	map	\N	{"format":"csv"}	2026-03-30 23:53:56.614+00
816	1	login	system	\N	\N	2026-03-31 01:23:59.535+00
817	1	login	system	\N	\N	2026-03-31 12:37:57.021+00
818	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 12:42:37.667+00
819	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":525,"selected":0}	2026-03-31 12:43:05.773+00
820	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 12:45:42.167+00
821	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":2,"selected":2}	2026-03-31 12:46:20.236+00
822	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":2,"selected":2}	2026-03-31 12:46:30.482+00
823	1	login	system	\N	\N	2026-03-31 13:18:39.4+00
824	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":525,"selected":0}	2026-03-31 13:19:44.052+00
825	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":525,"selected":0}	2026-03-31 13:20:15.285+00
826	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 13:20:50.462+00
827	1	login	system	\N	\N	2026-03-31 13:22:08.612+00
828	1	export_graduates	graduate	\N	{"format":"csv","limit":5000,"count":525,"selected":0}	2026-03-31 13:22:34.253+00
829	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":3,"selected":3}	2026-03-31 13:22:56.873+00
830	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":3,"selected":3}	2026-03-31 13:23:07.922+00
831	1	create_study_program	study_program	4	{"code":"ΠΠΣ 1980-1998","name_el":"Πρώτο προπτυχιακό πρόγραμμα σπουδών 1980 - 1998"}	2026-03-31 13:27:16.29+00
832	1	create_study_program	study_program	5	{"code":"ΠΠΣ 1998 - 2008","name_el":"Προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1998 - 2008"}	2026-03-31 13:29:16.156+00
833	1	update_study_program	study_program	4	{"code":"ΠΠΣ 1980-1998","name_el":"Πρώτο προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1980 - 1998","name_en":null,"is_active":false}	2026-03-31 13:29:50.747+00
834	1	create_study_program	study_program	6	{"code":"ΠΠΣ 2009 - 2014","name_el":"Προπτυχιακό πρόγραμμα σπουδών εισακτέοι 2009 -2014"}	2026-03-31 13:31:37.901+00
835	1	update_study_program	study_program	4	{"code":"ΠΠΣ 1980-1998","name_el":"Πρώτο προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1980 - 1997","name_en":null,"is_active":false}	2026-03-31 13:31:47.502+00
836	1	update_study_program	study_program	4	{"code":"ΠΠΣ 1980-1997","name_el":"Πρώτο προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1980 - 1997","name_en":null,"is_active":false}	2026-03-31 13:31:55.309+00
837	1	update_study_program	study_program	4	{"code":"ΠΠΣ 1980-1998","name_el":"Πρώτο προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1980 - 1998","name_en":null,"is_active":false}	2026-03-31 13:32:19.124+00
916	1	login	system	\N	\N	2026-04-01 14:41:47.888+00
917	1	login	system	\N	\N	2026-04-01 15:14:32.146+00
838	1	update_study_program	study_program	5	{"code":"ΠΠΣ 1998 - 2009","name_el":"Προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1998 - 2009","name_en":null,"is_active":false}	2026-03-31 13:32:34.37+00
843	1	update_study_program	study_program	5	{"code":"ΠΠΣ 1998-2009","name_el":"Προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1998-2009","name_en":null,"is_active":false}	2026-03-31 13:33:35.512+00
844	1	create_program_direction	program_direction	14	{"study_program_id":4,"code":"CS","name_el":"Τομέας Εφαρμογών και Θεμελιώσεων της Επιστήμης των Υπολογιστών"}	2026-03-31 13:34:24.216+00
845	1	create_program_direction	program_direction	15	{"study_program_id":4,"code":"HW","name_el":"Τομέας Υλικού & Αρχιτεκτονικής"}	2026-03-31 13:34:47.262+00
851	1	create_program_direction	program_direction	20	{"study_program_id":6,"code":"CS","name_el":"Τομέας Εφαρμογών και Θεμελιώσεων της Επιστήμης των Υπολογιστών"}	2026-03-31 13:37:13.606+00
852	1	create_program_direction	program_direction	21	{"study_program_id":6,"code":"HW","name_el":"Τομέας Υλικού & Αρχιτεκτονικής"}	2026-03-31 13:37:28.771+00
853	1	create_program_direction	program_direction	22	{"study_program_id":6,"code":"SW","name_el":"Τομέας Λογισμικού"}	2026-03-31 13:37:45.454+00
839	1	update_study_program	study_program	2	{"code":"EU_CEID Π2","name_el":"Προόγραμμα σπουδών εισακτέοι 2014-2021","name_en":"Computer Engineering & Informatics Curriculum 2015–2021","is_active":true}	2026-03-31 13:32:56.573+00
840	1	update_study_program	study_program	4	{"code":"ΠΠΣ 1980-1998","name_el":"Πρώτο προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1980-1998","name_en":null,"is_active":false}	2026-03-31 13:33:07.502+00
841	1	update_study_program	study_program	5	{"code":"ΠΠΣ 1998 - 2009","name_el":"Προπτυχιακό πρόγραμμα σπουδών εισακτέοι 1998-2009","name_en":null,"is_active":false}	2026-03-31 13:33:15.67+00
842	1	update_study_program	study_program	6	{"code":"ΠΠΣ 2009-2014","name_el":"Προπτυχιακό πρόγραμμα σπουδών εισακτέοι 2009-2014","name_en":null,"is_active":true}	2026-03-31 13:33:28.873+00
846	1	create_program_direction	program_direction	16	{"study_program_id":4,"code":"SW","name_el":"Τομέας Λογισμικού"}	2026-03-31 13:35:07.818+00
847	1	update_program_direction	program_direction	15	{"study_program_id":4,"code":"HW","name_el":"Τομέας Υλικού & Αρχιτεκτονικής","name_en":null,"is_active":false}	2026-03-31 13:35:17.052+00
848	1	create_program_direction	program_direction	17	{"study_program_id":5,"code":"CS","name_el":"Τομέας Εφαρμογών και Θεμελιώσεων της Επιστήμης των Υπολογιστών"}	2026-03-31 13:36:00.59+00
849	1	create_program_direction	program_direction	18	{"study_program_id":5,"code":"HW","name_el":"Τομέας Υλικού & Αρχιτεκτονικής"}	2026-03-31 13:36:17.506+00
850	1	create_program_direction	program_direction	19	{"study_program_id":5,"code":"SW","name_el":"Τομέας Λογισμικού"}	2026-03-31 13:36:32.957+00
854	1	login	system	\N	\N	2026-03-31 14:02:43.894+00
855	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 14:12:28.44+00
856	1	login	system	\N	\N	2026-03-31 14:15:33.79+00
857	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 14:17:51.034+00
858	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":525,"inserted":0,"updated":189,"skipped":336,"errors":336}	2026-03-31 14:27:16.014+00
859	1	update_study_program	study_program	2	{"code":"EU_CEID Π2","name_el":"Πρόγραμμα σπουδών εισακτέοι 2014-2021","name_en":"Computer Engineering & Informatics Curriculum 2015–2021","is_active":true}	2026-03-31 14:30:57.732+00
860	1	update_study_program	study_program	3	{"code":"EU_CEID Π3","name_el":"Πρόγραμμα σπουδών εισακτέοι 2022-σήμερα","name_en":null,"is_active":true}	2026-03-31 14:31:13.07+00
861	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":525,"inserted":0,"updated":525,"skipped":0,"errors":0}	2026-03-31 14:34:08.363+00
862	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 14:34:56.564+00
863	1	login	system	\N	\N	2026-03-31 15:02:39.861+00
864	1	login	system	\N	\N	2026-03-31 15:50:54.354+00
865	1	login	system	\N	\N	2026-03-31 16:01:52.146+00
866	1	login	system	\N	\N	2026-03-31 16:09:21.21+00
867	1	login	system	\N	\N	2026-03-31 16:54:30.196+00
868	1	login	system	\N	\N	2026-03-31 17:15:48.193+00
869	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":42,"selected":0}	2026-03-31 17:35:16.244+00
870	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-31-17-35-14.xlsx","total_rows":42,"inserted":0,"updated":42,"skipped":0,"errors":0}	2026-03-31 17:35:37.716+00
871	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1}	2026-03-31 17:36:12.452+00
872	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":1,"selected":1}	2026-03-31 17:36:17.24+00
873	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-31-17-36-15.csv","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0}	2026-03-31 17:36:44.982+00
874	1	login	system	\N	\N	2026-03-31 17:41:30.474+00
875	1	login	system	\N	\N	2026-03-31 18:03:30.034+00
876	1	login	system	\N	\N	2026-03-31 21:25:53.101+00
877	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 21:27:13.05+00
878	1	login	system	\N	\N	2026-03-31 21:42:46.595+00
879	1	import_graduates	graduate	\N	{"file":"graduates.xlsx","total_rows":525,"inserted":0,"updated":525,"skipped":0,"errors":0}	2026-03-31 21:50:07.582+00
880	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 21:52:44.535+00
881	1	login	system	\N	\N	2026-03-31 22:03:52.508+00
882	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 22:04:19.363+00
883	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-31-22-04-16.xlsx","total_rows":525,"inserted":0,"updated":525,"skipped":0,"errors":0}	2026-03-31 22:07:25.118+00
884	1	login	system	\N	\N	2026-03-31 22:21:06.142+00
885	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-03-31 22:21:14.893+00
886	1	import_graduates	graduate	\N	{"file":"graduates-2026-03-31-22-21-13.xlsx","total_rows":525,"inserted":0,"updated":525,"skipped":0,"errors":0}	2026-03-31 22:22:44.949+00
887	1	login	system	\N	\N	2026-03-31 22:47:59.242+00
888	1	login	system	\N	\N	2026-03-31 23:13:22.389+00
889	1	export_xlsx	logs	\N	{"format":"xlsx","count":888}	2026-03-31 23:14:24.544+00
890	1	export_csv	logs	\N	{"format":"csv","count":889}	2026-03-31 23:15:13.842+00
891	1	export_xlsx	logs	\N	{"format":"xlsx","count":890}	2026-03-31 23:21:23.444+00
892	1	export_csv	logs	\N	{"format":"csv","count":891}	2026-03-31 23:21:40.537+00
893	1	login	system	\N	\N	2026-03-31 23:39:13.201+00
894	1	export_xlsx	logs	\N	{"format":"xlsx","count":893}	2026-03-31 23:41:37.548+00
895	1	export_csv	logs	\N	{"format":"csv","count":894}	2026-03-31 23:42:06.652+00
896	1	export_xlsx	logs	\N	{"format":"xlsx","count":895}	2026-03-31 23:42:25.147+00
897	1	export_csv	logs	\N	{"format":"csv","count":896}	2026-03-31 23:42:54.247+00
898	1	login	system	\N	\N	2026-03-31 23:59:22.204+00
899	1	login	system	\N	\N	2026-04-01 00:11:03.897+00
900	1	export_xlsx	logs	\N	{"format":"xlsx","count":899}	2026-04-01 00:12:11.359+00
901	1	statistics_export	statistics	\N	{"format":"png"}	2026-04-01 00:12:57.826+00
902	1	request_password_reset	user	1	\N	2026-04-01 00:13:51.024+00
903	1	login	system	\N	\N	2026-04-01 13:33:32.52+00
904	1	login	system	\N	\N	2026-04-01 13:33:40.322+00
905	1	login	system	\N	\N	2026-04-01 13:34:50.921+00
906	1	dismiss_unmatched_cities	region	\N	{"ids":[1,2,6,3,4,7,8,5,9,10,11,13,20,18,14,16,23,19,21,22,17,12,15]}	2026-04-01 13:36:56.987+00
907	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-04-01 13:45:17.969+00
908	1	login	system	\N	\N	2026-04-01 13:59:04.965+00
909	1	dismiss_unmatched_cities	region	\N	{"ids":[1,2,6,3,4,7,8,5,9,10,11,13,20,18,14,16,23,19,21,22,17,12,15]}	2026-04-01 13:59:45.613+00
910	1	dismiss_unmatched_cities	region	\N	{"ids":[1]}	2026-04-01 14:00:26.642+00
911	1	dismiss_unmatched_cities	region	\N	{"ids":[2]}	2026-04-01 14:00:34.78+00
920	1	resolve_unmatched_city	region	81	{"unresolved_id":24,"raw_name":"Δίβρη"}	2026-04-01 15:38:41.667+00
921	1	login	system	\N	\N	2026-04-01 15:41:31.144+00
923	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-01-15-45-20.xlsx","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0}	2026-04-01 15:46:05.421+00
925	1	login	system	\N	\N	2026-04-01 15:54:11.739+00
926	1	resolve_unmatched_city	region	43	{"unresolved_id":25,"raw_name":"Χα"}	2026-04-01 15:54:35.291+00
927	1	login	system	\N	\N	2026-04-01 16:09:23.341+00
928	1	login	system	\N	\N	2026-04-01 16:24:35.944+00
929	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-01 23:08:11.335+00
930	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-01 23:08:51.577+00
931	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-04-01 23:09:50.516+00
932	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-01 23:29:44.27+00
933	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-01 23:30:17.773+00
934	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-01 23:30:37.819+00
935	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-04-01 23:30:52.364+00
936	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-04-01 23:31:20.104+00
937	\N	statistics_export	statistics	\N	{"format":"png"}	2026-04-01 23:31:46.986+00
938	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-04-01 23:45:21.913+00
939	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-01 23:46:00.645+00
940	\N	statistics_export	statistics	\N	{"format":"png"}	2026-04-01 23:46:15.746+00
941	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-04-01 23:55:13.465+00
942	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-01 23:55:49.16+00
943	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-04-01 23:56:15.188+00
944	\N	statistics_export	statistics	\N	{"format":"csv"}	2026-04-02 00:03:09.942+00
945	\N	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-02 00:03:35.952+00
946	1	login	system	\N	\N	2026-04-02 00:04:01.325+00
947	1	login	system	\N	\N	2026-04-02 00:15:42.831+00
948	1	login	system	\N	\N	2026-04-02 13:29:21.593+00
949	1	login	system	\N	\N	2026-04-02 14:11:10.393+00
950	1	login	system	\N	\N	2026-04-02 14:30:03.391+00
951	1	login	system	\N	\N	2026-04-02 15:43:26.425+00
952	1	export_graduates	graduate	\N	{"format":"xlsx","limit":5000,"count":525,"selected":0}	2026-04-02 15:45:12.786+00
953	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1}	2026-04-02 15:45:22.3+00
954	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-02-15-45-21.xlsx","total_rows":1,"inserted":0,"updated":0,"skipped":1,"errors":1}	2026-04-02 15:46:51.219+00
955	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-02-15-45-21.xlsx","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0}	2026-04-02 15:47:55.583+00
956	1	login	system	\N	\N	2026-04-02 16:15:36.395+00
957	1	login	system	\N	\N	2026-04-02 17:23:27.162+00
958	1	login	system	\N	\N	2026-04-02 17:32:47.374+00
959	1	login	system	\N	\N	2026-04-02 17:50:45.369+00
960	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1}	2026-04-02 17:52:21.361+00
961	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":525,"selected":525}	2026-04-02 17:56:46.708+00
962	1	import_graduates	graduate	\N	{"file":"graduates.csv","total_rows":545,"inserted":20,"updated":525,"skipped":0,"errors":0}	2026-04-02 18:05:40.151+00
963	1	statistics_export	statistics	\N	{"format":"xlsx"}	2026-04-02 18:22:39.729+00
964	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":545,"selected":545}	2026-04-02 18:23:26.716+00
965	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":545,"selected":545}	2026-04-02 18:24:34.123+00
966	1	import_graduates	graduate	\N	{"file":"graduates.csv","total_rows":150,"inserted":133,"updated":0,"skipped":17,"errors":17}	2026-04-02 18:38:42.864+00
967	\N	map_export	map	\N	{"format":"xlsx"}	2026-04-02 19:47:27.297+00
968	\N	map_export	map	\N	{"format":"xlsx"}	2026-04-02 19:47:57.791+00
969	\N	map_export	map	\N	{"format":"csv"}	2026-04-02 19:48:16.156+00
970	\N	map_export	map	\N	{"format":"png"}	2026-04-02 19:53:37.841+00
971	1	login	system	\N	\N	2026-04-02 20:00:15.663+00
972	1	import_study_programs	study_program	\N	{"inserted":1,"updated":0,"skipped":0}	2026-04-02 20:04:36.498+00
973	1	import_program_directions	program_direction	\N	{"inserted":1,"updated":0,"skipped":0}	2026-04-02 20:05:23.499+00
974	1	delete_program_direction	program_direction	23	{"code":"α","name_el":"α","study_program_id":7}	2026-04-02 20:05:42.003+00
975	1	delete_study_program	study_program	7	{"code":"α","name_el":"α"}	2026-04-02 20:05:49.702+00
976	\N	map_export	map	\N	{"format":"xlsx"}	2026-04-02 20:08:18.133+00
977	\N	map_export	map	\N	{"format":"csv"}	2026-04-02 20:11:04.615+00
978	\N	map_export	map	\N	{"format":"png"}	2026-04-02 20:11:45.004+00
979	\N	map_export	map	\N	{"format":"xlsx"}	2026-04-02 20:28:28.528+00
980	\N	map_export	map	\N	{"format":"csv"}	2026-04-02 20:29:43.125+00
981	\N	map_export	map	\N	{"format":"png"}	2026-04-02 20:30:28.609+00
982	\N	map_export	map	\N	{"format":"xlsx"}	2026-04-02 20:32:45.33+00
983	\N	map_export	map	\N	{"format":"xlsx"}	2026-04-02 20:50:25.707+00
984	\N	map_export	map	\N	{"format":"csv"}	2026-04-02 20:50:57.456+00
985	1	login	system	\N	\N	2026-04-02 20:54:42.299+00
986	18	register	user	18	\N	2026-04-02 21:17:26.303+00
987	18	login	system	\N	\N	2026-04-02 21:17:50.006+00
988	1	login	system	\N	\N	2026-04-02 21:20:09.506+00
989	1	διαγραφή χρήστη	user	2	\N	2026-04-02 21:20:51.955+00
22	\N	register	user	2	\N	2026-03-04 17:06:33.331+00
23	\N	verify_email	user	2	\N	2026-03-04 17:06:37.097+00
24	\N	login	system	\N	\N	2026-03-04 17:07:01.622+00
36	\N	login	system	\N	\N	2026-03-05 14:34:35.645+00
83	\N	login	system	\N	\N	2026-03-07 14:31:21.121+00
423	\N	login	system	\N	\N	2026-03-24 20:04:07.933+00
432	\N	login	system	\N	\N	2026-03-25 01:38:49.429+00
990	1	update_user	user	18	{"changed":["role"]}	2026-04-02 21:21:23.255+00
991	19	register	user	19	\N	2026-04-02 21:22:19.451+00
992	19	login	system	\N	\N	2026-04-02 21:22:34.212+00
993	\N	map_export	map	\N	{"format":"xlsx"}	2026-04-02 21:57:47.335+00
994	19	login	system	\N	\N	2026-04-02 22:00:16.568+00
995	18	login	system	\N	\N	2026-04-02 22:17:23.169+00
996	18	export_xlsx	logs	\N	{"format":"xlsx","count":995}	2026-04-02 22:18:20.521+00
997	1	login	system	\N	\N	2026-04-03 11:07:01.728+00
998	1	export_xlsx	logs	\N	{"format":"xlsx","count":997}	2026-04-03 11:08:07.767+00
999	1	export_csv	logs	\N	{"format":"csv","count":998}	2026-04-03 11:08:58.87+00
1000	1	login	system	\N	\N	2026-04-03 11:31:03.62+00
1001	1	login	system	\N	\N	2026-04-03 12:25:03.886+00
1002	1	login	system	\N	\N	2026-04-03 14:56:29.156+00
1003	1	login	system	\N	\N	2026-04-03 22:01:16.013+00
1004	1	login	system	\N	\N	2026-04-03 23:22:30.221+00
1005	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-03 23:35:54.43+00
1006	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-03 23:46:28.827+00
1007	1	export_xlsx	logs	\N	{"format":"xlsx","count":1006,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-03 23:53:20.677+00
1008	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-04 00:03:47.437+00
1009	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-04 00:03:51.436+00
1010	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-04 00:19:00.531+00
1011	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-04 00:20:23.131+00
1012	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-04 00:31:03.732+00
1013	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-04 00:41:28.936+00
1014	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 14:16:47.86+00
1015	1	export_xlsx	logs	\N	{"format":"xlsx","count":1014,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 14:23:08.366+00
1016	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 14:32:30.211+00
1017	1	export_xlsx	logs	\N	{"format":"xlsx","count":1016,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 14:32:46.319+00
1018	1	export_csv	logs	\N	{"format":"csv","count":1017,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 14:33:33.667+00
1019	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 14:42:23.271+00
1020	1	export_xlsx	logs	\N	{"format":"xlsx","count":1019,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 14:43:25.812+00
1021	1	export_csv	logs	\N	{"format":"csv","count":1020,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 14:43:50.07+00
1022	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 15:49:44.915+00
1023	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:06:49.788+00
1024	1	update_study_program	study_program	4	{"code":"ΠΠΣ 1980-1998","name_el":"Πρώτο πρόγραμμα προπτυχιακών σπουδών εισακτέοι 1980-1998","name_en":null,"is_active":false,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:11:57.913+00
1025	1	update_study_program	study_program	5	{"code":"ΠΠΣ 1998-2009","name_el":"Πρόγραμμα προπτυχιακών σπουδών εισακτέοι 1998-2009","name_en":null,"is_active":false,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:12:51.41+00
1026	1	update_study_program	study_program	6	{"code":"ΠΠΣ 2009-2014","name_el":"Πρόγραμμα προπτυχιακών σπουδών εισακτέοι 2009-2014","name_en":null,"is_active":true,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:13:16.817+00
1027	1	update_study_program	study_program	2	{"code":"EU_CEID Π2","name_el":"Πρόγραμμα προπτυχιακών σπουδών εισακτέοι 2014-2021","name_en":"Computer Engineering & Informatics Curriculum 2015–2021","is_active":true,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:13:39.88+00
1028	1	update_study_program	study_program	3	{"code":"EU_CEID Π3","name_el":"Πρόγραμμα προπτυχιακών σπουδών εισακτέοι 2022-σήμερα","name_en":null,"is_active":true,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:13:51.151+00
1029	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:24:16.476+00
1030	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":678,"selected":678,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:27:01.625+00
1031	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":678,"selected":678,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:32:07.438+00
1032	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:42:11.497+00
1033	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":678,"selected":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:42:41.579+00
1034	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":678,"selected":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:44:22.277+00
1035	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":678,"selected":678,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:46:42.746+00
1036	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":678,"selected":678,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:46:49.143+00
1037	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:46:57.21+00
1038	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:47:01.859+00
1039	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:52:07.509+00
1040	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":678,"selected":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:52:36.087+00
1041	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":678,"selected":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 16:52:43.653+00
1042	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 17:00:15.889+00
1043	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":678,"selected":678,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 17:00:28.711+00
1044	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 17:00:40.224+00
1045	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 17:31:16.258+00
1049	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 18:14:51.679+00
1051	1	delete_graduate	graduate	964	{"student_number":"13456457","actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 18:20:24.242+00
1052	1	διαγραφή χρήστη	user	20	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 18:24:19.374+00
1046	\N	register	user	20	{"actor_role":"secretariat","actor_name":"TeSt tEsT","actor_email":"aha@a.com"}	2026-04-05 17:40:38.433+00
1047	\N	login	system	\N	{"actor_role":"secretariat","actor_name":"TeSt tEsT","actor_email":"aha@a.com"}	2026-04-05 17:41:00.756+00
1048	\N	create_graduate	graduate	964	{"student_number":"13456457","actor_role":"secretariat","actor_name":"TeSt tEsT","actor_email":"aha@a.com"}	2026-04-05 17:43:53.469+00
1050	\N	change_password	user	20	{"actor_role":"secretariat","actor_name":"TeSt tEsT","actor_email":"aha@a.com"}	2026-04-05 18:18:30.174+00
1053	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 18:44:03.43+00
1054	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 19:04:25.867+00
1055	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 19:23:10.251+00
1057	1	διαγραφή χρήστη	user	21	{"target_name":"a a","actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 19:26:50.668+00
1056	\N	register	user	21	{"actor_role":"secretariat","actor_name":"a a","actor_email":"a@a.com"}	2026-04-05 19:25:25.098+00
1058	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 20:49:35.039+00
1059	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 21:23:11.591+00
1060	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 21:43:09.305+00
1061	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":678,"selected":678,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 21:46:59.652+00
1062	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":678,"selected":678,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 21:47:32.852+00
1063	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":678,"selected":678,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 21:47:52.772+00
1064	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 22:18:37.496+00
1065	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 22:21:04.727+00
1066	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 22:22:10.327+00
1067	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 22:22:24.497+00
1068	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 22:23:13.797+00
1069	1	create_graduate	graduate	965	{"student_number":"9","actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 22:30:33.381+00
1070	1	update_graduate	graduate	965	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_type","origin_foreign_country","origin_foreign_city","origin_country_region_id","origin_periphery_region_id","origin_region_id","origin_city_region_id","origin_municipality","created_at","updated_at"],"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 22:32:39.496+00
1071	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 22:59:19.12+00
1072	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 23:11:50.92+00
1073	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 23:40:01.391+00
1074	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":679,"selected":679,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 23:43:14.947+00
1075	1	update_graduate	graduate	965	{"changed":["id","ad_code","last_name","first_name","father_name","degree_grade","graduation_date","oath_date","entry_year","student_number","birth_date","gender","study_program_id","program_direction_id","origin_country","origin_foreign_city","origin_country_region_id","origin_periphery_region_id","origin_region_id","origin_city_region_id","origin_municipality","created_at","updated_at","origin_foreign_country","origin_type"],"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 23:44:55.457+00
1076	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":679,"selected":679,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 23:45:14.345+00
1077	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":679,"selected":679,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 23:45:39.351+00
1078	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-05 23:57:42.51+00
1079	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:00:11.543+00
1080	1	delete_graduate	graduate	965	{"student_number":"9","actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:03:14.229+00
1081	1	create_graduate	graduate	966	{"student_number":"j","actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:05:09.202+00
1082	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:17:43.242+00
1083	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:18:06.687+00
1084	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:18:36.589+00
1085	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:34:41.445+00
1086	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":2,"selected":2,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:34:57.408+00
1087	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":2,"selected":2,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:35:13.569+00
1088	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":2,"selected":2,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:35:24.97+00
1089	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":2,"selected":2,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 15:35:44.002+00
1090	1	login	system	\N	{"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:27:58.178+00
1091	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:32:51.601+00
1092	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-06-16-32-50.xlsx","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:33:04.268+00
1093	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:33:24.439+00
1094	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-06-16-33-21.csv","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:33:34.051+00
1095	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:33:41.505+00
1096	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-06-16-32-50.xlsx","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:34:43.13+00
1097	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-06-16-33-21.csv","total_rows":1,"inserted":0,"updated":1,"skipped":0,"errors":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:35:01.494+00
1098	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":1,"selected":1,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:35:08.751+00
1099	1	export_graduates	graduate	\N	{"format":"xlsx","limit":null,"count":2,"selected":2,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:35:33.354+00
1100	1	export_graduates	graduate	\N	{"format":"csv","limit":null,"count":2,"selected":2,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:35:47.511+00
1101	1	export_graduates	graduate	\N	{"format":"pdf","limit":null,"count":2,"selected":2,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:36:01.065+00
1102	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-06-16-35-31.xlsx","total_rows":2,"inserted":0,"updated":2,"skipped":0,"errors":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:36:29.142+00
1103	1	import_graduates	graduate	\N	{"file":"graduates-2026-04-06-16-35-46.csv","total_rows":2,"inserted":0,"updated":2,"skipped":0,"errors":0,"actor_role":"super_admin","actor_name":"Super Admin","actor_email":"admin@alupla.gr"}	2026-04-06 16:36:39.202+00
\.


--
-- TOC entry 3482 (class 0 OID 24739)
-- Dependencies: 220
-- Data for Name: graduates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.graduates (id, ad_code, last_name, first_name, father_name, degree_grade, graduation_date, oath_date, entry_year, student_number, birth_date, gender, study_program_id, program_direction_id, origin_region_id, origin_municipality, created_at, updated_at, origin_city_region_id, origin_country_region_id, origin_periphery_region_id, origin_country, origin_foreign_city) FROM stdin;
966	n	n	j	n	9.00	2024-01-01	2025-01-01	2018	j	2000-01-01	F	2	13	\N	\N	2026-04-06 15:05:08.907+00	2026-04-06 16:36:38.768+00	\N	116	\N	Κύπρος	a
297	54	Σπυρόπουλος	Νίκος	Ανδρέας	6.02	2021-03-04	2021-05-13	2013	1058324	1995-01-01	M	6	22	1	Αθήνα	2026-03-27 13:23:01.836+00	2026-04-02 18:04:23.329+00	38	116	1	Ελλάδα	\N
855	2061	Μαυρίδου	Άννα	Θεόδωρος	8.76	1993-09-15	1993-07-29	1988	1200030	1964-01-01	F	4	15	7	Ιθάκη	2026-04-02 18:38:27.136+00	2026-04-02 18:38:27.136+00	72	116	7	Ελλάδα	\N
876	2085	Καραγιάννη	Αγγελική	Κωνσταντίνος	8.96	1996-02-03	1995-11-27	1984	1200054	1965-01-01	F	4	15	1	Πειραιάς	2026-04-02 18:38:30.135+00	2026-04-02 18:38:30.135+00	39	116	1	Ελλάδα	\N
280	20	Κωνσταντίνου	Σοφία	Χρήστος	7.75	2024-08-04	2024-05-18	2012	1049541	1994-01-01	F	6	20	1	Αθήνα	2026-03-27 13:22:56.936+00	2026-04-02 18:04:20.854+00	38	116	1	Ελλάδα	\N
301	62	Δημοπούλου	Δημήτρης	Παναγιώτης	6.40	2014-08-22	2014-01-10	2009	1061941	1991-01-01	M	6	20	1	Αθήνα	2026-03-27 13:23:03.003+00	2026-04-02 18:04:23.915+00	38	116	1	Ελλάδα	\N
348	156	Αρβανιτάκη	Χρήστος	Αθανάσιος	6.28	2036-08-19	2036-09-28	2026	1072434	2008-01-01	M	3	10	1	Αθήνα	2026-03-27 13:23:16.561+00	2026-04-02 18:04:30.64+00	38	116	1	Ελλάδα	\N
407	330	Μανώλη	Άννα	Μιχαήλ	7.89	2021-01-04	2021-11-05	2012	1048613	1994-01-01	F	6	20	1	Αθήνα	2026-03-27 13:23:33.563+00	2026-04-02 18:04:38.944+00	38	116	1	Ελλάδα	\N
610	533	Ράπτη	Αθηνά	Ανδρέας	8.14	2034-09-04	2034-05-19	2023	1100285	2005-01-01	F	3	8	13	Ηράκλειο	2026-03-27 17:20:46.163+00	2026-04-02 18:05:07.824+00	50	116	13	Ελλάδα	\N
658	581	Καρανάσιου	Αγγελική	Δημήτριος	5.96	2044-08-17	2044-09-26	2026	1100333	2008-01-01	F	3	7	5	Ιωάννινα	2026-03-27 17:21:07.16+00	2026-04-02 18:05:14.82+00	23	116	5	Ελλάδα	\N
911	2124	Μιχαηλίδης	Μιχάλης	Σπυρίδων	8.70	2001-03-08	2001-04-17	1993	1200093	1973-01-01	M	4	14	1	Μαρούσι	2026-04-02 18:38:35.153+00	2026-04-02 18:38:35.153+00	\N	116	1	Ελλάδα	\N
679	602	Αργυρίου	Χριστίνα	Ανδρέας	8.72	2035-02-09	2035-12-10	2020	1100354	2002-01-01	F	2	3	6	Λάρισα	2026-03-27 17:21:16.333+00	2026-04-02 18:05:17.873+00	26	116	6	Ελλάδα	\N
282	24	Χριστοπούλου	Κατερίνα	Στέφανος	8.18	2003-03-23	2003-02-05	1995	1070428	1977-01-01	F	4	16	1	Αθήνα	2026-03-27 13:22:57.514+00	2026-04-02 18:04:21.147+00	38	116	1	Ελλάδα	\N
941	2155	Παναγιωτίδης	Ιωάννης	Σωτήριος	8.64	1991-06-26	1991-08-02	1982	1200124	1963-01-01	M	4	16	10	Κυπαρισσία	2026-04-02 18:38:39.441+00	2026-04-02 18:38:39.441+00	\N	116	10	Ελλάδα	\N
942	2156	Ράπτης	Χρήστος	Λεωνίδας	8.59	2004-06-15	2004-10-21	1997	1200125	1977-01-01	M	4	14	4	Ορεστιάδα	2026-04-02 18:38:39.584+00	2026-04-02 18:38:39.584+00	54	116	4	Ελλάδα	\N
943	2158	Βασιλείου	Γιώργος	Νικόλαος	5.16	1988-07-13	1988-10-31	1980	1200127	1956-01-01	M	4	14	1	Μαρούσι	2026-04-02 18:38:39.727+00	2026-04-02 18:38:39.727+00	\N	116	1	Ελλάδα	\N
553	476	Παππά	Μυρτώ	Νικόλαος	9.16	2027-03-22	2027-01-05	2018	1100228	2000-01-01	F	2	13	2	Θεσσαλονίκη	2026-03-27 17:20:21.218+00	2026-04-02 18:04:59.526+00	17	116	2	Ελλάδα	\N
555	478	Πετροπούλου	Ιωάννα	Παναγιώτης	6.77	2032-02-20	2032-03-31	2023	1100230	2005-01-01	F	3	7	2	Θεσσαλονίκη	2026-03-27 17:20:22.092+00	2026-04-02 18:04:59.817+00	17	116	2	Ελλάδα	\N
556	479	Πολίτου	Αφροδίτη	Απόστολος	6.67	2013-08-26	2013-05-10	2007	1100231	1989-01-01	F	5	19	2	Θεσσαλονίκη	2026-03-27 17:20:22.533+00	2026-04-02 18:04:59.962+00	17	116	2	Ελλάδα	\N
557	480	Παπακωνσταντίνου	Χρήστος	Αθανάσιος	7.41	2006-03-23	2006-02-05	2001	1100232	1983-01-01	M	5	19	2	Θεσσαλονίκη	2026-03-27 17:20:22.97+00	2026-04-02 18:05:00.107+00	17	116	2	Ελλάδα	\N
559	482	Δημητρίου	Κωνσταντίνος	Ιωάννης	6.39	2029-04-26	2029-05-06	2022	1100234	2004-01-01	M	3	8	2	Θεσσαλονίκη	2026-03-27 17:20:23.844+00	2026-04-02 18:05:00.398+00	17	116	2	Ελλάδα	\N
944	2159	Μαυρίδης	Σωτήρης	Αντώνιος	6.39	1998-11-08	1999-10-01	1992	1200128	1968-01-01	M	4	14	13	Σητεία	2026-04-02 18:38:39.87+00	2026-04-02 18:38:39.87+00	90	116	13	Ελλάδα	\N
945	2160	Οικονόμου	Βασιλική	Ευάγγελος	6.43	1988-07-09	1989-01-18	1981	1200129	1957-01-01	F	4	15	4	Ορεστιάδα	2026-04-02 18:38:40.012+00	2026-04-02 18:38:40.012+00	54	116	4	Ελλάδα	\N
946	2161	Δεληγιάννη	Χριστίνα	Κωνσταντίνος	9.84	1988-03-26	1988-11-09	1981	1200130	1963-01-01	F	4	16	1	Γλυφάδα	2026-04-02 18:38:40.155+00	2026-04-02 18:38:40.155+00	80	116	1	Ελλάδα	\N
947	2162	Θεοδώρου	Αναστασία	Λεωνίδας	7.54	1997-04-26	1997-01-05	1986	1200131	1966-01-01	F	4	16	1	Κηφισιά	2026-04-02 18:38:40.298+00	2026-04-02 18:38:40.298+00	\N	116	1	Ελλάδα	\N
949	2164	Παναγιωτίδης	Λευτέρης	Θεόδωρος	8.40	1990-03-15	1990-12-05	1983	1200133	1961-01-01	M	4	15	4	Ορεστιάδα	2026-04-02 18:38:40.583+00	2026-04-02 18:38:40.583+00	54	116	4	Ελλάδα	\N
950	2166	Χατζηδάκη	Ιωάννα	Θεόδωρος	6.51	1997-05-06	1997-10-23	1988	1200135	1970-01-01	F	4	16	11	Ικαρία	2026-04-02 18:38:40.727+00	2026-04-02 18:38:40.727+00	84	116	11	Ελλάδα	\N
952	2169	Λαμπροπούλου	Ειρήνη	Βασίλειος	7.42	1985-04-15	1985-05-17	1980	1200138	1952-01-01	F	4	16	7	Αργοστόλι	2026-04-02 18:38:41.011+00	2026-04-02 18:38:41.011+00	31	116	7	Ελλάδα	\N
844	2049	Δημητρίου	Σωτήρης	Χρήστος	9.63	1992-11-24	1992-08-15	1981	1200018	1959-01-01	M	4	15	4	Διδυμότειχο	2026-04-02 18:38:25.566+00	2026-04-02 18:38:25.566+00	\N	116	4	Ελλάδα	\N
311	82	Αγγελίδης	Ιάσονας	Παναγιώτης	5.58	2037-08-21	2037-09-30	2025	1098902	2007-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:05.894+00	2026-04-02 18:04:25.372+00	38	116	1	Ελλάδα	\N
341	142	Βενιζέλου	Ολυμπία	Παναγιώτης	5.77	2007-03-04	2007-05-13	1995	1057896	1977-01-01	F	4	14	1	Αθήνα	2026-03-27 13:23:14.541+00	2026-04-02 18:04:29.621+00	38	116	1	Ελλάδα	\N
849	2055	Τσακίρη	Άννα	Μιχαήλ	6.48	1985-07-13	1986-05-01	1980	1200024	1952-01-01	F	4	15	8	Ναύπακτος	2026-04-02 18:38:26.279+00	2026-04-02 18:38:26.279+00	\N	116	8	Ελλάδα	\N
848	2054	Καραγιάννη	Παρασκευή	Γεώργιος	5.35	1998-12-05	1998-06-21	1985	1200023	1964-01-01	F	4	14	2	Νάουσα	2026-04-02 18:38:26.137+00	2026-04-02 18:38:26.137+00	101	116	2	Ελλάδα	\N
850	2056	Πολίτης	Πέτρος	Αθανάσιος	8.93	1987-07-06	1987-07-17	1980	1200025	1955-01-01	M	4	16	2	Κιλκίς	2026-04-02 18:38:26.422+00	2026-04-02 18:38:26.422+00	98	116	2	Ελλάδα	\N
831	2031	Μιχαηλίδου	Αλεξάνδρα	Κωνσταντίνος	7.70	1993-07-25	1993-04-18	1982	1200000	1960-01-01	F	4	15	2	Θεσσαλονίκη	2026-04-02 18:38:23.704+00	2026-04-02 18:38:23.704+00	17	116	2	Ελλάδα	\N
832	2032	Κυριακίδου	Μαρία	Χαράλαμπος	6.20	1998-08-06	1998-08-01	1991	1200001	1970-01-01	F	4	14	4	Διδυμότειχο	2026-04-02 18:38:23.851+00	2026-04-02 18:38:23.851+00	\N	116	4	Ελλάδα	\N
833	2034	Αναστασίου	Απόστολος	Χρήστος	6.24	1991-10-15	1991-06-18	1981	1200003	1957-01-01	M	4	16	12	Κως	2026-04-02 18:38:23.994+00	2026-04-02 18:38:23.994+00	48	116	12	Ελλάδα	\N
834	2037	Κωνσταντίνου	Αλέξανδρος	Αντώνιος	9.00	1997-02-13	1997-06-02	1989	1200006	1968-01-01	M	4	16	10	Άργος	2026-04-02 18:38:24.136+00	2026-04-02 18:38:24.136+00	81	116	10	Ελλάδα	\N
835	2038	Καραγιάννης	Βασίλης	Λεωνίδας	5.49	1986-03-15	1986-06-24	1980	1200007	1956-01-01	M	4	16	1	Γλυφάδα	2026-04-02 18:38:24.28+00	2026-04-02 18:38:24.28+00	80	116	1	Ελλάδα	\N
836	2039	Καραλή	Μαρία	Δημήτριος	6.89	2004-02-08	2004-04-28	1997	1200008	1978-01-01	F	4	16	7	Σάμη	2026-04-02 18:38:24.423+00	2026-04-02 18:38:24.423+00	\N	116	7	Ελλάδα	\N
837	2040	Χριστοδούλου	Καλλιόπη	Σπυρίδων	6.48	1994-05-09	1994-06-14	1988	1200009	1965-01-01	F	4	15	9	Λιβαδειά	2026-04-02 18:38:24.566+00	2026-04-02 18:38:24.566+00	76	116	9	Ελλάδα	\N
838	2041	Καρρά	Μαριάννα	Γεώργιος	9.80	1989-06-10	1989-08-05	1980	1200010	1955-01-01	F	4	14	5	Κόνιτσα	2026-04-02 18:38:24.709+00	2026-04-02 18:38:24.709+00	64	116	5	Ελλάδα	\N
314	88	Θεοδωρίδης	Πέτρος	Νικόλαος	7.88	2031-06-20	2031-07-30	2025	1079886	2007-01-01	M	3	9	1	Αθήνα	2026-03-27 13:23:06.758+00	2026-04-02 18:04:25.812+00	38	116	1	Ελλάδα	\N
866	2072	Πολίτης	Λευτέρης	Κωνσταντίνος	9.83	1991-04-24	1991-07-20	1982	1200041	1962-01-01	M	4	15	7	Αργοστόλι	2026-04-02 18:38:28.708+00	2026-04-02 18:38:28.708+00	31	116	7	Ελλάδα	\N
412	335	Τσακίρης	Μάριος	Γεράσιμος	7.89	2032-04-21	2032-05-31	2026	1070399	2008-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:35.038+00	2026-04-02 18:04:39.675+00	38	116	1	Ελλάδα	\N
430	353	Θεοδώρου	Βαγγέλης	Αλέξανδρος	7.78	2026-02-07	2026-11-08	2021	1067516	2003-01-01	M	2	4	1	Αθήνα	2026-03-27 13:23:40.22+00	2026-04-02 18:04:41.885+00	38	116	1	Ελλάδα	\N
886	2097	Σωτηρίου	Δήμητρα	Νικόλαος	5.50	1992-03-28	1992-12-05	1980	1200066	1962-01-01	F	4	14	2	Σέρρες	2026-04-02 18:38:31.562+00	2026-04-02 18:38:31.562+00	18	116	2	Ελλάδα	\N
441	364	Πολίτου	Αφροδίτη	Απόστολος	6.83	2019-04-06	2019-07-14	2012	1100116	1994-01-01	F	6	21	8	Πάτρα	2026-03-27 17:08:02.14+00	2026-04-02 18:04:43.194+00	32	116	8	Ελλάδα	\N
456	379	Καραβίας	Βασιλική	Ανδρέας	7.19	2020-05-04	2020-05-15	2014	1100131	1996-01-01	F	2	3	8	Πάτρα	2026-03-27 17:08:08.642+00	2026-04-02 18:04:45.407+00	32	116	8	Ελλάδα	\N
302	64	Αγγελίδης	Χριστίνα	Στέφανος	9.41	2036-03-28	2036-05-07	2024	1052944	2006-01-01	F	3	12	1	Αθήνα	2026-03-27 13:23:03.294+00	2026-04-06 16:36:38.623+00	38	116	1	Ελλάδα	\N
839	2043	Καρράς	Μάριος	Θεόδωρος	8.36	1988-06-13	1988-02-21	1982	1200012	1960-01-01	M	4	14	12	Ρόδος	2026-04-02 18:38:24.852+00	2026-04-02 18:38:24.852+00	47	116	12	Ελλάδα	\N
841	2045	Βασιλείου	Ιωάννης	Λεωνίδας	5.52	1999-10-10	2000-03-17	1985	1200014	1965-01-01	M	4	15	9	Λαμία	2026-04-02 18:38:25.138+00	2026-04-02 18:38:25.138+00	36	116	9	Ελλάδα	\N
842	2046	Χριστοδούλου	Αικατερίνη	Κωνσταντίνος	8.17	2002-07-07	2002-12-25	1990	1200015	1968-01-01	F	4	14	8	Ναύπακτος	2026-04-02 18:38:25.281+00	2026-04-02 18:38:25.281+00	\N	116	8	Ελλάδα	\N
843	2048	Παπαδόπουλος	Νίκος	Δημήτριος	5.64	1987-05-10	1987-11-14	1980	1200017	1953-01-01	M	4	15	5	Κόνιτσα	2026-04-02 18:38:25.424+00	2026-04-02 18:38:25.424+00	64	116	5	Ελλάδα	\N
845	2050	Βασιλείου	Χρήστος	Πέτρος	8.94	2002-09-05	2002-01-30	1997	1200019	1979-01-01	M	4	15	3	Γρεβενά	2026-04-02 18:38:25.709+00	2026-04-02 18:38:25.709+00	60	116	3	Ελλάδα	\N
846	2051	Δημητρίου	Λευτέρης	Βασίλειος	5.97	1990-01-05	1990-05-10	1985	1200020	1964-01-01	M	4	16	8	Πάτρα	2026-04-02 18:38:25.852+00	2026-04-02 18:38:25.852+00	32	116	8	Ελλάδα	\N
295	50	Καρανάσιου	Αγγελική	Δημήτριος	7.82	2032-08-28	2032-07-10	2023	1082894	2005-01-01	F	3	11	1	Αθήνα	2026-03-27 13:23:01.259+00	2026-04-02 18:04:23.038+00	38	116	1	Ελλάδα	\N
298	56	Γαλάνη	Δέσποινα	Αθανάσιος	6.59	2026-03-04	2026-05-13	2018	1050271	2000-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:02.127+00	2026-04-02 18:04:23.478+00	38	116	1	Ελλάδα	\N
299	58	Αποστολίδης	Μυρτώ	Ιωάννης	8.34	2011-09-04	2011-05-19	1998	1044241	1980-01-01	F	4	14	1	Αθήνα	2026-03-27 13:23:02.424+00	2026-04-02 18:04:23.624+00	38	116	1	Ελλάδα	\N
303	66	Καρβούνης	Πέτρος	Ευάγγελος	6.48	2019-08-24	2019-03-10	2013	1088474	1995-01-01	M	6	22	1	Αθήνα	2026-03-27 13:23:03.583+00	2026-04-02 18:04:24.206+00	38	116	1	Ελλάδα	\N
304	68	Τριανταφύλλου	Μιχάλης	Νικόλαος	7.50	2036-07-09	2036-10-17	2022	1052576	2004-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:03.873+00	2026-04-02 18:04:24.352+00	38	116	1	Ελλάδα	\N
305	70	Τσιώλης	Κωνσταντίνος	Δημήτριος	7.63	2006-03-28	2006-07-05	1999	1068311	1981-01-01	M	5	19	1	Αθήνα	2026-03-27 13:23:04.161+00	2026-04-02 18:04:24.498+00	38	116	1	Ελλάδα	\N
306	72	Μαυρομάτης	Ελένη	Γεώργιος	8.03	2023-04-04	2023-05-14	2012	1092517	1994-01-01	F	6	20	1	Αθήνα	2026-03-27 13:23:04.45+00	2026-04-02 18:04:24.644+00	38	116	1	Ελλάδα	\N
307	74	Αργυρίου	Χριστίνα	Ανδρέας	6.67	2018-08-26	2018-05-10	2004	1050678	1986-01-01	F	5	18	1	Αθήνα	2026-03-27 13:23:04.738+00	2026-04-02 18:04:24.789+00	38	116	1	Ελλάδα	\N
308	76	Παπανικολάου	Κωνσταντίνος	Αθανάσιος	7.25	2030-08-27	2030-06-10	2024	1083385	2006-01-01	M	3	9	1	Αθήνα	2026-03-27 13:23:05.027+00	2026-04-02 18:04:24.935+00	38	116	1	Ελλάδα	\N
309	78	Μαρινάκη	Νεκτάριος	Ιωάννης	8.16	2027-05-09	2027-10-15	2019	1072297	2001-01-01	M	2	3	1	Αθήνα	2026-03-27 13:23:05.316+00	2026-04-02 18:04:25.08+00	38	116	1	Ελλάδα	\N
310	80	Σιδηροπούλου	Κατερίνα	Χρήστος	8.95	2007-08-19	2007-09-28	2000	1055018	1982-01-01	F	5	19	1	Αθήνα	2026-03-27 13:23:05.604+00	2026-04-02 18:04:25.226+00	38	116	1	Ελλάδα	\N
312	84	Κυριαζίδης	Ολυμπία	Στέφανος	7.69	2019-07-12	2020-01-16	2014	1079087	1996-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:06.182+00	2026-04-02 18:04:25.517+00	38	116	1	Ελλάδα	\N
313	86	Καραλής	Αντώνης	Ευάγγελος	8.49	2012-06-04	2012-05-16	2003	1077856	1985-01-01	M	5	18	1	Αθήνα	2026-03-27 13:23:06.47+00	2026-04-02 18:04:25.663+00	38	116	1	Ελλάδα	\N
315	90	Κυριακίδης	Μυρτώ	Δημήτριος	7.89	2037-09-26	2037-05-11	2026	1088094	2008-01-01	F	3	8	1	Αθήνα	2026-03-27 13:23:07.047+00	2026-04-02 18:04:25.957+00	38	116	1	Ελλάδα	\N
316	92	Κωνσταντίνου	Χρήστος	Γεώργιος	6.26	2032-03-24	2032-03-05	2021	1099306	2003-01-01	M	2	3	1	Αθήνα	2026-03-27 13:23:07.335+00	2026-04-02 18:04:26.103+00	38	116	1	Ελλάδα	\N
317	94	Σπυρόπουλος	Μιχάλης	Ανδρέας	8.24	2025-08-27	2025-06-10	2014	1093349	1996-01-01	M	2	13	1	Αθήνα	2026-03-27 13:23:07.624+00	2026-04-02 18:04:26.248+00	38	116	1	Ελλάδα	\N
318	96	Τσουκαλάς	Αντώνης	Αθανάσιος	8.43	2034-08-17	2034-09-26	2020	1079449	2002-01-01	M	2	3	1	Αθήνα	2026-03-27 13:23:07.912+00	2026-04-02 18:04:26.393+00	38	116	1	Ελλάδα	\N
319	98	Τριανταφύλλου	Γιώργος	Ιωάννης	8.85	2034-03-04	2034-05-13	2024	1081150	2006-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:08.2+00	2026-04-02 18:04:26.539+00	38	116	1	Ελλάδα	\N
333	126	Δημητρίου	Ιρις	Ευάγγελος	7.21	2032-04-21	2032-05-31	2026	1067973	2008-01-01	F	3	12	1	Αθήνα	2026-03-27 13:23:12.236+00	2026-04-02 18:04:28.45+00	38	116	1	Ελλάδα	\N
874	2082	Ράπτης	Σπύρος	Βασίλειος	5.30	1994-06-19	1994-03-11	1984	1200051	1963-01-01	M	4	16	7	Σάμη	2026-04-02 18:38:29.849+00	2026-04-02 18:38:29.849+00	\N	116	7	Ελλάδα	\N
357	174	Παπακωνσταντίνου	Δημήτρης	Ανδρέας	6.47	2030-03-31	2030-10-05	2023	1089392	2005-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:19.152+00	2026-04-02 18:04:31.956+00	38	116	1	Ελλάδα	\N
375	105	Δημητρίου	Κωνσταντίνος	Ιωάννης	8.23	2033-12-09	2033-10-22	2022	1041030	2004-01-01	M	3	12	1	Αθήνα	2026-03-27 13:23:24.339+00	2026-04-02 18:04:34.43+00	38	116	1	Ελλάδα	\N
487	410	Δημοπούλου	Αναστασία	Στέφανος	6.29	2036-08-30	2036-09-10	2022	1100162	2004-01-01	F	3	9	8	Πάτρα	2026-03-27 17:08:22.088+00	2026-04-02 18:04:49.918+00	32	116	8	Ελλάδα	\N
320	100	Αποστολίδης	Μαρία	Χρήστος	8.21	2020-03-09	2020-10-13	2015	1057710	1997-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:08.488+00	2026-04-02 18:04:26.684+00	38	116	1	Ελλάδα	\N
328	116	Μακρή	Αλέξανδρος	Αθανάσιος	7.66	2038-03-26	2038-05-05	2025	1097644	2007-01-01	M	3	9	1	Αθήνα	2026-03-27 13:23:10.795+00	2026-04-02 18:04:27.708+00	38	116	1	Ελλάδα	\N
840	2044	Αργυρίου	Κώστας	Ιωάννης	9.40	1987-12-04	1986-11-18	1980	1200013	1957-01-01	M	4	14	2	Νάουσα	2026-04-02 18:38:24.994+00	2026-04-02 18:38:24.994+00	101	116	2	Ελλάδα	\N
440	363	Χαρίτου	Στέφανος	Γεώργιος	6.94	2009-08-23	2009-02-10	2001	1100115	1983-01-01	M	5	18	8	Πάτρα	2026-03-27 17:08:01.708+00	2026-04-02 18:04:43.049+00	32	116	8	Ελλάδα	\N
554	477	Σταματίου	Γιώργος	Ιωάννης	7.12	2030-08-27	2030-06-10	2024	1100229	2006-01-01	M	3	8	2	Θεσσαλονίκη	2026-03-27 17:20:21.656+00	2026-04-02 18:04:59.671+00	17	116	2	Ελλάδα	\N
873	2081	Δεληγιάννης	Κώστας	Απόστολος	7.79	1996-08-03	1995-09-11	1986	1200050	1963-01-01	M	4	14	1	Μαρούσι	2026-04-02 18:38:29.707+00	2026-04-02 18:38:29.707+00	\N	116	1	Ελλάδα	\N
851	2057	Αργυρίου	Καλλιόπη	Αλέξανδρος	8.32	1995-10-03	1995-01-06	1988	1200026	1965-01-01	F	4	14	2	Θεσσαλονίκη	2026-04-02 18:38:26.565+00	2026-04-02 18:38:26.565+00	17	116	2	Ελλάδα	\N
852	2058	Σταματίου	Δέσποινα	Σπυρίδων	7.28	2000-11-28	2000-08-07	1993	1200027	1974-01-01	F	4	14	5	Μέτσοβο	2026-04-02 18:38:26.708+00	2026-04-02 18:38:26.708+00	65	116	5	Ελλάδα	\N
853	2059	Γαλάνη	Χριστίνα	Σωτήριος	6.09	1994-03-25	1994-01-05	1985	1200028	1964-01-01	F	4	14	1	Αθήνα	2026-04-02 18:38:26.85+00	2026-04-02 18:38:26.85+00	38	116	1	Ελλάδα	\N
854	2060	Κυριακίδου	Καλλιόπη	Γεώργιος	6.59	1993-10-18	1994-02-19	1981	1200029	1962-01-01	F	4	14	7	Σάμη	2026-04-02 18:38:26.993+00	2026-04-02 18:38:26.993+00	\N	116	7	Ελλάδα	\N
856	2062	Μανωλά	Αλεξάνδρα	Ευάγγελος	6.60	1999-09-05	1999-04-30	1985	1200031	1966-01-01	F	4	16	7	Ιθάκη	2026-04-02 18:38:27.278+00	2026-04-02 18:38:27.278+00	72	116	7	Ελλάδα	\N
857	2063	Αθανασίου	Παναγιώτης	Βασίλειος	7.33	2001-11-08	2001-11-16	1995	1200032	1972-01-01	M	4	14	10	Κυπαρισσία	2026-04-02 18:38:27.422+00	2026-04-02 18:38:27.422+00	\N	116	10	Ελλάδα	\N
858	2064	Πολίτης	Πέτρος	Απόστολος	9.27	1985-06-25	1985-07-14	1980	1200033	1951-01-01	M	4	15	6	Ελασσόνα	2026-04-02 18:38:27.566+00	2026-04-02 18:38:27.566+00	68	116	6	Ελλάδα	\N
859	2065	Πολίτη	Μαριάννα	Λεωνίδας	8.34	2002-02-13	2002-05-02	1989	1200034	1970-01-01	F	4	16	11	Καρλόβασι	2026-04-02 18:38:27.708+00	2026-04-02 18:38:27.708+00	\N	116	11	Ελλάδα	\N
860	2066	Βασιλείου	Καλλιόπη	Νικόλαος	5.68	1992-03-21	1992-04-29	1984	1200035	1960-01-01	F	4	14	6	Βόλος	2026-04-02 18:38:27.851+00	2026-04-02 18:38:27.851+00	27	116	6	Ελλάδα	\N
862	2068	Οικονόμου	Απόστολος	Γεώργιος	9.75	1995-02-25	1994-09-13	1986	1200037	1967-01-01	M	4	15	4	Ορεστιάδα	2026-04-02 18:38:28.137+00	2026-04-02 18:38:28.137+00	54	116	4	Ελλάδα	\N
864	2070	Ράπτης	Νίκος	Αθανάσιος	5.38	1986-08-13	1986-05-26	1980	1200039	1959-01-01	M	4	15	5	Κόνιτσα	2026-04-02 18:38:28.422+00	2026-04-02 18:38:28.422+00	64	116	5	Ελλάδα	\N
538	461	Περικλής	Αγγελική	Αθανάσιος	5.98	2005-08-28	2005-07-10	1997	1100213	1979-01-01	F	4	15	2	Θεσσαλονίκη	2026-03-27 17:20:14.64+00	2026-04-02 18:04:57.343+00	17	116	2	Ελλάδα	\N
904	2117	Αλεξίου	Πέτρος	Πέτρος	5.74	1997-11-03	1997-07-20	1982	1200086	1964-01-01	M	4	16	10	Κόρινθος	2026-04-02 18:38:34.152+00	2026-04-02 18:38:34.152+00	42	116	10	Ελλάδα	\N
865	2071	Ιωαννίδου	Αικατερίνη	Σπυρίδων	8.24	1992-03-07	1992-09-20	1980	1200040	1959-01-01	F	4	15	9	Λιβαδειά	2026-04-02 18:38:28.565+00	2026-04-02 18:38:28.565+00	76	116	9	Ελλάδα	\N
867	2073	Καραλής	Λευτέρης	Αλέξανδρος	6.22	1994-09-03	1994-04-28	1989	1200042	1965-01-01	M	4	15	13	Ιεράπετρα	2026-04-02 18:38:28.851+00	2026-04-02 18:38:28.851+00	89	116	13	Ελλάδα	\N
868	2075	Μανωλά	Μαριάννα	Ιωάννης	8.45	1992-10-25	1992-08-29	1981	1200044	1961-01-01	F	4	14	11	Λήμνος	2026-04-02 18:38:28.993+00	2026-04-02 18:38:28.993+00	83	116	11	Ελλάδα	\N
869	2076	Δεληγιάννη	Καλλιόπη	Ιωάννης	7.77	1994-12-11	1995-01-13	1989	1200045	1970-01-01	F	4	14	6	Καλαμπάκα	2026-04-02 18:38:29.136+00	2026-04-02 18:38:29.136+00	67	116	6	Ελλάδα	\N
870	2077	Πάλλης	Αντώνης	Αντώνιος	8.71	1998-11-05	1998-12-01	1985	1200046	1964-01-01	M	4	16	8	Αίγιο	2026-04-02 18:38:29.279+00	2026-04-02 18:38:29.279+00	74	116	8	Ελλάδα	\N
871	2078	Μιχαηλίδου	Χριστίνα	Χρήστος	9.16	2001-10-11	2001-04-07	1988	1200047	1967-01-01	F	4	16	10	Κυπαρισσία	2026-04-02 18:38:29.421+00	2026-04-02 18:38:29.421+00	\N	116	10	Ελλάδα	\N
872	2079	Δούκας	Χρήστος	Σπυρίδων	8.19	1994-06-23	1994-02-27	1989	1200048	1971-01-01	M	4	16	5	Κόνιτσα	2026-04-02 18:38:29.564+00	2026-04-02 18:38:29.564+00	64	116	5	Ελλάδα	\N
321	102	Λυμπερόπουλος	Ιρις	Παναγιώτης	6.53	2021-03-31	2021-10-05	2016	1070637	1998-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:08.776+00	2026-04-02 18:04:26.83+00	38	116	1	Ελλάδα	\N
323	106	Καρράς	Μελίνα	Ευάγγελος	9.59	2013-03-26	2013-05-05	2000	1094911	1982-01-01	F	5	19	1	Αθήνα	2026-03-27 13:23:09.353+00	2026-04-02 18:04:26.975+00	38	116	1	Ελλάδα	\N
324	108	Παπαδόπουλος	Μελίνα	Νικόλαος	8.53	2002-08-26	2002-05-10	1991	1056468	1973-01-01	F	4	16	1	Αθήνα	2026-03-27 13:23:09.641+00	2026-04-02 18:04:27.121+00	38	116	1	Ελλάδα	\N
325	110	Μακρόπουλος	Χριστίνα	Δημήτριος	8.45	2026-09-13	2026-10-23	2015	1051277	1997-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:09.929+00	2026-04-02 18:04:27.267+00	38	116	1	Ελλάδα	\N
326	112	Πετράκη	Δέσποινα	Γεώργιος	8.75	2034-06-09	2034-10-16	2014	1092503	1996-01-01	F	6	22	1	Αθήνα	2026-03-27 13:23:10.217+00	2026-04-02 18:04:27.415+00	38	116	1	Ελλάδα	\N
327	114	Δούκα	Θανάσης	Ανδρέας	8.19	2022-12-10	2022-11-21	2012	1085025	1994-01-01	M	6	22	1	Αθήνα	2026-03-27 13:23:10.505+00	2026-04-02 18:04:27.56+00	38	116	1	Ελλάδα	\N
329	118	Αποστολίδης	Μάριος	Ιωάννης	5.86	1997-05-04	1997-05-15	1982	1063303	1964-01-01	M	4	16	1	Αθήνα	2026-03-27 13:23:11.083+00	2026-04-02 18:04:27.858+00	38	116	1	Ελλάδα	\N
330	120	Κούγιας	Δέσποινα	Χρήστος	7.74	2032-08-24	2032-03-10	2024	1062679	2006-01-01	F	3	8	1	Αθήνα	2026-03-27 13:23:11.371+00	2026-04-02 18:04:28.008+00	38	116	1	Ελλάδα	\N
331	122	Λεμονής	Δημήτρης	Παναγιώτης	8.19	2028-03-31	2028-10-05	2020	1079125	2002-01-01	M	2	13	1	Αθήνα	2026-03-27 13:23:11.659+00	2026-04-02 18:04:28.156+00	38	116	1	Ελλάδα	\N
332	124	Κανελλοπούλου	Σωτήρης	Στέφανος	9.70	2035-08-17	2035-09-26	2021	1080815	2003-01-01	M	2	13	1	Αθήνα	2026-03-27 13:23:11.948+00	2026-04-02 18:04:28.305+00	38	116	1	Ελλάδα	\N
334	128	Καρβούνης	Δημήτρης	Νικόλαος	8.34	2008-11-16	2008-12-26	2001	1096826	1983-01-01	M	5	19	1	Αθήνα	2026-03-27 13:23:12.524+00	2026-04-02 18:04:28.596+00	38	116	1	Ελλάδα	\N
335	130	Μαυρομάτης	Νεφέλη	Δημήτριος	6.58	2023-06-04	2023-05-16	2017	1066997	1999-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:12.811+00	2026-04-02 18:04:28.743+00	38	116	1	Ελλάδα	\N
336	132	Δημητρίου	Κωνσταντίνος	Γεώργιος	8.09	2024-04-04	2024-05-14	2018	1095410	2000-01-01	M	2	3	1	Αθήνα	2026-03-27 13:23:13.099+00	2026-04-02 18:04:28.89+00	38	116	1	Ελλάδα	\N
337	134	Παπαϊωάννου	Σωτήρης	Ανδρέας	8.74	2024-10-09	2024-10-20	2013	1083491	1995-01-01	M	6	22	1	Αθήνα	2026-03-27 13:23:13.388+00	2026-04-02 18:04:29.039+00	38	116	1	Ελλάδα	\N
338	136	Παπακωνσταντίνου	Χρήστος	Αθανάσιος	8.79	2008-03-24	2008-03-05	2000	1073115	1982-01-01	M	5	17	1	Αθήνα	2026-03-27 13:23:13.676+00	2026-04-02 18:04:29.185+00	38	116	1	Ελλάδα	\N
339	138	Σταυροπούλου	Ολυμπία	Ιωάννης	7.85	2015-09-04	2015-05-19	2004	1078735	1986-01-01	F	5	19	1	Αθήνα	2026-03-27 13:23:13.964+00	2026-04-02 18:04:29.33+00	38	116	1	Ελλάδα	\N
340	140	Μαρινάκη	Μαρία	Χρήστος	7.16	2015-08-24	2015-03-10	1998	1079192	1980-01-01	F	5	17	1	Αθήνα	2026-03-27 13:23:14.252+00	2026-04-02 18:04:29.475+00	38	116	1	Ελλάδα	\N
342	144	Παπαϊωάννου	Δέσποινα	Στέφανος	9.17	2028-10-09	2028-10-20	2018	1046611	2000-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:14.829+00	2026-04-02 18:04:29.767+00	38	116	1	Ελλάδα	\N
439	362	Νικολάου	Ανδρέας	Παναγιώτης	5.46	2015-06-09	2015-10-16	2009	1100114	1991-01-01	M	6	20	8	Πάτρα	2026-03-27 17:08:01.275+00	2026-04-02 18:04:42.903+00	32	116	8	Ελλάδα	\N
863	2069	Οικονόμου	Σπύρος	Νικόλαος	8.83	1987-09-23	1987-05-08	1981	1200038	1961-01-01	M	4	16	12	Κάλυμνος	2026-04-02 18:38:28.279+00	2026-04-02 18:38:28.279+00	103	116	12	Ελλάδα	\N
875	2084	Ζαχαρίου	Ελένη	Βασίλειος	7.95	1988-06-26	1988-11-13	1982	1200053	1961-01-01	F	4	15	7	Ληξούρι	2026-04-02 18:38:29.992+00	2026-04-02 18:38:29.992+00	\N	116	7	Ελλάδα	\N
343	146	Θεοδωρίδης	Βασιλική	Ευάγγελος	6.47	2035-09-04	2035-05-19	2020	1053327	2002-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:15.118+00	2026-04-02 18:04:29.912+00	38	116	1	Ελλάδα	\N
344	148	Γαλάνη	Αλεξάνδρα	Νικόλαος	8.49	2010-03-27	2010-06-05	2004	1059524	1986-01-01	F	5	19	1	Αθήνα	2026-03-27 13:23:15.408+00	2026-04-02 18:04:30.058+00	38	116	1	Ελλάδα	\N
345	150	Αργυρίου	Χρήστος	Δημήτριος	7.94	2036-08-04	2036-05-18	2021	1080690	2003-01-01	M	2	4	1	Αθήνα	2026-03-27 13:23:15.696+00	2026-04-02 18:04:30.204+00	38	116	1	Ελλάδα	\N
346	152	Κωστοπούλου	Βασιλική	Γεώργιος	6.78	2018-08-17	2018-09-26	2000	1085163	1982-01-01	F	5	18	1	Αθήνα	2026-03-27 13:23:15.984+00	2026-04-02 18:04:30.349+00	38	116	1	Ελλάδα	\N
352	164	Καραγιάννης	Νεκτάριος	Στέφανος	9.13	2034-08-19	2034-09-28	2022	1050327	2004-01-01	M	3	9	1	Αθήνα	2026-03-27 13:23:17.712+00	2026-04-02 18:04:31.228+00	38	116	1	Ελλάδα	\N
353	166	Σπυρόπουλος	Άρης	Ευάγγελος	8.25	2028-02-09	2028-12-10	2022	1070612	2004-01-01	M	3	7	1	Αθήνα	2026-03-27 13:23:18+00	2026-04-02 18:04:31.374+00	38	116	1	Ελλάδα	\N
354	168	Τζιόλας	Ειρήνη	Νικόλαος	6.11	2025-03-30	2025-09-05	2019	1082211	2001-01-01	F	2	4	1	Αθήνα	2026-03-27 13:23:18.288+00	2026-04-02 18:04:31.52+00	38	116	1	Ελλάδα	\N
355	170	Ζαχαρίου	Αντώνης	Δημήτριος	6.71	2042-05-04	2042-05-15	2026	1070748	2008-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:18.575+00	2026-04-02 18:04:31.666+00	38	116	1	Ελλάδα	\N
511	434	Παπαδόπουλος	Μελίνα	Νικόλαος	6.64	2028-09-14	2028-10-24	2016	1100186	1998-01-01	F	2	13	8	Πάτρα	2026-03-27 17:20:02.842+00	2026-04-02 18:04:53.411+00	32	116	8	Ελλάδα	\N
356	172	Χαρίτου	Μελίνα	Γεώργιος	8.74	2029-08-09	2029-10-18	2023	1081596	2005-01-01	F	3	12	1	Αθήνα	2026-03-27 13:23:18.863+00	2026-04-02 18:04:31.811+00	38	116	1	Ελλάδα	\N
358	176	Περικλής	Αγγελική	Αθανάσιος	7.15	2030-02-04	2030-12-05	2020	1062706	2002-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:19.44+00	2026-04-02 18:04:32.101+00	38	116	1	Ελλάδα	\N
359	178	Παναγιωτίδου	Νεφέλη	Ιωάννης	7.81	2037-08-28	2037-07-10	2023	1067701	2005-01-01	F	3	9	1	Αθήνα	2026-03-27 13:23:19.728+00	2026-04-02 18:04:32.247+00	38	116	1	Ελλάδα	\N
360	180	Κατσαρός	Απόστολος	Χρήστος	9.47	1997-06-09	1997-10-16	1990	1099524	1972-01-01	M	4	15	1	Αθήνα	2026-03-27 13:23:20.016+00	2026-04-02 18:04:32.392+00	38	116	1	Ελλάδα	\N
361	182	Μαθιός	Ιάσονας	Παναγιώτης	8.76	2033-03-09	2033-10-13	2025	1061974	2007-01-01	M	3	7	1	Αθήνα	2026-03-27 13:23:20.304+00	2026-04-02 18:04:32.538+00	38	116	1	Ελλάδα	\N
362	184	Δημοπούλου	Αναστασία	Στέφανος	7.30	2038-08-28	2038-07-10	2022	1050099	2004-01-01	F	3	11	1	Αθήνα	2026-03-27 13:23:20.592+00	2026-04-02 18:04:32.683+00	38	116	1	Ελλάδα	\N
363	186	Σιδηροπούλου	Απόστολος	Ευάγγελος	6.12	2027-08-19	2027-09-28	2014	1049446	1996-01-01	M	2	4	1	Αθήνα	2026-03-27 13:23:20.88+00	2026-04-02 18:04:32.828+00	38	116	1	Ελλάδα	\N
364	188	Παππά	Μυρτώ	Νικόλαος	5.73	2011-03-27	2011-06-05	2005	1079525	1987-01-01	F	5	19	1	Αθήνα	2026-03-27 13:23:21.168+00	2026-04-02 18:04:32.974+00	38	116	1	Ελλάδα	\N
365	190	Σαραντίδου	Μαρία	Δημήτριος	8.23	2029-04-22	2029-01-06	2021	1090838	2003-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:21.456+00	2026-04-02 18:04:33.119+00	38	116	1	Ελλάδα	\N
366	192	Τσιώλης	Νεφέλη	Γεώργιος	7.50	2031-06-04	2031-05-16	2019	1053782	2001-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:21.744+00	2026-04-02 18:04:33.265+00	38	116	1	Ελλάδα	\N
367	194	Μακρόπουλος	Ελένη	Ανδρέας	7.76	2031-07-04	2031-05-17	2024	1040839	2006-01-01	F	3	11	1	Αθήνα	2026-03-27 13:23:22.033+00	2026-04-02 18:04:33.41+00	38	116	1	Ελλάδα	\N
368	196	Περικλής	Αναστασία	Αθανάσιος	6.74	1986-03-25	1986-04-05	1981	1045572	1963-01-01	F	4	16	1	Αθήνα	2026-03-27 13:23:22.321+00	2026-04-02 18:04:33.556+00	38	116	1	Ελλάδα	\N
369	198	Κοκκίνου	Νεφέλη	Ιωάννης	7.94	2035-01-09	2035-11-10	2018	1072222	2000-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:22.609+00	2026-04-02 18:04:33.702+00	38	116	1	Ελλάδα	\N
370	200	Μαθιός	Μυρτώ	Χρήστος	8.13	2034-07-02	2034-03-19	2026	1069775	2008-01-01	F	3	12	1	Αθήνα	2026-03-27 13:23:22.896+00	2026-04-02 18:04:33.848+00	38	116	1	Ελλάδα	\N
371	101	Παπαδόπουλος	Γεώργιος	Αντώνιος	7.37	2023-07-19	2023-08-28	2016	1083336	1998-01-01	M	2	13	1	Αθήνα	2026-03-27 13:23:23.185+00	2026-04-02 18:04:33.993+00	38	116	1	Ελλάδα	\N
373	103	Ιωαννίδης	Νικόλαος	Παναγιώτης	8.82	2041-08-23	2041-02-10	2026	1087165	2008-01-01	M	3	9	1	Αθήνα	2026-03-27 13:23:23.761+00	2026-04-02 18:04:34.139+00	38	116	1	Ελλάδα	\N
374	104	Αλεξίου	Ελένη	Σπυρίδων	8.67	2022-03-29	2022-08-05	2014	1053859	1996-01-01	F	6	20	1	Αθήνα	2026-03-27 13:23:24.051+00	2026-04-02 18:04:34.285+00	38	116	1	Ελλάδα	\N
377	107	Νικολάου	Αλέξανδρος	Σταύρος	9.09	2022-09-15	2022-10-25	2017	1062450	1999-01-01	M	2	13	1	Αθήνα	2026-03-27 13:23:24.917+00	2026-04-02 18:04:34.577+00	38	116	1	Ελλάδα	\N
378	301	Παπαδόπουλος	Νίκος	Αντώνιος	8.50	2025-08-28	2025-07-10	2013	1072200	1995-01-01	M	6	21	1	Αθήνα	2026-03-27 13:23:25.206+00	2026-04-02 18:04:34.722+00	38	116	1	Ελλάδα	\N
379	302	Ιωάννου	Μαρία	Δημήτριος	7.50	2030-08-19	2030-09-28	2021	1089096	2003-01-01	F	2	4	1	Αθήνα	2026-03-27 13:23:25.494+00	2026-04-02 18:04:34.868+00	38	116	1	Ελλάδα	\N
380	303	Καραγιάννης	Πέτρος	Νικόλαος	8.84	2011-08-20	2011-09-29	2001	1100112	1983-01-01	M	5	17	1	Αθήνα	2026-03-27 13:23:25.782+00	2026-04-02 18:04:35.013+00	38	116	1	Ελλάδα	\N
381	304	Αλεξίου	Ελένη	Σπύρος	7.79	2023-08-04	2023-05-18	2014	1099030	1996-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:26.07+00	2026-04-02 18:04:35.158+00	38	116	1	Ελλάδα	\N
382	305	Νικολάου	Ανδρέας	Παναγιώτης	6.13	2032-08-28	2032-07-10	2020	1072910	2002-01-01	M	2	13	1	Αθήνα	2026-03-27 13:23:26.359+00	2026-04-02 18:04:35.304+00	38	116	1	Ελλάδα	\N
383	306	Κωστοπούλου	Άννα	Σταύρος	5.72	2017-08-28	2017-07-10	2009	1048232	1991-01-01	F	6	20	1	Αθήνα	2026-03-27 13:23:26.649+00	2026-04-02 18:04:35.449+00	38	116	1	Ελλάδα	\N
384	307	Θεοδωρίδης	Γιώργος	Ιωάννης	7.76	2032-07-04	2032-05-17	2022	1074548	2004-01-01	M	3	12	1	Αθήνα	2026-03-27 13:23:26.937+00	2026-04-02 18:04:35.595+00	38	116	1	Ελλάδα	\N
385	308	Παπακωνσταντίνου	Σοφία	Νικόλαος	9.31	2030-02-04	2030-12-05	2022	1042656	2004-01-01	F	3	11	1	Αθήνα	2026-03-27 13:23:27.226+00	2026-04-02 18:04:35.741+00	38	116	1	Ελλάδα	\N
386	309	Γεωργιάδης	Νικόλαος	Γεώργιος	7.51	2030-08-26	2030-05-10	2014	1097725	1996-01-01	M	2	3	1	Αθήνα	2026-03-27 13:23:27.514+00	2026-04-02 18:04:35.886+00	38	116	1	Ελλάδα	\N
387	310	Παπαγεωργίου	Κατερίνα	Δημήτριος	8.43	2027-01-04	2027-11-05	2016	1078328	1998-01-01	F	2	4	1	Αθήνα	2026-03-27 13:23:27.802+00	2026-04-02 18:04:36.031+00	38	116	1	Ελλάδα	\N
388	311	Παπαδόπουλος	Δημήτρης	Γεώργιος	8.62	2019-01-15	2019-02-24	2010	1073189	1992-01-01	M	6	21	1	Αθήνα	2026-03-27 13:23:28.089+00	2026-04-02 18:04:36.177+00	38	116	1	Ελλάδα	\N
389	312	Παπαδοπούλου	Μαρία	Ιωάννης	7.00	2033-01-19	2033-02-28	2023	1069017	2005-01-01	F	3	7	1	Αθήνα	2026-03-27 13:23:28.377+00	2026-04-02 18:04:36.323+00	38	116	1	Ελλάδα	\N
390	313	Κωνσταντινίδης	Νικόλαος	Παναγιώτης	7.47	2030-07-28	2030-06-09	2024	1080563	2006-01-01	M	3	12	1	Αθήνα	2026-03-27 13:23:28.665+00	2026-04-02 18:04:36.468+00	38	116	1	Ελλάδα	\N
486	409	Νικολάου	Αλέξανδρος	Σταύρος	8.75	2021-07-04	2021-05-17	2016	1100161	1998-01-01	M	2	4	8	Πάτρα	2026-03-27 17:08:21.65+00	2026-04-02 18:04:49.772+00	32	116	8	Ελλάδα	\N
391	314	Κωνσταντίνου	Ελένη	Δημήτριος	6.65	2020-01-27	2020-07-03	2011	1098922	1993-01-01	F	6	20	1	Αθήνα	2026-03-27 13:23:28.953+00	2026-04-02 18:04:36.613+00	38	116	1	Ελλάδα	\N
877	2086	Γαλάνη	Ευαγγελία	Αλέξανδρος	7.19	1990-10-18	1990-12-29	1985	1200055	1966-01-01	F	4	15	8	Πύργος	2026-04-02 18:38:30.277+00	2026-04-02 18:38:30.277+00	34	116	8	Ελλάδα	\N
878	2087	Κοσμίδου	Γεωργία	Χαράλαμπος	10.00	1986-11-19	1986-02-06	1980	1200056	1959-01-01	F	4	14	11	Καρλόβασι	2026-04-02 18:38:30.42+00	2026-04-02 18:38:30.42+00	\N	116	11	Ελλάδα	\N
880	2090	Παναγιωτίδου	Μαριάννα	Γεώργιος	8.29	1985-10-27	1985-04-30	1980	1200059	1955-01-01	F	4	16	8	Κάτω Αχαΐα	2026-04-02 18:38:30.706+00	2026-04-02 18:38:30.706+00	\N	116	8	Ελλάδα	\N
558	481	Πολίτης	Παναγιώτης	Απόστολος	9.71	2021-05-31	2021-10-07	2009	1100233	1991-01-01	M	5	18	2	Θεσσαλονίκη	2026-03-27 17:20:23.407+00	2026-04-02 18:05:00.253+00	17	116	2	Ελλάδα	\N
881	2091	Πολίτης	Δημήτρης	Χρήστος	7.75	1990-07-02	1989-12-25	1982	1200060	1959-01-01	M	4	15	9	Άμφισσα	2026-04-02 18:38:30.848+00	2026-04-02 18:38:30.848+00	77	116	9	Ελλάδα	\N
882	2092	Μαυρίδου	Ειρήνη	Κωνσταντίνος	6.12	1993-10-14	1993-03-06	1988	1200061	1970-01-01	F	4	15	1	Περιστέρι	2026-04-02 18:38:30.991+00	2026-04-02 18:38:30.991+00	79	116	1	Ελλάδα	\N
279	18	Αθανασίου	Παναγιώτης	Ιωάννης	6.91	2030-08-25	2030-04-10	2022	1061162	2004-01-01	M	3	12	10	Τρίπολη	2026-03-27 13:22:56.648+00	2026-04-02 18:04:20.708+00	43	116	10	Ελλάδα	\N
392	315	Γεωργίου	Αντώνης	Δημήτριος	6.83	2026-01-31	2026-12-03	2020	1048625	2002-01-01	M	2	4	1	Αθήνα	2026-03-27 13:23:29.241+00	2026-04-02 18:04:36.759+00	38	116	1	Ελλάδα	\N
393	316	Γεωργίου	Σοφία	Χρήστος	6.62	2018-04-02	2018-03-16	2010	1084518	1992-01-01	F	6	21	1	Αθήνα	2026-03-27 13:23:29.529+00	2026-04-02 18:04:36.905+00	38	116	1	Ελλάδα	\N
396	319	Πετρόπουλος	Χρήστος	Ιωάννης	7.19	2028-02-17	2028-03-28	2023	1048827	2005-01-01	M	3	7	1	Αθήνα	2026-03-27 13:23:30.394+00	2026-04-02 18:04:37.342+00	38	116	1	Ελλάδα	\N
397	320	Πετροπούλου	Ιωάννα	Παναγιώτης	7.36	2028-02-20	2028-03-31	2017	1082527	1999-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:30.682+00	2026-04-02 18:04:37.487+00	38	116	1	Ελλάδα	\N
398	321	Βασιλείου	Γιώργος	Νικόλαος	6.96	2034-02-25	2034-06-04	2024	1078497	2006-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:30.97+00	2026-04-02 18:04:37.632+00	38	116	1	Ελλάδα	\N
399	322	Βασιλείου	Κατερίνα	Αθανάσιος	7.85	1995-02-28	1995-09-04	1985	1076365	1967-01-01	F	4	16	1	Αθήνα	2026-03-27 13:23:31.258+00	2026-04-02 18:04:37.778+00	38	116	1	Ελλάδα	\N
400	323	Καραγιάννης	Θοδωρής	Χρήστος	10.00	2031-04-03	2031-04-13	2023	1097544	2005-01-01	M	3	8	1	Αθήνα	2026-03-27 13:23:31.546+00	2026-04-02 18:04:37.924+00	38	116	1	Ελλάδα	\N
401	324	Καραγιάννη	Ευαγγελία	Βασίλειος	6.82	2022-08-03	2022-04-17	2014	1070817	1996-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:31.834+00	2026-04-02 18:04:38.07+00	38	116	1	Ελλάδα	\N
402	325	Νικολαΐδης	Στέφανος	Κωνσταντίνος	7.65	2032-12-15	2033-01-24	2025	1062775	2007-01-01	M	3	7	1	Αθήνα	2026-03-27 13:23:32.122+00	2026-04-02 18:04:38.216+00	38	116	1	Ελλάδα	\N
403	326	Νικολαΐδου	Χριστίνα	Κωνσταντίνος	9.02	2023-03-16	2023-04-25	2018	1078138	2000-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:32.41+00	2026-04-02 18:04:38.361+00	38	116	1	Ελλάδα	\N
405	328	Ζαφειρίου	Δέσποινα	Γεώργιος	5.77	1989-03-24	1989-03-05	1983	1074277	1965-01-01	F	4	14	1	Αθήνα	2026-03-27 13:23:32.986+00	2026-04-02 18:04:38.652+00	38	116	1	Ελλάδα	\N
406	329	Μανώλης	Αλέξης	Εμμανουήλ	6.89	2024-03-23	2024-02-05	2019	1087505	2001-01-01	M	2	3	1	Αθήνα	2026-03-27 13:23:33.274+00	2026-04-02 18:04:38.798+00	38	116	1	Ελλάδα	\N
408	331	Ράπτης	Σπύρος	Ανδρέας	6.17	2014-05-04	2014-05-15	2005	1043725	1987-01-01	M	5	18	1	Αθήνα	2026-03-27 13:23:33.887+00	2026-04-02 18:04:39.09+00	38	116	1	Ελλάδα	\N
409	332	Ράπτη	Αθηνά	Ανδρέας	5.39	2027-09-04	2027-05-19	2021	1061337	2003-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:34.174+00	2026-04-02 18:04:39.238+00	38	116	1	Ελλάδα	\N
410	333	Δημητρίου	Περικλής	Σωτήριος	7.15	2015-04-13	2015-05-23	2006	1045613	1988-01-01	M	5	17	1	Αθήνα	2026-03-27 13:23:34.462+00	2026-04-02 18:04:39.384+00	38	116	1	Ελλάδα	\N
411	334	Δημητρίου	Βασιλική	Σωτήριος	7.06	2031-04-17	2031-05-27	2025	1067917	2007-01-01	F	3	7	1	Αθήνα	2026-03-27 13:23:34.75+00	2026-04-02 18:04:39.529+00	38	116	1	Ελλάδα	\N
413	336	Τσακίρη	Ειρήνη	Γεράσιμος	6.67	2025-04-25	2025-04-06	2014	1074837	1996-01-01	F	6	22	1	Αθήνα	2026-03-27 13:23:35.325+00	2026-04-02 18:04:39.821+00	38	116	1	Ελλάδα	\N
414	337	Σπυρόπουλος	Κώστας	Νικόλαος	8.13	2017-04-29	2017-08-06	2010	1073283	1992-01-01	M	6	20	1	Αθήνα	2026-03-27 13:23:35.613+00	2026-04-02 18:04:39.967+00	38	116	1	Ελλάδα	\N
415	338	Σπυροπούλου	Παρασκευή	Νικόλαος	5.42	2033-03-05	2033-12-06	2026	1064999	2008-01-01	F	3	12	1	Αθήνα	2026-03-27 13:23:35.901+00	2026-04-02 18:04:40.112+00	38	116	1	Ελλάδα	\N
416	339	Χατζηδάκης	Μανώλης	Ευάγγελος	8.82	2024-07-05	2024-06-16	2016	1069085	1998-01-01	M	2	4	1	Αθήνα	2026-03-27 13:23:36.189+00	2026-04-02 18:04:40.257+00	38	116	1	Ελλάδα	\N
417	340	Χατζηδάκη	Νίκη	Ευάγγελος	7.20	2033-11-05	2033-06-20	2024	1058205	2006-01-01	F	3	9	1	Αθήνα	2026-03-27 13:23:36.477+00	2026-04-02 18:04:40.403+00	38	116	1	Ελλάδα	\N
418	341	Μακρής	Οδυσσέας	Ηλίας	8.68	2012-05-15	2012-06-24	2006	1042711	1988-01-01	M	5	17	1	Αθήνα	2026-03-27 13:23:36.765+00	2026-04-02 18:04:40.549+00	38	116	1	Ελλάδα	\N
419	342	Μακρή	Μελίνα	Ηλίας	6.65	2029-05-19	2029-06-28	2024	1071405	2006-01-01	F	3	9	1	Αθήνα	2026-03-27 13:23:37.054+00	2026-04-02 18:04:40.694+00	38	116	1	Ελλάδα	\N
420	343	Φωτιάδης	Αχιλλέας	Στυλιανός	8.61	2016-05-23	2016-02-07	2005	1079439	1987-01-01	M	5	17	1	Αθήνα	2026-03-27 13:23:37.342+00	2026-04-02 18:04:40.84+00	38	116	1	Ελλάδα	\N
421	344	Φωτιάδου	Γεωργία	Στυλιανός	8.97	2029-08-23	2029-02-10	2022	1081058	2004-01-01	F	3	9	1	Αθήνα	2026-03-27 13:23:37.632+00	2026-04-02 18:04:40.986+00	38	116	1	Ελλάδα	\N
422	345	Πολίτης	Παναγιώτης	Απόστολος	6.26	2023-05-31	2023-10-07	2013	1046178	1995-01-01	M	6	22	1	Αθήνα	2026-03-27 13:23:37.92+00	2026-04-02 18:04:41.132+00	38	116	1	Ελλάδα	\N
423	346	Πολίτου	Αφροδίτη	Απόστολος	7.26	2018-04-06	2018-07-14	2011	1080164	1993-01-01	F	6	22	1	Αθήνα	2026-03-27 13:23:38.207+00	2026-04-02 18:04:41.277+00	38	116	1	Ελλάδα	\N
425	348	Λαμπροπούλου	Ζωή	Ιωάννης	5.92	2035-12-06	2035-07-22	2025	1048434	2007-01-01	F	3	11	1	Αθήνα	2026-03-27 13:23:38.783+00	2026-04-02 18:04:41.422+00	38	116	1	Ελλάδα	\N
426	349	Αργυρίου	Κυριάκος	Διονύσιος	8.74	2030-01-05	2030-10-06	2025	1088176	2007-01-01	M	3	12	1	Αθήνα	2026-03-27 13:23:39.07+00	2026-04-02 18:04:41.568+00	38	116	1	Ελλάδα	\N
429	352	Καραλή	Ελπίδα	Μιχαήλ	7.86	2025-06-28	2025-07-08	2020	1065137	2002-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:39.933+00	2026-04-02 18:04:41.714+00	38	116	1	Ελλάδα	\N
431	354	Θεοδώρου	Μαργαρίτα	Αλέξανδρος	6.10	2019-06-07	2019-08-15	2014	1050389	1996-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:40.508+00	2026-04-02 18:04:42.031+00	38	116	1	Ελλάδα	\N
883	2093	Πετροπούλου	Καλλιόπη	Κωνσταντίνος	7.08	2002-10-23	2002-12-09	1993	1200062	1969-01-01	F	4	14	7	Λευκάδα	2026-04-02 18:38:31.134+00	2026-04-02 18:38:31.134+00	71	116	7	Ελλάδα	\N
884	2094	Αλεξίου	Θανάσης	Αλέξανδρος	6.38	1988-04-28	1987-05-12	1980	1200063	1957-01-01	M	4	16	11	Ικαρία	2026-04-02 18:38:31.277+00	2026-04-02 18:38:31.277+00	84	116	11	Ελλάδα	\N
603	526	Παπαδόπουλος	Νίκος	Αντώνιος	6.74	1988-01-04	1988-11-05	1980	1100278	1962-01-01	M	4	16	13	Ηράκλειο	2026-03-27 17:20:43.103+00	2026-04-02 18:05:06.799+00	50	116	13	Ελλάδα	\N
885	2095	Πολίτη	Γεωργία	Θεόδωρος	7.42	1999-04-15	1999-07-19	1990	1200064	1972-01-01	F	4	16	10	Κυπαρισσία	2026-04-02 18:38:31.42+00	2026-04-02 18:38:31.42+00	\N	116	10	Ελλάδα	\N
434	357	Κεχαγιάς	Πέτρος	Χαράλαμπος	7.40	2032-07-18	2032-08-27	2024	1059086	2006-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:41.372+00	2026-04-02 18:04:42.177+00	38	116	1	Ελλάδα	\N
887	2098	Παπαδοπούλου	Σοφία	Πέτρος	6.99	2004-07-20	2005-10-01	1990	1200067	1971-01-01	F	4	14	7	Λευκάδα	2026-04-02 18:38:31.706+00	2026-04-02 18:38:31.706+00	71	116	7	Ελλάδα	\N
300	60	Σαμαρά	Δανάη	Χρήστος	6.89	2034-11-09	2034-10-21	2019	1058652	2001-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:02.713+00	2026-04-02 18:04:23.769+00	38	116	1	Ελλάδα	\N
435	358	Κεχαγιά	Αλεξάνδρα	Χαράλαμπος	7.92	2020-07-22	2020-08-31	2014	1094440	1996-01-01	F	6	22	1	Αθήνα	2026-03-27 13:23:41.664+00	2026-04-02 18:04:42.322+00	38	116	1	Ελλάδα	\N
436	359	Μωραΐτης	Γρηγόρης	Θεμιστοκλής	9.03	2031-07-26	2031-04-09	2026	1092829	2008-01-01	M	3	7	8	Πάτρα	2026-03-27 13:23:41.952+00	2026-04-02 18:04:42.467+00	32	116	8	Ελλάδα	\N
437	360	Μωραΐτη	Νεφέλη	Θεμιστοκλής	7.61	2025-07-30	2025-08-09	2018	1046954	2000-01-01	F	2	4	8	Πάτρα	2026-03-27 13:23:42.239+00	2026-04-02 18:04:42.612+00	32	116	8	Ελλάδα	\N
438	361	Μαθιός	Ιάσονας	Παναγιώτης	8.01	2029-03-04	2029-05-13	2014	1100113	1996-01-01	M	2	13	8	Πάτρα	2026-03-27 17:08:00.839+00	2026-04-02 18:04:42.758+00	32	116	8	Ελλάδα	\N
442	365	Αλεξίου	Ελένη	Σπύρος	5.66	2038-09-04	2038-05-19	2024	1100117	2006-01-01	F	3	10	8	Πάτρα	2026-03-27 17:08:02.572+00	2026-04-02 18:04:43.339+00	32	116	8	Ελλάδα	\N
443	366	Αργυρίου	Κυριάκος	Διονύσιος	6.68	2028-06-16	2028-07-26	2022	1100118	2004-01-01	M	3	12	8	Πάτρα	2026-03-27 17:08:03.006+00	2026-04-02 18:04:43.515+00	32	116	8	Ελλάδα	\N
444	367	Κωστοπούλου	Βασιλική	Γεώργιος	6.88	2020-08-22	2020-01-10	2015	1100119	1997-01-01	F	2	13	8	Πάτρα	2026-03-27 17:08:03.441+00	2026-04-02 18:04:43.66+00	32	116	8	Ελλάδα	\N
445	368	Δημοπούλου	Αναστασία	Στέφανος	7.34	2039-07-09	2039-10-17	2023	1100120	2005-01-01	F	3	10	8	Πάτρα	2026-03-27 17:08:03.874+00	2026-04-02 18:04:43.809+00	32	116	8	Ελλάδα	\N
446	369	Μαυρομάτης	Ελένη	Γεώργιος	6.18	2034-09-14	2034-10-24	2023	1100121	2005-01-01	F	3	10	8	Πάτρα	2026-03-27 17:08:04.308+00	2026-04-02 18:04:43.955+00	32	116	8	Ελλάδα	\N
447	370	Δημητρίου	Περικλής	Σωτήριος	6.57	2009-04-13	2009-05-23	2002	1100122	1984-01-01	M	5	19	8	Πάτρα	2026-03-27 17:08:04.742+00	2026-04-02 18:04:44.1+00	32	116	8	Ελλάδα	\N
448	371	Κοκκίνου	Νεφέλη	Ιωάννης	7.20	2024-08-29	2024-08-10	2010	1100123	1992-01-01	F	6	20	8	Πάτρα	2026-03-27 17:08:05.176+00	2026-04-02 18:04:44.246+00	32	116	8	Ελλάδα	\N
449	372	Παναγιωτίδου	Νεφέλη	Ιωάννης	9.12	2024-01-09	2024-11-10	2008	1100124	1990-01-01	F	5	17	8	Πάτρα	2026-03-27 17:08:05.608+00	2026-04-02 18:04:44.391+00	32	116	8	Ελλάδα	\N
450	373	Φωτιάδης	Αχιλλέας	Στυλιανός	8.37	2025-04-10	2025-11-13	2017	1100125	1999-01-01	M	2	3	8	Πάτρα	2026-03-27 17:08:06.041+00	2026-04-02 18:04:44.536+00	32	116	8	Ελλάδα	\N
451	374	Σιδηροπούλου	Κατερίνα	Χρήστος	8.55	2029-09-04	2029-05-19	2018	1100126	2000-01-01	F	2	13	8	Πάτρα	2026-03-27 17:08:06.474+00	2026-04-02 18:04:44.682+00	32	116	8	Ελλάδα	\N
452	375	Ιωάννου	Μαρία	Δημήτριος	6.81	2020-08-31	2020-10-10	2013	1100127	1995-01-01	F	6	21	8	Πάτρα	2026-03-27 17:08:06.907+00	2026-04-02 18:04:44.827+00	32	116	8	Ελλάδα	\N
453	376	Καραμήτρου	Βασιλική	Στέφανος	5.54	2039-04-04	2039-05-14	2025	1100128	2007-01-01	F	3	7	8	Πάτρα	2026-03-27 17:08:07.341+00	2026-04-02 18:04:44.972+00	32	116	8	Ελλάδα	\N
454	377	Περικλής	Αναστασία	Αθανάσιος	8.60	2035-08-26	2035-05-10	2024	1100129	2006-01-01	F	3	10	8	Πάτρα	2026-03-27 17:08:07.773+00	2026-04-02 18:04:45.117+00	32	116	8	Ελλάδα	\N
455	378	Παπαδόπουλος	Μελίνα	Νικόλαος	8.29	2033-08-25	2033-04-10	2021	1100130	2003-01-01	F	2	13	8	Πάτρα	2026-03-27 17:08:08.208+00	2026-04-02 18:04:45.262+00	32	116	8	Ελλάδα	\N
457	380	Μακρόπουλος	Χριστίνα	Δημήτριος	6.72	2035-04-04	2035-05-14	2023	1100132	2005-01-01	F	3	7	8	Πάτρα	2026-03-27 17:08:09.075+00	2026-04-02 18:04:45.552+00	32	116	8	Ελλάδα	\N
458	381	Αργυρίου	Χριστίνα	Ανδρέας	5.43	2030-08-27	2030-06-10	2019	1100133	2001-01-01	F	2	3	8	Πάτρα	2026-03-27 17:08:09.507+00	2026-04-02 18:04:45.697+00	32	116	8	Ελλάδα	\N
459	382	Καραγιάννη	Μαρία	Δημήτριος	5.60	2030-05-04	2030-05-15	2023	1100134	2005-01-01	F	3	7	8	Πάτρα	2026-03-27 17:08:09.94+00	2026-04-02 18:04:45.843+00	32	116	8	Ελλάδα	\N
460	383	Δημητρίου	Κωνσταντίνος	Ιωάννης	7.89	2026-03-31	2026-10-05	2018	1100135	2000-01-01	M	2	3	8	Πάτρα	2026-03-27 17:08:10.375+00	2026-04-02 18:04:45.988+00	32	116	8	Ελλάδα	\N
462	385	Μαυρομάτης	Ελένη	Γεώργιος	7.77	2020-03-30	2020-09-05	2009	1100137	1991-01-01	F	6	21	8	Πάτρα	2026-03-27 17:08:11.239+00	2026-04-02 18:04:46.282+00	32	116	8	Ελλάδα	\N
463	386	Αγγελίδης	Ιάσονας	Παναγιώτης	6.72	2031-09-09	2031-10-19	2015	1100138	1997-01-01	M	2	4	8	Πάτρα	2026-03-27 17:08:11.674+00	2026-04-02 18:04:46.429+00	32	116	8	Ελλάδα	\N
464	387	Κοκκίνου	Νεφέλη	Ιωάννης	6.07	2044-08-24	2044-03-10	2024	1100139	2006-01-01	F	3	9	8	Πάτρα	2026-03-27 17:08:12.107+00	2026-04-02 18:04:46.574+00	32	116	8	Ελλάδα	\N
465	388	Κωνσταντίνου	Χρήστος	Γεώργιος	5.98	2022-11-09	2022-10-21	2013	1100140	1995-01-01	M	6	22	8	Πάτρα	2026-03-27 17:08:12.54+00	2026-04-02 18:04:46.719+00	32	116	8	Ελλάδα	\N
466	389	Ζαφειρίου	Δέσποινα	Γεώργιος	7.42	2031-03-24	2031-03-05	2024	1100141	2006-01-01	F	3	11	8	Πάτρα	2026-03-27 17:08:12.976+00	2026-04-02 18:04:46.865+00	32	116	8	Ελλάδα	\N
467	390	Δημοπούλου	Δημήτρης	Παναγιώτης	8.02	2031-10-01	2031-02-19	2021	1100142	2003-01-01	M	2	4	8	Πάτρα	2026-03-27 17:08:13.409+00	2026-04-02 18:04:47.01+00	32	116	8	Ελλάδα	\N
468	391	Μαρινάκη	Νεκτάριος	Ιωάννης	6.24	2029-07-04	2029-05-17	2023	1100143	2005-01-01	M	3	8	8	Πάτρα	2026-03-27 17:08:13.849+00	2026-04-02 18:04:47.155+00	32	116	8	Ελλάδα	\N
469	392	Μπίρμπας	Παναγιώτης	Θεόδωρος	9.06	2026-03-28	2026-07-05	2014	1100144	1996-01-01	M	2	4	8	Πάτρα	2026-03-27 17:08:14.287+00	2026-04-02 18:04:47.3+00	32	116	8	Ελλάδα	\N
470	393	Γαλάνη	Αλεξάνδρα	Νικόλαος	7.91	2026-02-04	2026-12-05	2014	1100145	1996-01-01	F	6	20	8	Πάτρα	2026-03-27 17:08:14.723+00	2026-04-02 18:04:47.446+00	32	116	8	Ελλάδα	\N
471	394	Λαμπροπούλου	Ζωή	Ιωάννης	8.57	1990-12-06	1990-07-22	1984	1100146	1966-01-01	F	4	14	8	Πάτρα	2026-03-27 17:08:15.161+00	2026-04-02 18:04:47.592+00	32	116	8	Ελλάδα	\N
652	575	Αργυρίου	Χρήστος	Δημήτριος	7.15	2020-03-04	2020-05-13	2010	1100327	1992-01-01	M	6	21	5	Ιωάννινα	2026-03-27 17:21:04.532+00	2026-04-02 18:05:13.946+00	23	116	5	Ελλάδα	\N
473	396	Κυριακίδης	Μυρτώ	Δημήτριος	5.42	2027-03-31	2027-10-05	2022	1100148	2004-01-01	F	3	11	8	Πάτρα	2026-03-27 17:08:16.026+00	2026-04-02 18:04:47.882+00	32	116	8	Ελλάδα	\N
474	397	Καραλής	Αντώνης	Ευάγγελος	5.41	2024-08-19	2024-09-28	2014	1100149	1996-01-01	M	2	3	8	Πάτρα	2026-03-27 17:08:16.458+00	2026-04-02 18:04:48.027+00	32	116	8	Ελλάδα	\N
475	398	Γρηγορίου	Ιωάννα	Χρήστος	6.34	2021-12-09	2021-10-22	2015	1100150	1997-01-01	F	2	3	8	Πάτρα	2026-03-27 17:08:16.891+00	2026-04-02 18:04:48.173+00	32	116	8	Ελλάδα	\N
888	2100	Κωνσταντίνου	Ιωάννης	Αθανάσιος	7.15	2003-12-06	2003-06-23	1989	1200069	1969-01-01	M	4	14	5	Ηγουμενίτσα	2026-04-02 18:38:31.848+00	2026-04-02 18:38:31.848+00	63	116	5	Ελλάδα	\N
889	2101	Πολίτης	Μάριος	Αθανάσιος	5.72	1986-05-16	1986-11-09	1980	1200070	1961-01-01	M	4	14	13	Ιεράπετρα	2026-04-02 18:38:31.992+00	2026-04-02 18:38:31.992+00	89	116	13	Ελλάδα	\N
890	2102	Χριστοδούλου	Ιωάννης	Παναγιώτης	9.94	1990-03-15	1990-11-03	1980	1200071	1957-01-01	M	4	16	8	Μεσολόγγι	2026-04-02 18:38:32.14+00	2026-04-02 18:38:32.14+00	73	116	8	Ελλάδα	\N
349	158	Σταματίου	Γιώργος	Ιωάννης	5.70	2038-01-09	2038-11-10	2026	1044235	2008-01-01	M	3	11	1	Αθήνα	2026-03-27 13:23:16.848+00	2026-04-02 18:04:30.785+00	38	116	1	Ελλάδα	\N
350	160	Δεληγιάννης	Αλεξάνδρα	Χρήστος	7.09	2041-08-22	2041-01-10	2022	1065077	2004-01-01	F	3	9	1	Αθήνα	2026-03-27 13:23:17.136+00	2026-04-02 18:04:30.938+00	38	116	1	Ελλάδα	\N
476	399	Λαμπροπούλου	Ζωή	Ιωάννης	7.03	2011-12-06	2011-07-22	2004	1100151	1986-01-01	F	5	17	8	Πάτρα	2026-03-27 17:08:17.327+00	2026-04-02 18:04:48.318+00	32	116	8	Ελλάδα	\N
891	2103	Κοσμίδης	Μιχάλης	Αλέξανδρος	6.48	1989-12-11	1990-06-03	1981	1200072	1962-01-01	M	4	16	7	Σάμη	2026-04-02 18:38:32.288+00	2026-04-02 18:38:32.288+00	\N	116	7	Ελλάδα	\N
892	2104	Οικονόμου	Δήμητρα	Παναγιώτης	6.10	2004-05-20	2004-05-20	1999	1200073	1981-01-01	F	5	18	10	Τρίπολη	2026-04-02 18:38:32.431+00	2026-04-02 18:38:32.431+00	43	116	10	Ελλάδα	\N
894	2106	Πολίτης	Χρήστος	Χρήστος	9.84	1998-06-27	1998-01-09	1993	1200075	1973-01-01	M	4	15	2	Θεσσαλονίκη	2026-04-02 18:38:32.72+00	2026-04-02 18:38:32.72+00	17	116	2	Ελλάδα	\N
347	154	Καραβίας	Βασιλική	Ανδρέας	9.46	2035-06-04	2035-05-16	2025	1094621	2007-01-01	F	3	12	1	Αθήνα	2026-03-27 13:23:16.273+00	2026-04-02 18:04:30.495+00	38	116	1	Ελλάδα	\N
477	400	Χατζηδάκης	Μανώλης	Ευάγγελος	7.56	2022-07-05	2022-06-16	2016	1100152	1998-01-01	M	2	4	8	Πάτρα	2026-03-27 17:08:17.758+00	2026-04-02 18:04:48.464+00	32	116	8	Ελλάδα	\N
478	401	Κεχαγιά	Αλεξάνδρα	Χαράλαμπος	7.45	2033-07-22	2033-08-31	2025	1100153	2007-01-01	F	3	10	8	Πάτρα	2026-03-27 17:08:18.191+00	2026-04-02 18:04:48.61+00	32	116	8	Ελλάδα	\N
479	402	Αρβανιτάκη	Χρήστος	Αθανάσιος	7.35	2021-07-09	2021-10-17	2010	1100154	1992-01-01	M	6	22	8	Πάτρα	2026-03-27 17:08:18.624+00	2026-04-02 18:04:48.755+00	32	116	8	Ελλάδα	\N
480	403	Μακρόπουλος	Ελένη	Ανδρέας	7.32	2027-08-04	2027-05-18	2015	1100155	1997-01-01	F	2	4	8	Πάτρα	2026-03-27 17:08:19.056+00	2026-04-02 18:04:48.9+00	32	116	8	Ελλάδα	\N
481	404	Παπαγεωργίου	Κατερίνα	Δημήτριος	7.23	2025-05-04	2025-05-15	2015	1100156	1997-01-01	F	2	13	8	Πάτρα	2026-03-27 17:08:19.489+00	2026-04-02 18:04:49.045+00	32	116	8	Ελλάδα	\N
482	405	Βενιζέλου	Ολυμπία	Παναγιώτης	6.55	2026-06-04	2026-05-16	2019	1100157	2001-01-01	F	2	3	8	Πάτρα	2026-03-27 17:08:19.922+00	2026-04-02 18:04:49.191+00	32	116	8	Ελλάδα	\N
483	406	Καραγιάννης	Νεκτάριος	Στέφανος	8.34	2024-03-28	2024-07-05	2015	1100158	1997-01-01	M	2	3	8	Πάτρα	2026-03-27 17:08:20.354+00	2026-04-02 18:04:49.336+00	32	116	8	Ελλάδα	\N
484	407	Αγγελίδης	Ιάσονας	Παναγιώτης	6.97	2040-09-09	2040-10-19	2026	1100159	2008-01-01	M	3	8	8	Πάτρα	2026-03-27 17:08:20.786+00	2026-04-02 18:04:49.481+00	32	116	8	Ελλάδα	\N
485	408	Αργυρίου	Χριστίνα	Ανδρέας	5.47	2003-08-28	2003-07-10	1998	1100160	1980-01-01	F	5	17	8	Πάτρα	2026-03-27 17:08:21.218+00	2026-04-02 18:04:49.627+00	32	116	8	Ελλάδα	\N
488	411	Τριανταφύλλου	Μιχάλης	Νικόλαος	7.26	2037-05-09	2037-10-15	2023	1100163	2005-01-01	M	3	11	8	Πάτρα	2026-03-27 17:19:52.784+00	2026-04-02 18:04:50.063+00	32	116	8	Ελλάδα	\N
489	412	Μωραΐτης	Γρηγόρης	Θεμιστοκλής	6.96	2027-04-17	2027-05-27	2020	1100164	2002-01-01	M	2	4	8	Πάτρα	2026-03-27 17:19:53.221+00	2026-04-02 18:04:50.208+00	32	116	8	Ελλάδα	\N
490	413	Γαλάνη	Αλεξάνδρα	Νικόλαος	6.50	2027-07-04	2027-05-17	2019	1100165	2001-01-01	F	2	3	8	Πάτρα	2026-03-27 17:19:53.657+00	2026-04-02 18:04:50.354+00	32	116	8	Ελλάδα	\N
492	415	Μαθιός	Μυρτώ	Χρήστος	8.61	2021-09-04	2021-05-19	2009	1100167	1991-01-01	F	6	21	8	Πάτρα	2026-03-27 17:19:54.532+00	2026-04-02 18:04:50.644+00	32	116	8	Ελλάδα	\N
493	416	Παπαδόπουλος	Δημήτρης	Γεώργιος	7.53	1998-01-15	1998-02-24	1991	1100168	1973-01-01	M	4	14	8	Πάτρα	2026-03-27 17:19:54.969+00	2026-04-02 18:04:50.79+00	32	116	8	Ελλάδα	\N
494	417	Σταματίου	Γιώργος	Ιωάννης	6.98	1991-06-04	1991-05-16	1985	1100169	1967-01-01	M	4	14	8	Πάτρα	2026-03-27 17:19:55.407+00	2026-04-02 18:04:50.936+00	32	116	8	Ελλάδα	\N
495	418	Θεοδώρου	Μαργαρίτα	Αλέξανδρος	6.83	2034-06-07	2034-08-15	2026	1100170	2008-01-01	F	3	9	8	Πάτρα	2026-03-27 17:19:55.844+00	2026-04-02 18:04:51.081+00	32	116	8	Ελλάδα	\N
496	419	Αργυρίου	Κυριάκος	Διονύσιος	6.42	2023-06-16	2023-07-26	2014	1100171	1996-01-01	M	6	20	8	Πάτρα	2026-03-27 17:19:56.282+00	2026-04-02 18:04:51.23+00	32	116	8	Ελλάδα	\N
497	420	Φωτιάδου	Γεωργία	Στυλιανός	8.10	2016-05-27	2016-06-07	2007	1100172	1989-01-01	F	5	19	8	Πάτρα	2026-03-27 17:19:56.719+00	2026-04-02 18:04:51.375+00	32	116	8	Ελλάδα	\N
498	421	Πετράκη	Δέσποινα	Γεώργιος	8.96	2024-08-22	2024-01-10	2009	1100173	1991-01-01	F	6	22	8	Πάτρα	2026-03-27 17:19:57.157+00	2026-04-02 18:04:51.521+00	32	116	8	Ελλάδα	\N
499	422	Κεχαγιάς	Πέτρος	Χαράλαμπος	6.98	2028-07-18	2028-08-27	2023	1100174	2005-01-01	M	3	7	8	Πάτρα	2026-03-27 17:19:57.594+00	2026-04-02 18:04:51.666+00	32	116	8	Ελλάδα	\N
500	423	Δημητρίου	Κωνσταντίνος	Ιωάννης	7.17	2012-09-13	2012-10-23	2005	1100175	1987-01-01	M	5	19	8	Πάτρα	2026-03-27 17:19:58.03+00	2026-04-02 18:04:51.811+00	32	116	8	Ελλάδα	\N
501	424	Σπυρόπουλος	Άρης	Ευάγγελος	7.76	2022-03-28	2022-07-05	2017	1100176	1999-01-01	M	2	4	8	Πάτρα	2026-03-27 17:19:58.467+00	2026-04-02 18:04:51.957+00	32	116	8	Ελλάδα	\N
502	425	Αργυρίου	Χριστίνα	Ανδρέας	6.91	2019-08-31	2019-10-10	2007	1100177	1989-01-01	F	5	17	8	Πάτρα	2026-03-27 17:19:58.904+00	2026-04-02 18:04:52.102+00	32	116	8	Ελλάδα	\N
702	625	Κεχαγιάς	Πέτρος	Χαράλαμπος	8.80	2027-07-18	2027-08-27	2019	1100377	2001-01-01	M	2	4	1	Πειραιάς	2026-03-27 17:21:26.387+00	2026-04-02 18:05:21.237+00	39	116	1	Ελλάδα	\N
503	426	Σιδηροπούλου	Απόστολος	Ευάγγελος	8.09	2030-04-04	2030-05-14	2015	1100178	1997-01-01	M	2	3	8	Πάτρα	2026-03-27 17:19:59.341+00	2026-04-02 18:04:52.247+00	32	116	8	Ελλάδα	\N
504	427	Καρανάσιου	Αγγελική	Δημήτριος	6.22	2037-06-09	2037-10-16	2022	1100179	2004-01-01	F	3	9	8	Πάτρα	2026-03-27 17:19:59.783+00	2026-04-02 18:04:52.393+00	32	116	8	Ελλάδα	\N
505	428	Λαμπροπούλου	Ζωή	Ιωάννης	6.97	2023-12-06	2023-07-22	2017	1100180	1999-01-01	F	2	13	8	Πάτρα	2026-03-27 17:20:00.22+00	2026-04-02 18:04:52.539+00	32	116	8	Ελλάδα	\N
507	430	Χατζηδάκης	Μανώλης	Ευάγγελος	7.17	2036-07-05	2036-06-16	2026	1100182	2008-01-01	M	3	12	8	Πάτρα	2026-03-27 17:20:01.093+00	2026-04-02 18:04:52.83+00	32	116	8	Ελλάδα	\N
508	431	Μπίρμπας	Παναγιώτης	Θεόδωρος	7.51	2028-08-25	2028-04-10	2020	1100183	2002-01-01	M	2	4	8	Πάτρα	2026-03-27 17:20:01.529+00	2026-04-02 18:04:52.975+00	32	116	8	Ελλάδα	\N
509	432	Λαμπροπούλου	Ζωή	Ιωάννης	8.05	2017-12-06	2017-07-22	2008	1100184	1990-01-01	F	5	18	8	Πάτρα	2026-03-27 17:20:01.966+00	2026-04-02 18:04:53.12+00	32	116	8	Ελλάδα	\N
510	433	Νικολάου	Αλέξανδρος	Σταύρος	7.70	2020-09-25	2020-04-11	2008	1100185	1990-01-01	M	5	19	8	Πάτρα	2026-03-27 17:20:02.405+00	2026-04-02 18:04:53.265+00	32	116	8	Ελλάδα	\N
895	2107	Τσακίρης	Νίκος	Αλέξανδρος	8.95	1993-12-10	1993-05-31	1987	1200076	1969-01-01	M	4	14	12	Κως	2026-04-02 18:38:32.865+00	2026-04-02 18:38:32.865+00	48	116	12	Ελλάδα	\N
896	2108	Καραλής	Νίκος	Αλέξανδρος	6.17	2000-04-07	2000-12-16	1995	1200077	1972-01-01	M	4	15	12	Θήρα	2026-04-02 18:38:33.008+00	2026-04-02 18:38:33.008+00	88	116	12	Ελλάδα	\N
897	2109	Πάλλης	Αντώνης	Χαράλαμπος	5.23	1989-04-08	1989-04-17	1981	1200078	1963-01-01	M	4	15	7	Λευκάδα	2026-04-02 18:38:33.152+00	2026-04-02 18:38:33.152+00	71	116	7	Ελλάδα	\N
899	2112	Καραλή	Ιωάννα	Γεώργιος	6.06	1998-03-09	1999-09-02	1989	1200081	1969-01-01	F	4	14	4	Διδυμότειχο	2026-04-02 18:38:33.437+00	2026-04-02 18:38:33.437+00	\N	116	4	Ελλάδα	\N
512	435	Παπαϊωάννου	Δέσποινα	Στέφανος	7.44	2029-03-26	2029-05-05	2017	1100187	1999-01-01	F	2	3	8	Πάτρα	2026-03-27 17:20:03.278+00	2026-04-02 18:04:53.556+00	32	116	8	Ελλάδα	\N
901	2114	Ράπτης	Γιώργος	Παναγιώτης	6.79	1986-05-02	1985-08-16	1980	1200083	1961-01-01	M	4	15	8	Καλάβρυτα	2026-04-02 18:38:33.723+00	2026-04-02 18:38:33.723+00	\N	116	8	Ελλάδα	\N
395	318	Αναστασίου	Αναστασία	Νικόλαος	6.91	2024-12-02	2024-03-23	2017	1047578	1999-01-01	F	2	13	1	Αθήνα	2026-03-27 13:23:30.106+00	2026-04-02 18:04:37.196+00	38	116	1	Ελλάδα	\N
513	436	Μπίρμπας	Παναγιώτης	Θεόδωρος	7.11	2024-11-09	2024-10-21	2018	1100188	2000-01-01	M	2	4	8	Πάτρα	2026-03-27 17:20:03.715+00	2026-04-02 18:04:53.701+00	32	116	8	Ελλάδα	\N
514	437	Καρβούνης	Πέτρος	Ευάγγελος	5.86	2004-05-09	2004-10-15	1996	1100189	1978-01-01	M	4	16	8	Πάτρα	2026-03-27 17:20:04.152+00	2026-04-02 18:04:53.846+00	32	116	8	Ελλάδα	\N
515	438	Σαμαρά	Δανάη	Χρήστος	7.39	2036-06-09	2036-10-16	2024	1100190	2006-01-01	F	3	12	8	Πάτρα	2026-03-27 17:20:04.589+00	2026-04-02 18:04:53.991+00	32	116	8	Ελλάδα	\N
516	439	Μαρινάκη	Νεκτάριος	Ιωάννης	9.31	2015-05-07	2015-08-14	2010	1100191	1992-01-01	M	6	21	8	Πάτρα	2026-03-27 17:20:05.026+00	2026-04-02 18:04:54.137+00	32	116	8	Ελλάδα	\N
517	440	Μαρινάκη	Νεκτάριος	Ιωάννης	7.85	2025-08-25	2025-04-10	2019	1100192	2001-01-01	M	2	13	8	Πάτρα	2026-03-27 17:20:05.464+00	2026-04-02 18:04:54.282+00	32	116	8	Ελλάδα	\N
518	441	Καρβούνης	Δημήτρης	Νικόλαος	6.57	2037-09-09	2037-10-19	2025	1100193	2007-01-01	M	3	10	8	Πάτρα	2026-03-27 17:20:05.899+00	2026-04-02 18:04:54.427+00	32	116	8	Ελλάδα	\N
519	442	Παπακωνσταντίνου	Σοφία	Νικόλαος	7.05	2016-08-28	2016-07-10	2010	1100194	1992-01-01	F	6	22	8	Πάτρα	2026-03-27 17:20:06.336+00	2026-04-02 18:04:54.572+00	32	116	8	Ελλάδα	\N
520	443	Αρβανιτάκη	Χρήστος	Αθανάσιος	6.79	2030-08-17	2030-09-26	2018	1100195	2000-01-01	M	2	3	8	Πάτρα	2026-03-27 17:20:06.773+00	2026-04-02 18:04:54.717+00	32	116	8	Ελλάδα	\N
521	444	Σταματίου	Γιώργος	Ιωάννης	7.47	2021-04-13	2021-05-23	2014	1100196	1996-01-01	M	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:07.21+00	2026-04-02 18:04:54.863+00	17	116	2	Ελλάδα	\N
523	446	Γαλάνη	Δέσποινα	Αθανάσιος	7.92	2031-04-20	2031-05-30	2016	1100198	1998-01-01	F	2	13	2	Θεσσαλονίκη	2026-03-27 17:20:08.085+00	2026-04-02 18:04:55.156+00	17	116	2	Ελλάδα	\N
524	447	Αγγελίδης	Ιάσονας	Παναγιώτης	8.28	2025-09-14	2025-10-24	2010	1100199	1992-01-01	M	6	20	2	Θεσσαλονίκη	2026-03-27 17:20:08.522+00	2026-04-02 18:04:55.301+00	17	116	2	Ελλάδα	\N
525	448	Δημητρίου	Περικλής	Σωτήριος	7.76	2026-04-13	2026-05-23	2016	1100200	1998-01-01	M	2	13	2	Θεσσαλονίκη	2026-03-27 17:20:08.96+00	2026-04-02 18:04:55.447+00	17	116	2	Ελλάδα	\N
526	449	Χριστοπούλου	Κατερίνα	Στέφανος	6.97	2023-01-05	2023-10-06	2018	1100201	2000-01-01	F	2	4	2	Θεσσαλονίκη	2026-03-27 17:20:09.397+00	2026-04-02 18:04:55.594+00	17	116	2	Ελλάδα	\N
527	450	Σπυρόπουλος	Κώστας	Νικόλαος	8.11	2004-11-21	2004-12-31	1999	1100202	1981-01-01	M	5	18	2	Θεσσαλονίκη	2026-03-27 17:20:09.833+00	2026-04-02 18:04:55.739+00	17	116	2	Ελλάδα	\N
528	451	Μακρόπουλος	Ελένη	Ανδρέας	9.62	2029-10-08	2029-09-19	2021	1100203	2003-01-01	F	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:10.27+00	2026-04-02 18:04:55.886+00	17	116	2	Ελλάδα	\N
529	452	Αγγελίδης	Ιάσονας	Παναγιώτης	7.73	2031-08-23	2031-02-10	2022	1100204	2004-01-01	M	3	9	2	Θεσσαλονίκη	2026-03-27 17:20:10.707+00	2026-04-02 18:04:56.035+00	17	116	2	Ελλάδα	\N
530	453	Γαλάνη	Δέσποινα	Αθανάσιος	8.08	2028-03-31	2028-10-05	2015	1100205	1997-01-01	F	2	4	2	Θεσσαλονίκη	2026-03-27 17:20:11.143+00	2026-04-02 18:04:56.18+00	17	116	2	Ελλάδα	\N
531	454	Κυριακίδης	Μυρτώ	Δημήτριος	7.23	2029-09-09	2029-10-19	2024	1100206	2006-01-01	F	3	11	2	Θεσσαλονίκη	2026-03-27 17:20:11.58+00	2026-04-02 18:04:56.326+00	17	116	2	Ελλάδα	\N
532	455	Σιδηροπούλου	Κατερίνα	Χρήστος	8.70	2032-06-23	2032-02-08	2022	1100207	2004-01-01	F	3	12	2	Θεσσαλονίκη	2026-03-27 17:20:12.017+00	2026-04-02 18:04:56.471+00	17	116	2	Ελλάδα	\N
533	456	Γαλάνη	Αλεξάνδρα	Νικόλαος	5.68	2005-11-24	2006-03-01	2000	1100208	1982-01-01	F	5	19	2	Θεσσαλονίκη	2026-03-27 17:20:12.455+00	2026-04-02 18:04:56.616+00	17	116	2	Ελλάδα	\N
534	457	Νικολάου	Σοφία	Νικόλαος	5.99	2025-10-06	2025-07-20	2016	1100209	1998-01-01	F	2	4	2	Θεσσαλονίκη	2026-03-27 17:20:12.892+00	2026-04-02 18:04:56.761+00	17	116	2	Ελλάδα	\N
750	673	Τσακίρης	Μάριος	Γεράσιμος	8.40	2021-04-21	2021-05-31	2014	1100425	1996-01-01	M	2	13	10	Καλαμάτα	2026-03-27 17:21:47.382+00	2026-04-02 18:05:28.218+00	41	116	10	Ελλάδα	\N
535	458	Καρβούνης	Δημήτρης	Νικόλαος	7.28	2032-08-21	2032-09-30	2025	1100210	2007-01-01	M	3	8	2	Θεσσαλονίκη	2026-03-27 17:20:13.329+00	2026-04-02 18:04:56.907+00	17	116	2	Ελλάδα	\N
536	459	Αρβανιτάκη	Χρήστος	Αθανάσιος	6.98	2032-05-09	2032-10-15	2016	1100211	1998-01-01	M	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:13.766+00	2026-04-02 18:04:57.052+00	17	116	2	Ελλάδα	\N
537	460	Σπυρόπουλος	Κώστας	Νικόλαος	8.50	2016-10-13	2016-11-22	2011	1100212	1993-01-01	M	6	22	2	Θεσσαλονίκη	2026-03-27 17:20:14.203+00	2026-04-02 18:04:57.198+00	17	116	2	Ελλάδα	\N
539	462	Δημητρίου	Ιρις	Ευάγγελος	6.95	2018-12-20	2019-01-29	2009	1100214	1991-01-01	F	6	22	2	Θεσσαλονίκη	2026-03-27 17:20:15.079+00	2026-04-02 18:04:57.489+00	17	116	2	Ελλάδα	\N
540	463	Κυριαζίδης	Ολυμπία	Στέφανος	5.00	2031-03-24	2031-03-05	2020	1100215	2002-01-01	F	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:15.52+00	2026-04-02 18:04:57.634+00	17	116	2	Ελλάδα	\N
541	464	Γρηγορίου	Ιωάννα	Χρήστος	7.95	2025-11-09	2025-10-21	2011	1100216	1993-01-01	F	6	22	2	Θεσσαλονίκη	2026-03-27 17:20:15.957+00	2026-04-02 18:04:57.78+00	17	116	2	Ελλάδα	\N
542	465	Καραβίας	Βασιλική	Ανδρέας	7.28	2024-06-17	2024-07-27	2019	1100217	2001-01-01	F	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:16.4+00	2026-04-02 18:04:57.926+00	17	116	2	Ελλάδα	\N
727	650	Μακρή	Αλέξανδρος	Αθανάσιος	8.70	2027-02-09	2027-12-10	2020	1100402	2002-01-01	M	2	3	6	Τρίκαλα	2026-03-27 17:21:37.324+00	2026-04-02 18:05:24.872+00	28	116	6	Ελλάδα	\N
543	466	Σιδηροπούλου	Κατερίνα	Χρήστος	8.09	2022-08-20	2022-09-29	2015	1100218	1997-01-01	F	2	4	2	Θεσσαλονίκη	2026-03-27 17:20:16.837+00	2026-04-02 18:04:58.071+00	17	116	2	Ελλάδα	\N
544	467	Μπίρμπας	Παναγιώτης	Θεόδωρος	8.36	2033-04-04	2033-05-14	2026	1100219	2008-01-01	M	3	12	2	Θεσσαλονίκη	2026-03-27 17:20:17.273+00	2026-04-02 18:04:58.217+00	17	116	2	Ελλάδα	\N
745	668	Αρβανιτάκη	Νάντια	Ιωάννης	5.95	2031-12-09	2031-10-22	2025	1100420	2007-01-01	F	3	7	9	Χαλκίδα	2026-03-27 17:21:45.196+00	2026-04-02 18:05:27.491+00	35	116	9	Ελλάδα	\N
790	713	Αγγελίδης	Χριστίνα	Στέφανος	7.50	2032-03-25	2032-04-05	2026	1100465	2008-01-01	F	3	12	1	Αθήνα	2026-03-28 10:34:56.536+00	2026-04-02 18:05:34.035+00	38	116	1	Ελλάδα	\N
791	714	Καρβούνης	Πέτρος	Ευάγγελος	7.05	2031-07-04	2031-05-17	2018	1100466	2000-01-01	M	2	13	1	Αθήνα	2026-03-28 10:34:56.974+00	2026-04-02 18:05:34.18+00	38	116	1	Ελλάδα	\N
792	715	Τριανταφύλλου	Μιχάλης	Νικόλαος	7.98	2039-04-09	2039-10-14	2025	1100467	2007-01-01	M	3	7	1	Αθήνα	2026-03-28 10:34:57.412+00	2026-04-02 18:05:34.325+00	38	116	1	Ελλάδα	\N
545	468	Ζαφειρίου	Δέσποινα	Γεώργιος	6.87	2026-03-15	2026-04-24	2017	1100220	1999-01-01	F	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:17.713+00	2026-04-02 18:04:58.362+00	17	116	2	Ελλάδα	\N
546	469	Αρβανιτάκη	Χρήστος	Αθανάσιος	8.43	2038-03-04	2038-05-13	2024	1100221	2006-01-01	M	3	7	2	Θεσσαλονίκη	2026-03-27 17:20:18.15+00	2026-04-02 18:04:58.508+00	17	116	2	Ελλάδα	\N
547	470	Κωστοπούλου	Άννα	Σταύρος	6.49	2018-05-04	2018-05-15	2009	1100222	1991-01-01	F	5	17	2	Θεσσαλονίκη	2026-03-27 17:20:18.594+00	2026-04-02 18:04:58.653+00	17	116	2	Ελλάδα	\N
548	471	Καραλή	Ελπίδα	Μιχαήλ	7.68	2017-06-28	2017-07-08	2012	1100223	1994-01-01	F	6	22	2	Θεσσαλονίκη	2026-03-27 17:20:19.031+00	2026-04-02 18:04:58.798+00	17	116	2	Ελλάδα	\N
549	472	Μπίρμπας	Παναγιώτης	Θεόδωρος	8.81	2014-03-04	2014-05-13	2001	1100224	1983-01-01	M	5	18	2	Θεσσαλονίκη	2026-03-27 17:20:19.468+00	2026-04-02 18:04:58.944+00	17	116	2	Ελλάδα	\N
902	2115	Καρρά	Γεωργία	Ιωάννης	7.38	1996-03-24	1995-10-28	1991	1200084	1971-01-01	F	4	14	1	Μαρούσι	2026-04-02 18:38:33.866+00	2026-04-02 18:38:33.866+00	\N	116	1	Ελλάδα	\N
903	2116	Τριανταφύλλου	Φωτεινή	Κωνσταντίνος	8.22	1989-10-10	1989-03-12	1981	1200085	1959-01-01	F	4	15	5	Μέτσοβο	2026-04-02 18:38:34.01+00	2026-04-02 18:38:34.01+00	65	116	5	Ελλάδα	\N
906	2119	Πάλλη	Χριστίνα	Πέτρος	6.56	2003-08-24	2003-04-14	1992	1200088	1973-01-01	F	4	16	3	Γρεβενά	2026-04-02 18:38:34.438+00	2026-04-02 18:38:34.438+00	60	116	3	Ελλάδα	\N
550	473	Νικολαΐδου	Χριστίνα	Κωνσταντίνος	8.53	2019-03-16	2019-04-25	2011	1100225	1993-01-01	F	6	20	2	Θεσσαλονίκη	2026-03-27 17:20:19.906+00	2026-04-02 18:04:59.089+00	17	116	2	Ελλάδα	\N
551	474	Ιωαννίδης	Νικόλαος	Παναγιώτης	6.44	2032-08-19	2032-09-28	2017	1100226	1999-01-01	M	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:20.343+00	2026-04-02 18:04:59.235+00	17	116	2	Ελλάδα	\N
552	475	Γαλάνη	Αλεξάνδρα	Νικόλαος	7.73	2017-12-03	2017-04-21	2011	1100227	1993-01-01	F	6	20	2	Θεσσαλονίκη	2026-03-27 17:20:20.78+00	2026-04-02 18:04:59.38+00	17	116	2	Ελλάδα	\N
560	483	Θεοδώρου	Βαγγέλης	Αλέξανδρος	5.80	2025-10-01	2025-02-19	2020	1100235	2002-01-01	M	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:24.281+00	2026-04-02 18:05:00.544+00	17	116	2	Ελλάδα	\N
561	484	Αλεξίου	Ελένη	Σπυρίδων	8.90	2018-03-04	2018-05-13	2013	1100236	1995-01-01	F	6	21	2	Θεσσαλονίκη	2026-03-27 17:20:24.718+00	2026-04-02 18:05:00.689+00	17	116	2	Ελλάδα	\N
562	485	Μπίρμπας	Παναγιώτης	Θεόδωρος	8.84	2008-08-23	2008-02-10	1996	1100237	1978-01-01	M	4	15	2	Θεσσαλονίκη	2026-03-27 17:20:25.155+00	2026-04-02 18:05:00.834+00	17	116	2	Ελλάδα	\N
563	486	Κεχαγιάς	Πέτρος	Χαράλαμπος	5.81	2006-07-18	2006-08-27	1998	1100238	1980-01-01	M	4	14	2	Θεσσαλονίκη	2026-03-27 17:20:25.592+00	2026-04-02 18:05:00.979+00	17	116	2	Ελλάδα	\N
564	487	Κωνσταντίνου	Χρήστος	Γεώργιος	9.13	2021-03-24	2021-03-05	2014	1100239	1996-01-01	M	6	21	2	Θεσσαλονίκη	2026-03-27 17:20:26.03+00	2026-04-02 18:05:01.125+00	17	116	2	Ελλάδα	\N
565	488	Σταματίου	Γιώργος	Ιωάννης	5.69	2036-10-04	2036-05-20	2025	1100240	2007-01-01	M	3	8	2	Θεσσαλονίκη	2026-03-27 17:20:26.467+00	2026-04-02 18:05:01.271+00	17	116	2	Ελλάδα	\N
566	489	Αργυρίου	Χριστίνα	Ανδρέας	8.60	2037-03-09	2037-10-13	2026	1100241	2008-01-01	F	3	7	2	Θεσσαλονίκη	2026-03-27 17:20:26.903+00	2026-04-02 18:05:01.416+00	17	116	2	Ελλάδα	\N
568	491	Παναγιωτίδου	Νεφέλη	Ιωάννης	8.79	2033-08-23	2033-02-10	2018	1100243	2000-01-01	F	2	4	2	Θεσσαλονίκη	2026-03-27 17:20:27.781+00	2026-04-02 18:05:01.706+00	17	116	2	Ελλάδα	\N
569	492	Παπακωνσταντίνου	Σοφία	Νικόλαος	7.38	2038-03-23	2038-02-05	2026	1100244	2008-01-01	F	3	10	2	Θεσσαλονίκη	2026-03-27 17:20:28.218+00	2026-04-02 18:05:01.851+00	17	116	2	Ελλάδα	\N
570	493	Κυριαζίδης	Ολυμπία	Στέφανος	6.55	2030-03-02	2030-03-15	2025	1100245	2007-01-01	F	3	12	2	Θεσσαλονίκη	2026-03-27 17:20:28.664+00	2026-04-02 18:05:01.997+00	17	116	2	Ελλάδα	\N
571	494	Καραλής	Αντώνης	Ευάγγελος	6.52	2022-06-09	2022-10-16	2011	1100246	1993-01-01	M	6	22	2	Θεσσαλονίκη	2026-03-27 17:20:29.107+00	2026-04-02 18:05:02.142+00	17	116	2	Ελλάδα	\N
572	495	Ζαχαρίου	Αντώνης	Δημήτριος	9.08	2023-03-09	2023-10-13	2016	1100247	1998-01-01	M	2	4	2	Θεσσαλονίκη	2026-03-27 17:20:29.544+00	2026-04-02 18:05:02.287+00	17	116	2	Ελλάδα	\N
573	496	Ζαφειρίου	Δέσποινα	Γεώργιος	7.66	2031-03-24	2031-03-05	2026	1100248	2008-01-01	F	3	12	2	Θεσσαλονίκη	2026-03-27 17:20:29.983+00	2026-04-02 18:05:02.433+00	17	116	2	Ελλάδα	\N
574	497	Νικολάου	Αλέξανδρος	Σταύρος	6.91	2019-07-21	2019-08-30	2010	1100249	1992-01-01	M	6	22	2	Θεσσαλονίκη	2026-03-27 17:20:30.42+00	2026-04-02 18:05:02.578+00	17	116	2	Ελλάδα	\N
575	498	Μανώλη	Άννα	Μιχαήλ	8.65	2016-01-04	2016-11-05	2009	1100250	1991-01-01	F	6	22	2	Θεσσαλονίκη	2026-03-27 17:20:30.858+00	2026-04-02 18:05:02.723+00	17	116	2	Ελλάδα	\N
576	499	Παπαϊωάννου	Δέσποινα	Στέφανος	5.51	1996-06-09	1996-10-16	1986	1100251	1968-01-01	F	4	16	2	Θεσσαλονίκη	2026-03-27 17:20:31.298+00	2026-04-02 18:05:02.869+00	17	116	2	Ελλάδα	\N
577	500	Αγγελίδης	Ιάσονας	Παναγιώτης	6.85	2032-08-28	2032-07-10	2021	1100252	2003-01-01	M	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:31.736+00	2026-04-02 18:05:03.014+00	17	116	2	Ελλάδα	\N
578	501	Κωνσταντίνου	Σοφία	Χρήστος	7.52	2022-03-22	2022-01-05	2014	1100253	1996-01-01	F	2	13	2	Θεσσαλονίκη	2026-03-27 17:20:32.173+00	2026-04-02 18:05:03.159+00	17	116	2	Ελλάδα	\N
579	502	Αρβανιτάκη	Χρήστος	Αθανάσιος	8.53	2019-07-09	2019-10-17	2005	1100254	1987-01-01	M	5	19	2	Θεσσαλονίκη	2026-03-27 17:20:32.61+00	2026-04-02 18:05:03.305+00	17	116	2	Ελλάδα	\N
580	503	Νικολάου	Αλέξανδρος	Σταύρος	9.22	2028-04-04	2028-05-14	2014	1100255	1996-01-01	M	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:33.047+00	2026-04-02 18:05:03.45+00	17	116	2	Ελλάδα	\N
581	504	Κωνσταντίνου	Χρήστος	Γεώργιος	7.11	2030-09-19	2030-10-29	2023	1100256	2005-01-01	M	3	12	2	Θεσσαλονίκη	2026-03-27 17:20:33.484+00	2026-04-02 18:05:03.596+00	17	116	2	Ελλάδα	\N
583	506	Χαρίτου	Στέφανος	Γεώργιος	6.14	2039-08-28	2039-07-10	2026	1100258	2008-01-01	M	3	12	2	Θεσσαλονίκη	2026-03-27 17:20:34.36+00	2026-04-02 18:05:03.886+00	17	116	2	Ελλάδα	\N
584	507	Αρβανιτάκη	Νάντια	Ιωάννης	7.08	2018-08-22	2018-01-10	2012	1100259	1994-01-01	F	6	22	2	Θεσσαλονίκη	2026-03-27 17:20:34.796+00	2026-04-02 18:05:04.032+00	17	116	2	Ελλάδα	\N
585	508	Μαρινάκη	Μαρία	Χρήστος	6.53	2043-08-27	2043-06-10	2025	1100260	2007-01-01	F	3	8	2	Θεσσαλονίκη	2026-03-27 17:20:35.234+00	2026-04-02 18:05:04.177+00	17	116	2	Ελλάδα	\N
586	509	Παπανικολάου	Κωνσταντίνος	Αθανάσιος	8.69	2035-12-09	2035-10-22	2022	1100261	2004-01-01	M	3	8	2	Θεσσαλονίκη	2026-03-27 17:20:35.671+00	2026-04-02 18:05:04.322+00	17	116	2	Ελλάδα	\N
587	510	Θεοδωρίδης	Βασιλική	Ευάγγελος	6.21	2013-12-09	2013-10-22	2006	1100262	1988-01-01	F	5	17	2	Θεσσαλονίκη	2026-03-27 17:20:36.108+00	2026-04-02 18:05:04.468+00	17	116	2	Ελλάδα	\N
588	511	Αρβανιτάκη	Χρήστος	Αθανάσιος	8.24	2026-08-17	2026-09-26	2020	1100263	2002-01-01	M	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:36.546+00	2026-04-02 18:05:04.613+00	17	116	2	Ελλάδα	\N
589	512	Μαρινάκη	Νεκτάριος	Ιωάννης	6.72	2028-12-05	2028-06-21	2019	1100264	2001-01-01	M	2	4	2	Θεσσαλονίκη	2026-03-27 17:20:36.983+00	2026-04-02 18:05:04.758+00	17	116	2	Ελλάδα	\N
590	513	Πετράκη	Δέσποινα	Γεώργιος	8.15	2023-08-22	2023-01-10	2015	1100265	1997-01-01	F	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:37.421+00	2026-04-02 18:05:04.904+00	17	116	2	Ελλάδα	\N
609	532	Καραβίας	Βασιλική	Ανδρέας	9.64	2024-03-30	2024-09-05	2015	1100284	1997-01-01	F	2	4	13	Ηράκλειο	2026-03-27 17:20:45.727+00	2026-04-02 18:05:07.672+00	50	116	13	Ελλάδα	\N
909	2122	Θεοδώρου	Αικατερίνη	Απόστολος	6.84	2002-12-03	2002-06-24	1990	1200091	1971-01-01	F	4	14	12	Θήρα	2026-04-02 18:38:34.867+00	2026-04-02 18:38:34.867+00	88	116	12	Ελλάδα	\N
907	2120	Χριστοδούλου	Σωτήρης	Νικόλαος	9.06	1991-04-08	1991-08-14	1981	1200089	1958-01-01	M	4	14	4	Αλεξανδρούπολη	2026-04-02 18:38:34.581+00	2026-04-02 18:38:34.581+00	14	116	4	Ελλάδα	\N
591	514	Σπυρόπουλος	Μιχάλης	Ανδρέας	6.53	2039-09-04	2039-05-19	2025	1100266	2007-01-01	M	3	10	13	Ηράκλειο	2026-03-27 17:20:37.858+00	2026-04-02 18:05:05.049+00	50	116	13	Ελλάδα	\N
592	515	Μακρόπουλος	Ελένη	Ανδρέας	8.43	2026-03-25	2026-04-05	2012	1100267	1994-01-01	F	6	21	13	Ηράκλειο	2026-03-27 17:20:38.296+00	2026-04-02 18:05:05.194+00	50	116	13	Ελλάδα	\N
593	516	Κυριακίδης	Μυρτώ	Δημήτριος	7.20	2017-01-09	2017-11-10	2010	1100268	1992-01-01	F	6	22	13	Ηράκλειο	2026-03-27 17:20:38.732+00	2026-04-02 18:05:05.34+00	50	116	13	Ελλάδα	\N
594	517	Θεοδωρίδης	Γιώργος	Δημήτριος	6.72	2029-08-23	2029-02-10	2020	1100269	2002-01-01	M	2	3	13	Ηράκλειο	2026-03-27 17:20:39.17+00	2026-04-02 18:05:05.486+00	50	116	13	Ελλάδα	\N
595	518	Δούκα	Θανάσης	Ανδρέας	7.32	2030-03-30	2030-09-05	2021	1100270	2003-01-01	M	2	4	13	Ηράκλειο	2026-03-27 17:20:39.609+00	2026-04-02 18:05:05.631+00	50	116	13	Ελλάδα	\N
596	519	Τσιώλης	Νεφέλη	Γεώργιος	7.43	2024-03-23	2024-02-05	2017	1100271	1999-01-01	F	2	13	13	Ηράκλειο	2026-03-27 17:20:40.046+00	2026-04-02 18:05:05.776+00	50	116	13	Ελλάδα	\N
598	521	Κοκκίνου	Νεφέλη	Ιωάννης	7.72	2022-08-28	2022-07-10	2010	1100273	1992-01-01	F	6	22	13	Ηράκλειο	2026-03-27 17:20:40.92+00	2026-04-02 18:05:06.067+00	50	116	13	Ελλάδα	\N
599	522	Δεληγιάννης	Αλεξάνδρα	Χρήστος	7.23	2042-08-21	2042-09-30	2023	1100274	2005-01-01	F	3	11	13	Ηράκλειο	2026-03-27 17:20:41.358+00	2026-04-02 18:05:06.218+00	50	116	13	Ελλάδα	\N
600	523	Χαρίτου	Στέφανος	Γεώργιος	8.41	2040-03-09	2040-10-13	2026	1100275	2008-01-01	M	3	12	13	Ηράκλειο	2026-03-27 17:20:41.795+00	2026-04-02 18:05:06.363+00	50	116	13	Ελλάδα	\N
601	524	Χαρίτου	Στέφανος	Γεώργιος	7.41	2032-06-11	2032-12-16	2026	1100276	2008-01-01	M	3	10	13	Ηράκλειο	2026-03-27 17:20:42.231+00	2026-04-02 18:05:06.508+00	50	116	13	Ελλάδα	\N
602	525	Μανώλη	Άννα	Μιχαήλ	7.93	2033-01-04	2033-11-05	2023	1100277	2005-01-01	F	3	7	13	Ηράκλειο	2026-03-27 17:20:42.667+00	2026-04-02 18:05:06.654+00	50	116	13	Ελλάδα	\N
604	527	Μαυρομάτης	Ελένη	Γεώργιος	7.05	2023-02-05	2023-11-06	2014	1100279	1996-01-01	F	2	3	13	Ηράκλειο	2026-03-27 17:20:43.542+00	2026-04-02 18:05:06.944+00	50	116	13	Ελλάδα	\N
605	528	Ιωάννου	Μαρία	Δημήτριος	8.75	2019-10-04	2019-05-20	2009	1100280	1991-01-01	F	6	20	13	Ηράκλειο	2026-03-27 17:20:43.979+00	2026-04-02 18:05:07.09+00	50	116	13	Ελλάδα	\N
606	529	Λαμπροπούλου	Ζωή	Ιωάννης	8.70	2034-12-06	2034-07-22	2022	1100281	2004-01-01	F	3	12	13	Ηράκλειο	2026-03-27 17:20:44.417+00	2026-04-02 18:05:07.235+00	50	116	13	Ελλάδα	\N
607	530	Καραλής	Αντώνης	Ευάγγελος	8.05	2025-09-14	2025-10-24	2014	1100282	1996-01-01	M	2	13	13	Ηράκλειο	2026-03-27 17:20:44.854+00	2026-04-02 18:05:07.38+00	50	116	13	Ελλάδα	\N
608	531	Κοκκίνου	Νεφέλη	Ιωάννης	6.59	1999-08-21	1999-09-30	1992	1100283	1974-01-01	F	4	14	13	Ηράκλειο	2026-03-27 17:20:45.29+00	2026-04-02 18:05:07.526+00	50	116	13	Ελλάδα	\N
611	534	Χατζηδάκη	Νίκη	Ευάγγελος	8.16	2019-11-05	2019-06-20	2014	1100286	1996-01-01	F	6	21	13	Ηράκλειο	2026-03-27 17:20:46.6+00	2026-04-02 18:05:07.969+00	50	116	13	Ελλάδα	\N
612	535	Αποστολίδης	Μυρτώ	Ιωάννης	5.60	2023-08-23	2023-02-10	2011	1100287	1993-01-01	F	6	20	13	Ηράκλειο	2026-03-27 17:20:47.04+00	2026-04-02 18:05:08.114+00	50	116	13	Ελλάδα	\N
613	536	Αγγελίδης	Ιάσονας	Παναγιώτης	9.72	2016-10-09	2016-10-20	1999	1100288	1981-01-01	M	5	18	13	Ηράκλειο	2026-03-27 17:20:47.483+00	2026-04-02 18:05:08.259+00	50	116	13	Ελλάδα	\N
614	537	Παπακωνσταντίνου	Σοφία	Νικόλαος	7.32	2027-02-04	2027-12-05	2021	1100289	2003-01-01	F	2	4	13	Ηράκλειο	2026-03-27 17:20:47.923+00	2026-04-02 18:05:08.404+00	50	116	13	Ελλάδα	\N
616	539	Αναστασίου	Αναστασία	Νικόλαος	7.93	2027-01-20	2027-01-03	2017	1100291	1999-01-01	F	2	4	13	Ηράκλειο	2026-03-27 17:20:48.797+00	2026-04-02 18:05:08.695+00	50	116	13	Ελλάδα	\N
617	540	Καραγιάννης	Θοδωρής	Χρήστος	5.95	2031-04-03	2031-04-13	2024	1100292	2006-01-01	M	3	8	13	Ηράκλειο	2026-03-27 17:20:49.234+00	2026-04-02 18:05:08.84+00	50	116	13	Ελλάδα	\N
618	541	Μακρόπουλος	Ελένη	Ανδρέας	6.18	2033-02-09	2033-12-10	2024	1100293	2006-01-01	F	3	8	13	Ηράκλειο	2026-03-27 17:20:49.677+00	2026-04-02 18:05:08.986+00	50	116	13	Ελλάδα	\N
619	542	Μακρή	Μελίνα	Ηλίας	6.06	2020-05-19	2020-06-28	2014	1100294	1996-01-01	F	2	13	13	Ηράκλειο	2026-03-27 17:20:50.113+00	2026-04-02 18:05:09.131+00	50	116	13	Ελλάδα	\N
620	543	Χατζηδάκη	Νίκη	Ευάγγελος	7.03	2032-11-05	2032-06-20	2025	1100295	2007-01-01	F	3	10	13	Ηράκλειο	2026-03-27 17:20:50.55+00	2026-04-02 18:05:09.277+00	50	116	13	Ελλάδα	\N
621	544	Ράπτη	Αθηνά	Ανδρέας	6.22	2021-03-16	2021-04-25	2015	1100296	1997-01-01	F	2	3	13	Ηράκλειο	2026-03-27 17:20:50.988+00	2026-04-02 18:05:09.422+00	50	116	13	Ελλάδα	\N
622	545	Κοκκίνου	Νεφέλη	Ιωάννης	8.18	2027-08-19	2027-09-28	2011	1100297	1993-01-01	F	6	20	13	Ηράκλειο	2026-03-27 17:20:51.425+00	2026-04-02 18:05:09.567+00	50	116	13	Ελλάδα	\N
623	546	Καραλής	Αντώνης	Ευάγγελος	8.50	2024-05-04	2024-05-15	2016	1100298	1998-01-01	M	2	13	13	Ηράκλειο	2026-03-27 17:20:51.861+00	2026-04-02 18:05:09.713+00	50	116	13	Ελλάδα	\N
624	547	Αργυρίου	Χρήστος	Δημήτριος	6.96	2034-08-31	2034-10-10	2019	1100299	2001-01-01	M	2	3	13	Ηράκλειο	2026-03-27 17:20:52.298+00	2026-04-02 18:05:09.858+00	50	116	13	Ελλάδα	\N
625	548	Αρβανιτάκη	Χρήστος	Αθανάσιος	5.85	2018-03-09	2018-10-13	2011	1100300	1993-01-01	M	6	20	13	Ηράκλειο	2026-03-27 17:20:52.736+00	2026-04-02 18:05:10.003+00	50	116	13	Ελλάδα	\N
626	549	Αποστολίδης	Μάριος	Ιωάννης	9.48	2010-03-31	2010-10-05	2002	1100301	1984-01-01	M	5	17	13	Ηράκλειο	2026-03-27 17:20:53.172+00	2026-04-02 18:05:10.149+00	50	116	13	Ελλάδα	\N
627	550	Ζαφειρίου	Δέσποινα	Γεώργιος	6.38	2033-03-24	2033-03-05	2026	1100302	2008-01-01	F	3	8	13	Ηράκλειο	2026-03-27 17:20:53.608+00	2026-04-02 18:05:10.294+00	50	116	13	Ελλάδα	\N
628	551	Μαυρομάτης	Ελένη	Γεώργιος	9.56	2034-10-04	2034-05-20	2025	1100303	2007-01-01	F	3	11	13	Ηράκλειο	2026-03-27 17:20:54.045+00	2026-04-02 18:05:10.44+00	50	116	13	Ελλάδα	\N
629	552	Ιωάννου	Μαρία	Δημήτριος	6.03	2035-01-09	2035-11-10	2023	1100304	2005-01-01	F	3	11	13	Ηράκλειο	2026-03-27 17:20:54.482+00	2026-04-02 18:05:10.586+00	50	116	13	Ελλάδα	\N
630	553	Νικολάου	Αλέξανδρος	Σταύρος	7.35	2030-08-27	2030-06-10	2022	1100305	2004-01-01	M	3	7	13	Ηράκλειο	2026-03-27 17:20:54.919+00	2026-04-02 18:05:10.731+00	50	116	13	Ελλάδα	\N
632	555	Νικολάου	Ανδρέας	Παναγιώτης	7.72	2014-03-04	2014-05-13	2007	1100307	1989-01-01	M	5	18	13	Ηράκλειο	2026-03-27 17:20:55.791+00	2026-04-02 18:05:11.037+00	50	116	13	Ελλάδα	\N
633	556	Φωτιάδης	Αχιλλέας	Στυλιανός	8.94	2012-05-23	2012-02-07	2002	1100308	1984-01-01	M	5	17	5	Ιωάννινα	2026-03-27 17:20:56.229+00	2026-04-02 18:05:11.182+00	23	116	5	Ελλάδα	\N
656	579	Ράπτης	Σπύρος	Ανδρέας	8.77	2015-05-04	2015-05-15	2010	1100331	1992-01-01	M	6	20	5	Ιωάννινα	2026-03-27 17:21:06.278+00	2026-04-02 18:05:14.529+00	23	116	5	Ελλάδα	\N
635	558	Κωνσταντίνου	Σοφία	Χρήστος	8.72	2020-03-03	2020-12-04	2012	1100310	1994-01-01	F	6	20	5	Ιωάννινα	2026-03-27 17:20:57.103+00	2026-04-02 18:05:11.472+00	23	116	5	Ελλάδα	\N
636	559	Μαθιός	Ιάσονας	Παναγιώτης	7.78	1998-04-04	1998-05-14	1983	1100311	1965-01-01	M	4	14	5	Ιωάννινα	2026-03-27 17:20:57.54+00	2026-04-02 18:05:11.618+00	23	116	5	Ελλάδα	\N
637	560	Παπαδόπουλος	Μελίνα	Νικόλαος	7.26	2019-08-27	2019-06-10	2012	1100312	1994-01-01	F	6	22	5	Ιωάννινα	2026-03-27 17:20:57.977+00	2026-04-02 18:05:11.763+00	23	116	5	Ελλάδα	\N
638	561	Δημητρίου	Περικλής	Σωτήριος	7.28	2014-04-13	2014-05-23	2008	1100313	1990-01-01	M	5	19	5	Ιωάννινα	2026-03-27 17:20:58.414+00	2026-04-02 18:05:11.909+00	23	116	5	Ελλάδα	\N
639	562	Αρβανιτάκη	Χρήστος	Αθανάσιος	8.29	2038-03-28	2038-07-05	2023	1100314	2005-01-01	M	3	7	5	Ιωάννινα	2026-03-27 17:20:58.851+00	2026-04-02 18:05:12.054+00	23	116	5	Ελλάδα	\N
640	563	Χατζηδάκη	Νίκη	Ευάγγελος	8.29	2026-11-05	2026-06-20	2021	1100315	2003-01-01	F	2	3	5	Ιωάννινα	2026-03-27 17:20:59.288+00	2026-04-02 18:05:12.199+00	23	116	5	Ελλάδα	\N
641	564	Αργυρίου	Κυριάκος	Διονύσιος	9.29	2028-06-16	2028-07-26	2022	1100316	2004-01-01	M	3	9	5	Ιωάννινα	2026-03-27 17:20:59.725+00	2026-04-02 18:05:12.345+00	23	116	5	Ελλάδα	\N
642	565	Αναστασίου	Μιχάλης	Αθανάσιος	7.39	2028-08-02	2028-03-19	2018	1100317	2000-01-01	M	2	13	5	Ιωάννινα	2026-03-27 17:21:00.162+00	2026-04-02 18:05:12.491+00	23	116	5	Ελλάδα	\N
643	566	Χατζηδάκης	Μανώλης	Ευάγγελος	7.97	1992-07-05	1992-06-16	1986	1100318	1968-01-01	M	4	14	5	Ιωάννινα	2026-03-27 17:21:00.599+00	2026-04-02 18:05:12.636+00	23	116	5	Ελλάδα	\N
644	567	Αλεξίου	Ελένη	Σπυρίδων	8.40	2031-03-30	2031-09-05	2023	1100319	2005-01-01	F	3	11	5	Ιωάννινα	2026-03-27 17:21:01.036+00	2026-04-02 18:05:12.781+00	23	116	5	Ελλάδα	\N
645	568	Αναστασίου	Μιχάλης	Αθανάσιος	7.46	2026-08-02	2026-03-20	2017	1100320	1999-01-01	M	2	13	5	Ιωάννινα	2026-03-27 17:21:01.473+00	2026-04-02 18:05:12.926+00	23	116	5	Ελλάδα	\N
646	569	Φωτιάδης	Αχιλλέας	Στυλιανός	7.56	2029-05-23	2029-02-07	2022	1100321	2004-01-01	M	3	12	5	Ιωάννινα	2026-03-27 17:21:01.909+00	2026-04-02 18:05:13.072+00	23	116	5	Ελλάδα	\N
647	570	Αγγελίδης	Χριστίνα	Στέφανος	8.24	2020-09-15	2020-10-25	2013	1100322	1995-01-01	F	6	22	5	Ιωάννινα	2026-03-27 17:21:02.346+00	2026-04-02 18:05:13.217+00	23	116	5	Ελλάδα	\N
648	571	Κωστοπούλου	Βασιλική	Γεώργιος	7.21	2033-07-09	2033-10-17	2014	1100323	1996-01-01	F	2	3	5	Ιωάννινα	2026-03-27 17:21:02.785+00	2026-04-02 18:05:13.362+00	23	116	5	Ελλάδα	\N
649	572	Μαρινάκη	Νεκτάριος	Ιωάννης	7.25	2021-03-27	2021-06-05	2013	1100324	1995-01-01	M	6	21	5	Ιωάννινα	2026-03-27 17:21:03.221+00	2026-04-02 18:05:13.508+00	23	116	5	Ελλάδα	\N
651	574	Δημοπούλου	Δημήτρης	Παναγιώτης	6.49	2022-06-03	2022-04-15	2016	1100326	1998-01-01	M	2	13	5	Ιωάννινα	2026-03-27 17:21:04.095+00	2026-04-02 18:05:13.801+00	23	116	5	Ελλάδα	\N
653	576	Καραγιάννης	Νεκτάριος	Στέφανος	6.83	1993-04-09	1993-10-14	1987	1100328	1969-01-01	M	4	14	5	Ιωάννινα	2026-03-27 17:21:04.968+00	2026-04-02 18:05:14.092+00	23	116	5	Ελλάδα	\N
654	577	Μαθιός	Ολυμπία	Παναγιώτης	5.54	2014-03-22	2014-01-05	2009	1100329	1991-01-01	F	6	21	5	Ιωάννινα	2026-03-27 17:21:05.404+00	2026-04-02 18:05:14.238+00	23	116	5	Ελλάδα	\N
655	578	Παπαγεωργίου	Κατερίνα	Δημήτριος	7.71	2023-07-09	2023-10-17	2017	1100330	1999-01-01	F	2	4	5	Ιωάννινα	2026-03-27 17:21:05.841+00	2026-04-02 18:05:14.383+00	23	116	5	Ελλάδα	\N
657	580	Θεοδώρου	Βαγγέλης	Αλέξανδρος	7.30	2030-02-07	2030-11-08	2023	1100332	2005-01-01	M	3	7	5	Ιωάννινα	2026-03-27 17:21:06.717+00	2026-04-02 18:05:14.675+00	23	116	5	Ελλάδα	\N
659	582	Μαυρομάτης	Ελένη	Γεώργιος	6.86	2024-08-24	2024-03-10	2018	1100334	2000-01-01	F	2	4	5	Ιωάννινα	2026-03-27 17:21:07.597+00	2026-04-02 18:05:14.966+00	23	116	5	Ελλάδα	\N
660	583	Μπίρμπας	Παναγιώτης	Θεόδωρος	6.37	2040-08-29	2040-08-10	2024	1100335	2006-01-01	M	3	7	5	Ιωάννινα	2026-03-27 17:21:08.034+00	2026-04-02 18:05:15.111+00	23	116	5	Ελλάδα	\N
661	584	Θεοδώρου	Βαγγέλης	Αλέξανδρος	7.85	2010-02-07	2010-11-08	1998	1100336	1980-01-01	M	5	17	6	Λάρισα	2026-03-27 17:21:08.469+00	2026-04-02 18:05:15.257+00	26	116	6	Ελλάδα	\N
662	585	Μαρινάκη	Μαρία	Χρήστος	8.09	2013-09-15	2013-10-25	2003	1100337	1985-01-01	F	5	17	6	Λάρισα	2026-03-27 17:21:08.906+00	2026-04-02 18:05:15.402+00	26	116	6	Ελλάδα	\N
663	586	Μακρόπουλος	Χριστίνα	Δημήτριος	6.49	2035-06-29	2035-08-08	2024	1100338	2006-01-01	F	3	10	6	Λάρισα	2026-03-27 17:21:09.343+00	2026-04-02 18:05:15.547+00	26	116	6	Ελλάδα	\N
664	587	Αργυρίου	Κυριάκος	Διονύσιος	8.45	2027-01-15	2027-02-24	2022	1100339	2004-01-01	M	3	11	6	Λάρισα	2026-03-27 17:21:09.78+00	2026-04-02 18:05:15.692+00	26	116	6	Ελλάδα	\N
665	588	Χατζηδάκης	Μανώλης	Ευάγγελος	8.70	2025-07-05	2025-06-16	2017	1100340	1999-01-01	M	2	4	6	Λάρισα	2026-03-27 17:21:10.216+00	2026-04-02 18:05:15.838+00	26	116	6	Ελλάδα	\N
666	589	Πολίτης	Παναγιώτης	Απόστολος	7.69	2021-05-31	2021-10-07	2011	1100341	1993-01-01	M	6	20	6	Λάρισα	2026-03-27 17:21:10.653+00	2026-04-02 18:05:15.983+00	26	116	6	Ελλάδα	\N
667	590	Δημητρίου	Κωνσταντίνος	Ιωάννης	7.91	2027-12-03	2027-04-21	2018	1100342	2000-01-01	M	2	13	6	Λάρισα	2026-03-27 17:21:11.089+00	2026-04-02 18:05:16.128+00	26	116	6	Ελλάδα	\N
668	591	Δούκα	Θανάσης	Ανδρέας	7.77	2019-06-09	2019-10-16	2014	1100343	1996-01-01	M	2	13	6	Λάρισα	2026-03-27 17:21:11.526+00	2026-04-02 18:05:16.273+00	26	116	6	Ελλάδα	\N
670	593	Περικλής	Αγγελική	Αθανάσιος	7.07	2036-06-04	2036-05-16	2025	1100345	2007-01-01	F	3	10	6	Λάρισα	2026-03-27 17:21:12.399+00	2026-04-02 18:05:16.564+00	26	116	6	Ελλάδα	\N
671	594	Κεχαγιά	Αλεξάνδρα	Χαράλαμπος	5.69	2031-07-22	2031-08-31	2024	1100346	2006-01-01	F	3	11	6	Λάρισα	2026-03-27 17:21:12.836+00	2026-04-02 18:05:16.709+00	26	116	6	Ελλάδα	\N
672	595	Γρηγορίου	Ιωάννα	Χρήστος	7.37	2036-05-14	2036-06-23	2023	1100347	2005-01-01	F	3	8	6	Λάρισα	2026-03-27 17:21:13.273+00	2026-04-02 18:05:16.855+00	26	116	6	Ελλάδα	\N
673	596	Κεχαγιά	Αλεξάνδρα	Χαράλαμπος	7.45	2032-07-22	2032-08-31	2024	1100348	2006-01-01	F	3	10	6	Λάρισα	2026-03-27 17:21:13.71+00	2026-04-02 18:05:17+00	26	116	6	Ελλάδα	\N
674	597	Μαθιός	Μυρτώ	Χρήστος	8.27	2039-09-13	2039-10-23	2024	1100349	2006-01-01	F	3	7	6	Λάρισα	2026-03-27 17:21:14.147+00	2026-04-02 18:05:17.146+00	26	116	6	Ελλάδα	\N
675	598	Μαθιός	Ιάσονας	Παναγιώτης	7.35	2011-04-16	2011-05-26	1999	1100350	1981-01-01	M	5	17	6	Λάρισα	2026-03-27 17:21:14.583+00	2026-04-02 18:05:17.291+00	26	116	6	Ελλάδα	\N
676	599	Καραγιάννης	Νεκτάριος	Στέφανος	5.98	2026-10-04	2026-05-20	2018	1100351	2000-01-01	M	2	13	6	Λάρισα	2026-03-27 17:21:15.019+00	2026-04-02 18:05:17.437+00	26	116	6	Ελλάδα	\N
677	600	Κωνσταντίνου	Σοφία	Χρήστος	7.72	2029-03-29	2029-08-05	2023	1100352	2005-01-01	F	3	7	6	Λάρισα	2026-03-27 17:21:15.459+00	2026-04-02 18:05:17.582+00	26	116	6	Ελλάδα	\N
678	601	Ζαφειρίου	Δέσποινα	Γεώργιος	6.62	2008-03-24	2008-03-05	1999	1100353	1981-01-01	F	5	17	6	Λάρισα	2026-03-27 17:21:15.896+00	2026-04-02 18:05:17.728+00	26	116	6	Ελλάδα	\N
704	627	Πετράκη	Δέσποινα	Γεώργιος	7.83	2036-06-09	2036-10-16	2021	1100379	2003-01-01	F	2	4	1	Πειραιάς	2026-03-27 17:21:27.264+00	2026-04-02 18:05:21.527+00	39	116	1	Ελλάδα	\N
912	2125	Σταματίου	Αλεξάνδρα	Χρήστος	7.98	1990-07-25	1990-12-11	1983	1200094	1961-01-01	F	4	16	3	Σιάτιστα	2026-04-02 18:38:35.296+00	2026-04-02 18:38:35.296+00	61	116	3	Ελλάδα	\N
680	603	Φωτιάδου	Γεωργία	Στυλιανός	9.07	1997-05-27	1997-06-07	1987	1100355	1969-01-01	F	4	14	6	Λάρισα	2026-03-27 17:21:16.769+00	2026-04-02 18:05:18.019+00	26	116	6	Ελλάδα	\N
681	604	Σπυρόπουλος	Μιχάλης	Ανδρέας	7.34	2021-09-15	2021-10-25	2014	1100356	1996-01-01	M	6	22	6	Λάρισα	2026-03-27 17:21:17.207+00	2026-04-02 18:05:18.164+00	26	116	6	Ελλάδα	\N
682	605	Καρβούνης	Δημήτρης	Νικόλαος	6.95	2028-09-04	2028-05-19	2019	1100357	2001-01-01	M	2	3	6	Λάρισα	2026-03-27 17:21:17.645+00	2026-04-02 18:05:18.312+00	26	116	6	Ελλάδα	\N
683	606	Γεωργιάδης	Νικόλαος	Γεώργιος	7.85	2037-08-28	2037-07-10	2024	1100358	2006-01-01	M	3	12	6	Βόλος	2026-03-27 17:21:18.082+00	2026-04-02 18:05:18.458+00	27	116	6	Ελλάδα	\N
684	607	Αλεξίου	Ελένη	Σπύρος	6.40	2025-03-04	2025-05-13	2019	1100359	2001-01-01	F	2	13	6	Βόλος	2026-03-27 17:21:18.52+00	2026-04-02 18:05:18.608+00	27	116	6	Ελλάδα	\N
685	608	Βασιλείου	Γιώργος	Νικόλαος	6.23	2020-02-24	2020-04-04	2015	1100360	1997-01-01	M	2	4	6	Βόλος	2026-03-27 17:21:18.956+00	2026-04-02 18:05:18.753+00	27	116	6	Ελλάδα	\N
686	609	Αργυρίου	Χριστίνα	Ανδρέας	7.83	2026-03-27	2026-06-05	2013	1100361	1995-01-01	F	6	21	6	Βόλος	2026-03-27 17:21:19.393+00	2026-04-02 18:05:18.898+00	27	116	6	Ελλάδα	\N
687	610	Περικλής	Αγγελική	Αθανάσιος	7.05	2015-07-09	2015-10-17	2009	1100362	1991-01-01	F	5	17	6	Βόλος	2026-03-27 17:21:19.829+00	2026-04-02 18:05:19.044+00	27	116	6	Ελλάδα	\N
688	611	Ιωάννου	Μαρία	Δημήτριος	7.52	2025-05-09	2025-10-15	2018	1100363	2000-01-01	F	2	13	6	Βόλος	2026-03-27 17:21:20.266+00	2026-04-02 18:05:19.19+00	27	116	6	Ελλάδα	\N
689	612	Καραλή	Ελπίδα	Μιχαήλ	9.58	2032-06-28	2032-07-08	2025	1100364	2007-01-01	F	3	8	6	Βόλος	2026-03-27 17:21:20.703+00	2026-04-02 18:05:19.338+00	27	116	6	Ελλάδα	\N
690	613	Δημητρίου	Κωνσταντίνος	Γεώργιος	6.33	2022-09-14	2022-10-24	2014	1100365	1996-01-01	M	6	22	6	Βόλος	2026-03-27 17:21:21.14+00	2026-04-02 18:05:19.484+00	27	116	6	Ελλάδα	\N
691	614	Οικονόμου	Αναστασία	Νικόλαος	9.66	2016-07-26	2016-04-09	2009	1100366	1991-01-01	F	6	20	6	Βόλος	2026-03-27 17:21:21.577+00	2026-04-02 18:05:19.629+00	27	116	6	Ελλάδα	\N
692	615	Δημητρίου	Περικλής	Σωτήριος	6.76	2008-04-13	2008-05-23	2003	1100367	1985-01-01	M	5	18	6	Βόλος	2026-03-27 17:21:22.014+00	2026-04-02 18:05:19.776+00	27	116	6	Ελλάδα	\N
693	616	Παναγιωτίδου	Νεφέλη	Ιωάννης	8.32	2036-01-09	2036-11-10	2019	1100368	2001-01-01	F	2	4	6	Βόλος	2026-03-27 17:21:22.451+00	2026-04-02 18:05:19.921+00	27	116	6	Ελλάδα	\N
694	617	Σαμαρά	Δανάη	Χρήστος	7.87	2015-08-28	2015-07-10	2008	1100369	1990-01-01	F	5	17	6	Βόλος	2026-03-27 17:21:22.888+00	2026-04-02 18:05:20.067+00	27	116	6	Ελλάδα	\N
695	618	Νικολάου	Σοφία	Νικόλαος	7.69	2034-03-24	2034-03-05	2024	1100370	2006-01-01	F	3	12	6	Βόλος	2026-03-27 17:21:23.325+00	2026-04-02 18:05:20.213+00	27	116	6	Ελλάδα	\N
697	620	Σπυροπούλου	Παρασκευή	Νικόλαος	7.80	2033-03-05	2033-12-06	2025	1100372	2007-01-01	F	3	12	6	Βόλος	2026-03-27 17:21:24.199+00	2026-04-02 18:05:20.504+00	27	116	6	Ελλάδα	\N
698	621	Αποστολίδης	Μαρία	Χρήστος	7.46	2026-08-30	2026-09-10	2015	1100373	1997-01-01	F	2	3	6	Βόλος	2026-03-27 17:21:24.638+00	2026-04-02 18:05:20.65+00	27	116	6	Ελλάδα	\N
699	622	Χατζηδάκη	Νίκη	Ευάγγελος	7.21	2028-11-07	2028-08-20	2023	1100374	2005-01-01	F	3	10	6	Βόλος	2026-03-27 17:21:25.077+00	2026-04-02 18:05:20.795+00	27	116	6	Ελλάδα	\N
700	623	Τσουκαλάς	Αντώνης	Αθανάσιος	8.96	2037-03-23	2037-02-05	2023	1100375	2005-01-01	M	3	10	6	Βόλος	2026-03-27 17:21:25.515+00	2026-04-02 18:05:20.946+00	27	116	6	Ελλάδα	\N
701	624	Μουστάκας	Μιχάλης	Ευάγγελος	7.56	2035-09-14	2035-10-24	2026	1100376	2008-01-01	M	3	7	1	Πειραιάς	2026-03-27 17:21:25.951+00	2026-04-02 18:05:21.092+00	39	116	1	Ελλάδα	\N
703	626	Κωστοπούλου	Βασιλική	Γεώργιος	8.70	2039-03-09	2039-10-13	2021	1100378	2003-01-01	F	2	13	1	Πειραιάς	2026-03-27 17:21:26.825+00	2026-04-02 18:05:21.382+00	39	116	1	Ελλάδα	\N
705	628	Κυριακίδης	Μυρτώ	Δημήτριος	8.65	2029-08-19	2029-09-28	2016	1100380	1998-01-01	F	2	4	1	Πειραιάς	2026-03-27 17:21:27.704+00	2026-04-02 18:05:21.673+00	39	116	1	Ελλάδα	\N
706	629	Αθανασίου	Παναγιώτης	Ιωάννης	8.72	2016-05-14	2016-06-23	2011	1100381	1993-01-01	M	6	20	1	Πειραιάς	2026-03-27 17:21:28.14+00	2026-04-02 18:05:21.818+00	39	116	1	Ελλάδα	\N
707	630	Καραμήτρου	Βασιλική	Στέφανος	7.59	2022-01-04	2022-11-05	2009	1100382	1991-01-01	F	6	21	1	Πειραιάς	2026-03-27 17:21:28.577+00	2026-04-02 18:05:21.963+00	39	116	1	Ελλάδα	\N
708	631	Βασιλείου	Νίκος	Ευάγγελος	5.82	2019-08-21	2019-09-30	2013	1100383	1995-01-01	M	6	22	8	Αγρίνιο	2026-03-27 17:21:29.016+00	2026-04-02 18:05:22.108+00	33	116	8	Ελλάδα	\N
709	632	Δημοπούλου	Αναστασία	Στέφανος	8.11	2016-08-19	2016-09-28	2003	1100384	1985-01-01	F	5	19	8	Αγρίνιο	2026-03-27 17:21:29.454+00	2026-04-02 18:05:22.253+00	33	116	8	Ελλάδα	\N
710	633	Μακρόπουλος	Χριστίνα	Δημήτριος	9.28	2031-09-14	2031-10-24	2019	1100385	2001-01-01	F	2	3	8	Αγρίνιο	2026-03-27 17:21:29.89+00	2026-04-02 18:05:22.398+00	33	116	8	Ελλάδα	\N
712	635	Καραβίας	Βασιλική	Ανδρέας	8.02	2030-03-05	2030-12-06	2024	1100387	2006-01-01	F	3	10	8	Αγρίνιο	2026-03-27 17:21:30.766+00	2026-04-02 18:05:22.689+00	33	116	8	Ελλάδα	\N
713	636	Δημοπούλου	Δημήτρης	Παναγιώτης	7.81	2029-08-28	2029-07-10	2015	1100388	1997-01-01	M	2	13	8	Αγρίνιο	2026-03-27 17:21:31.204+00	2026-04-02 18:05:22.835+00	33	116	8	Ελλάδα	\N
714	637	Μακρής	Οδυσσέας	Ηλίας	7.64	2033-05-15	2033-06-24	2026	1100389	2008-01-01	M	3	11	2	Σέρρες	2026-03-27 17:21:31.642+00	2026-04-02 18:05:22.98+00	18	116	2	Ελλάδα	\N
715	638	Αγγελίδης	Χριστίνα	Στέφανος	7.55	2029-06-12	2030-01-15	2022	1100390	2004-01-01	F	3	8	2	Σέρρες	2026-03-27 17:21:32.079+00	2026-04-02 18:05:23.129+00	18	116	2	Ελλάδα	\N
716	639	Καραγιάννης	Πέτρος	Νικόλαος	8.83	2003-03-28	2003-07-05	1992	1100391	1974-01-01	M	4	16	2	Σέρρες	2026-03-27 17:21:32.514+00	2026-04-02 18:05:23.274+00	18	116	2	Ελλάδα	\N
717	640	Παναγιωτίδου	Νεφέλη	Ιωάννης	8.19	1993-08-25	1993-04-10	1980	1100392	1962-01-01	F	4	16	2	Σέρρες	2026-03-27 17:21:32.951+00	2026-04-02 18:05:23.42+00	18	116	2	Ελλάδα	\N
718	641	Τσιώλης	Κωνσταντίνος	Δημήτριος	7.45	2026-09-09	2026-10-19	2019	1100393	2001-01-01	M	2	13	2	Σέρρες	2026-03-27 17:21:33.388+00	2026-04-02 18:05:23.565+00	18	116	2	Ελλάδα	\N
719	642	Παπανικολάου	Κωνσταντίνος	Αθανάσιος	7.54	1994-08-29	1994-08-10	1981	1100394	1963-01-01	M	4	14	2	Σέρρες	2026-03-27 17:21:33.825+00	2026-04-02 18:05:23.71+00	18	116	2	Ελλάδα	\N
720	643	Νικολάου	Ανδρέας	Παναγιώτης	6.37	2038-10-04	2038-05-20	2024	1100395	2006-01-01	M	3	8	13	Χανιά	2026-03-27 17:21:34.262+00	2026-04-02 18:05:23.856+00	51	116	13	Ελλάδα	\N
721	644	Ράπτη	Αθηνά	Ανδρέας	6.28	1998-09-04	1998-05-19	1988	1100396	1970-01-01	F	4	15	13	Χανιά	2026-03-27 17:21:34.7+00	2026-04-02 18:05:24.001+00	51	116	13	Ελλάδα	\N
722	645	Ιωαννίδης	Νικόλαος	Παναγιώτης	7.09	2032-10-04	2032-05-20	2020	1100397	2002-01-01	M	2	3	13	Χανιά	2026-03-27 17:21:35.137+00	2026-04-02 18:05:24.146+00	51	116	13	Ελλάδα	\N
913	2126	Σπυροπούλου	Βασιλική	Χαράλαμπος	6.37	2001-11-15	2001-12-17	1996	1200095	1978-01-01	F	4	16	7	Αργοστόλι	2026-04-02 18:38:35.439+00	2026-04-02 18:38:35.439+00	31	116	7	Ελλάδα	\N
283	26	Βασιλείου	Νίκος	Ευάγγελος	7.07	2033-05-04	2033-05-15	2019	1043079	2001-01-01	M	2	13	1	Αθήνα	2026-03-27 13:22:57.802+00	2026-04-02 18:04:21.292+00	38	116	1	Ελλάδα	\N
284	28	Οικονόμου	Αναστασία	Νικόλαος	7.21	2006-08-04	2006-05-18	1994	1073658	1976-01-01	F	4	14	1	Αθήνα	2026-03-27 13:22:58.09+00	2026-04-02 18:04:21.437+00	38	116	1	Ελλάδα	\N
285	30	Θεοδωρίδης	Γιώργος	Δημήτριος	8.44	2041-10-09	2041-10-20	2025	1080292	2007-01-01	M	3	10	1	Αθήνα	2026-03-27 13:22:58.379+00	2026-04-02 18:04:21.583+00	38	116	1	Ελλάδα	\N
286	32	Χαρίτου	Στέφανος	Γεώργιος	8.34	2025-08-23	2025-02-10	2015	1055958	1997-01-01	M	2	3	1	Αθήνα	2026-03-27 13:22:58.667+00	2026-04-02 18:04:21.728+00	38	116	1	Ελλάδα	\N
287	34	Σπυρόπουλος	Μαρία	Ανδρέας	6.28	2026-02-23	2026-04-04	2016	1067569	1998-01-01	F	2	4	1	Αθήνα	2026-03-27 13:22:58.955+00	2026-04-02 18:04:21.874+00	38	116	1	Ελλάδα	\N
288	36	Τσολάκης	Λευτέρης	Αθανάσιος	7.64	2000-08-26	2000-05-10	1989	1080845	1971-01-01	M	4	15	1	Αθήνα	2026-03-27 13:22:59.244+00	2026-04-02 18:04:22.019+00	38	116	1	Ελλάδα	\N
290	40	Γρηγορίου	Ιωάννα	Χρήστος	6.34	2031-06-14	2031-07-24	2023	1089239	2005-01-01	F	3	10	1	Αθήνα	2026-03-27 13:22:59.819+00	2026-04-02 18:04:22.31+00	38	116	1	Ελλάδα	\N
291	42	Μαυρομάτης	Παναγιώτης	Παναγιώτης	7.62	2001-05-05	2001-06-14	1990	1093076	1972-01-01	M	4	14	1	Αθήνα	2026-03-27 13:23:00.107+00	2026-04-02 18:04:22.456+00	38	116	1	Ελλάδα	\N
292	44	Καραμήτρου	Βασιλική	Στέφανος	5.50	2027-02-09	2027-12-10	2017	1070635	1999-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:00.396+00	2026-04-02 18:04:22.602+00	38	116	1	Ελλάδα	\N
293	46	Μουστάκας	Μιχάλης	Ευάγγελος	6.98	1985-03-09	1985-10-13	1980	1063863	1962-01-01	M	4	16	1	Αθήνα	2026-03-27 13:23:00.683+00	2026-04-02 18:04:22.747+00	38	116	1	Ελλάδα	\N
294	48	Νικολάου	Σοφία	Νικόλαος	6.86	2033-09-13	2033-10-23	2018	1094325	2000-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:00.971+00	2026-04-02 18:04:22.892+00	38	116	1	Ελλάδα	\N
723	646	Καραβίας	Βασιλική	Ανδρέας	6.42	2009-03-25	2009-04-05	2000	1100398	1982-01-01	F	5	18	13	Χανιά	2026-03-27 17:21:35.577+00	2026-04-02 18:05:24.291+00	51	116	13	Ελλάδα	\N
724	647	Σταυροπούλου	Ολυμπία	Ιωάννης	7.35	2028-08-30	2028-09-10	2020	1100399	2002-01-01	F	2	4	13	Χανιά	2026-03-27 17:21:36.014+00	2026-04-02 18:05:24.437+00	51	116	13	Ελλάδα	\N
932	2146	Βασιλείου	Μιχάλης	Αλέξανδρος	7.07	1991-12-09	1991-03-29	1981	1200115	1960-01-01	M	4	16	4	Δράμα	2026-04-02 18:38:38.153+00	2026-04-02 18:38:38.153+00	96	116	4	Ελλάδα	\N
915	2128	Παπαδοπούλου	Χριστίνα	Σπυρίδων	5.88	1999-09-24	1999-03-11	1992	1200097	1973-01-01	F	4	16	8	Αίγιο	2026-04-02 18:38:35.725+00	2026-04-02 18:38:35.725+00	74	116	8	Ελλάδα	\N
916	2129	Χατζηδάκης	Νεκτάριος	Λεωνίδας	9.61	1997-01-08	1997-09-25	1988	1200098	1964-01-01	M	4	16	4	Ξάνθη	2026-04-02 18:38:35.868+00	2026-04-02 18:38:35.868+00	15	116	4	Ελλάδα	\N
917	2130	Γαλάνη	Αγγελική	Απόστολος	9.01	2001-11-02	2000-10-11	1995	1200099	1972-01-01	F	4	15	6	Σοφάδες	2026-04-02 18:38:36.01+00	2026-04-02 18:38:36.01+00	\N	116	6	Ελλάδα	\N
918	2131	Δούκα	Αναστασία	Πέτρος	8.73	1999-08-28	1999-06-08	1993	1200100	1975-01-01	F	4	16	13	Άγιος Νικόλαος	2026-04-02 18:38:36.153+00	2026-04-02 18:38:36.153+00	\N	116	13	Ελλάδα	\N
920	2133	Σπυρόπουλος	Μιχάλης	Χρήστος	8.80	1997-09-25	1998-11-01	1991	1200102	1972-01-01	M	4	15	4	Διδυμότειχο	2026-04-02 18:38:36.439+00	2026-04-02 18:38:36.439+00	\N	116	4	Ελλάδα	\N
921	2134	Γαλάνης	Σπύρος	Μιχαήλ	7.96	2002-06-26	2002-05-17	1989	1200103	1969-01-01	M	4	14	7	Σάμη	2026-04-02 18:38:36.582+00	2026-04-02 18:38:36.582+00	\N	116	7	Ελλάδα	\N
922	2135	Γεωργίου	Στέφανος	Αλέξανδρος	7.54	1986-03-20	1986-07-22	1980	1200104	1956-01-01	M	4	14	3	Καστοριά	2026-04-02 18:38:36.725+00	2026-04-02 18:38:36.725+00	22	116	3	Ελλάδα	\N
923	2136	Πάλλης	Δημήτρης	Αλέξανδρος	5.52	1997-02-04	1997-05-22	1988	1200105	1965-01-01	M	4	14	3	Πτολεμαΐδα	2026-04-02 18:38:36.867+00	2026-04-02 18:38:36.867+00	21	116	3	Ελλάδα	\N
924	2137	Τσακίρη	Αναστασία	Θεόδωρος	5.79	2003-10-17	2004-02-26	1989	1200106	1970-01-01	F	4	14	11	Λήμνος	2026-04-02 18:38:37.01+00	2026-04-02 18:38:37.01+00	83	116	11	Ελλάδα	\N
926	2139	Ζαχαρίου	Παρασκευή	Χαράλαμπος	8.31	1991-06-21	1991-12-15	1986	1200108	1966-01-01	F	4	14	13	Χανιά	2026-04-02 18:38:37.296+00	2026-04-02 18:38:37.296+00	51	116	13	Ελλάδα	\N
927	2140	Σταματίου	Στέφανος	Λεωνίδας	8.35	1996-03-10	1997-02-03	1990	1200109	1967-01-01	M	4	16	1	Κηφισιά	2026-04-02 18:38:37.438+00	2026-04-02 18:38:37.438+00	\N	116	1	Ελλάδα	\N
928	2141	Οικονόμου	Σωτήρης	Σπυρίδων	6.48	1996-05-04	1995-11-16	1990	1200110	1971-01-01	M	4	16	9	Χαλκίδα	2026-04-02 18:38:37.582+00	2026-04-02 18:38:37.582+00	35	116	9	Ελλάδα	\N
281	22	Νικολάου	Αλέξανδρος	Παναγιώτης	8.12	2022-12-08	2022-09-21	2015	1075741	1997-01-01	M	2	3	1	Αθήνα	2026-03-27 13:22:57.226+00	2026-04-02 18:04:21.001+00	38	116	1	Ελλάδα	\N
725	648	Σαμαρά	Δανάη	Χρήστος	5.95	2030-04-04	2030-05-14	2017	1100400	1999-01-01	F	2	3	13	Χανιά	2026-03-27 17:21:36.451+00	2026-04-02 18:05:24.582+00	51	116	13	Ελλάδα	\N
726	649	Καραγιάννης	Νεκτάριος	Στέφανος	7.94	2029-05-09	2029-10-15	2019	1100401	2001-01-01	M	2	3	6	Τρίκαλα	2026-03-27 17:21:36.887+00	2026-04-02 18:05:24.727+00	28	116	6	Ελλάδα	\N
929	2143	Βασιλείου	Καλλιόπη	Γεώργιος	6.17	1990-10-11	1990-12-29	1982	1200112	1961-01-01	F	4	15	10	Κυπαρισσία	2026-04-02 18:38:37.724+00	2026-04-02 18:38:37.724+00	\N	116	10	Ελλάδα	\N
930	2144	Αλεξίου	Βασίλης	Αντώνιος	7.09	1995-08-17	1995-11-15	1984	1200113	1962-01-01	M	4	16	7	Σάμη	2026-04-02 18:38:37.867+00	2026-04-02 18:38:37.867+00	\N	116	7	Ελλάδα	\N
931	2145	Καραγιάννης	Σπύρος	Νικόλαος	9.26	1986-03-23	1986-06-15	1980	1200114	1959-01-01	M	4	15	7	Ληξούρι	2026-04-02 18:38:38.01+00	2026-04-02 18:38:38.01+00	\N	116	7	Ελλάδα	\N
933	2147	Δούκας	Θανάσης	Σωτήριος	5.69	1987-07-26	1987-11-04	1982	1200116	1963-01-01	M	4	14	5	Ηγουμενίτσα	2026-04-02 18:38:38.297+00	2026-04-02 18:38:38.297+00	63	116	5	Ελλάδα	\N
934	2148	Αλεξίου	Παναγιώτης	Ευάγγελος	7.64	1994-04-18	1994-08-27	1986	1200117	1964-01-01	M	4	14	4	Κομοτηνή	2026-04-02 18:38:38.44+00	2026-04-02 18:38:38.44+00	53	116	4	Ελλάδα	\N
935	2149	Ζαχαρίου	Θανάσης	Σπυρίδων	7.98	1993-04-03	1993-05-18	1987	1200118	1969-01-01	M	4	14	6	Σοφάδες	2026-04-02 18:38:38.583+00	2026-04-02 18:38:38.583+00	\N	116	6	Ελλάδα	\N
936	2150	Τριανταφύλλου	Μάριος	Βασίλειος	5.94	1998-05-19	1998-06-21	1983	1200119	1964-01-01	M	4	16	6	Φάρσαλα	2026-04-02 18:38:38.725+00	2026-04-02 18:38:38.725+00	\N	116	6	Ελλάδα	\N
937	2151	Κυριακίδου	Ιωάννα	Δημήτριος	6.79	1985-09-07	1985-01-18	1980	1200120	1954-01-01	F	4	16	7	Σάμη	2026-04-02 18:38:38.869+00	2026-04-02 18:38:38.869+00	\N	116	7	Ελλάδα	\N
938	2152	Ιωαννίδης	Νίκος	Απόστολος	7.32	1999-04-27	1999-10-14	1989	1200121	1965-01-01	M	4	16	1	Μαρούσι	2026-04-02 18:38:39.012+00	2026-04-02 18:38:39.012+00	\N	116	1	Ελλάδα	\N
940	2154	Καραλή	Ειρήνη	Παναγιώτης	9.00	1996-09-07	1996-03-14	1991	1200123	1973-01-01	F	4	16	3	Καστοριά	2026-04-02 18:38:39.298+00	2026-04-02 18:38:39.298+00	22	116	3	Ελλάδα	\N
925	2138	Ζαχαρίου	Πέτρος	Πέτρος	5.47	1995-03-07	1995-06-21	1990	1200107	1967-01-01	M	4	15	5	Φιλιππιάδα	2026-04-02 18:38:37.153+00	2026-04-02 18:38:37.153+00	112	116	5	Ελλάδα	\N
953	2170	Ράπτης	Παναγιώτης	Μιχαήλ	5.53	1995-07-17	1995-01-11	1982	1200139	1961-01-01	M	4	15	3	Κοζάνη	2026-04-02 18:38:41.154+00	2026-04-02 18:38:41.154+00	20	116	3	Ελλάδα	\N
954	2171	Πετρόπουλος	Μιχάλης	Αλέξανδρος	9.81	2001-11-14	2001-09-22	1994	1200140	1975-01-01	M	4	14	5	Μέτσοβο	2026-04-02 18:38:41.296+00	2026-04-02 18:38:41.296+00	65	116	5	Ελλάδα	\N
956	2173	Ιωαννίδης	Βασίλης	Απόστολος	9.24	2000-06-18	1999-12-25	1990	1200142	1972-01-01	M	4	14	8	Αμαλιάδα	2026-04-02 18:38:41.581+00	2026-04-02 18:38:41.581+00	75	116	8	Ελλάδα	\N
957	2174	Χριστοδούλου	Σωτήρης	Σωτήριος	5.37	2004-07-18	2004-06-15	1994	1200143	1976-01-01	M	4	16	5	Ιωάννινα	2026-04-02 18:38:41.724+00	2026-04-02 18:38:41.724+00	23	116	5	Ελλάδα	\N
958	2175	Πάλλης	Μιχάλης	Χαράλαμπος	6.00	1992-12-10	1992-06-27	1980	1200144	1959-01-01	M	4	14	4	Ορεστιάδα	2026-04-02 18:38:41.866+00	2026-04-02 18:38:41.866+00	54	116	4	Ελλάδα	\N
959	2176	Τριανταφύλλου	Δημήτρης	Γεώργιος	9.47	1989-05-09	1990-01-13	1984	1200145	1966-01-01	M	4	15	3	Πτολεμαΐδα	2026-04-02 18:38:42.008+00	2026-04-02 18:38:42.008+00	21	116	3	Ελλάδα	\N
960	2177	Φωτιάδης	Αντώνης	Αθανάσιος	6.50	1985-10-16	1986-01-02	1980	1200146	1956-01-01	M	4	15	3	Πτολεμαΐδα	2026-04-02 18:38:42.151+00	2026-04-02 18:38:42.151+00	21	116	3	Ελλάδα	\N
961	2178	Δούκα	Γεωργία	Κωνσταντίνος	6.33	2003-02-20	2003-04-23	1996	1200147	1974-01-01	F	4	16	9	Λιβαδειά	2026-04-02 18:38:42.293+00	2026-04-02 18:38:42.293+00	76	116	9	Ελλάδα	\N
962	2179	Καρρά	Φωτεινή	Βασίλειος	6.21	1993-04-27	1993-12-10	1980	1200148	1959-01-01	F	4	15	7	Σάμη	2026-04-02 18:38:42.436+00	2026-04-02 18:38:42.436+00	\N	116	7	Ελλάδα	\N
963	2180	Πετροπούλου	Χριστίνα	Ιωάννης	9.60	1992-08-17	1992-12-28	1982	1200149	1962-01-01	F	4	16	1	Γλυφάδα	2026-04-02 18:38:42.579+00	2026-04-02 18:38:42.579+00	80	116	1	Ελλάδα	\N
948	2163	Καραγιάννης	Παναγιώτης	Βασίλειος	9.42	1985-05-10	1986-02-15	1980	1200132	1955-01-01	M	4	16	2	Πολύγυρος	2026-04-02 18:38:40.441+00	2026-04-02 18:38:40.441+00	115	116	2	Ελλάδα	\N
951	2167	Τριανταφύλλου	Χρήστος	Απόστολος	5.21	2000-07-27	2000-12-11	1987	1200136	1968-01-01	M	4	14	12	Κάλυμνος	2026-04-02 18:38:40.869+00	2026-04-02 18:38:40.869+00	103	116	12	Ελλάδα	\N
955	2172	Αργυρίου	Φωτεινή	Μιχαήλ	9.73	1993-01-09	1993-04-20	1986	1200141	1967-01-01	F	4	16	2	Κιλκίς	2026-04-02 18:38:41.439+00	2026-04-02 18:38:41.439+00	98	116	2	Ελλάδα	\N
296	52	Παπαδόπουλος	Ιωάννα	Γεώργιος	7.76	2029-11-09	2029-10-21	2020	1076380	2002-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:01.547+00	2026-04-02 18:04:23.184+00	38	116	1	Ελλάδα	\N
472	395	Θεοδωρίδης	Γιώργος	Δημήτριος	8.58	2010-08-29	2010-08-10	2003	1100147	1985-01-01	M	5	18	8	Πάτρα	2026-03-27 17:08:15.592+00	2026-04-02 18:04:47.737+00	32	116	8	Ελλάδα	\N
893	2105	Χριστοδούλου	Παναγιώτης	Κωνσταντίνος	5.45	2003-12-11	2003-07-22	1993	1200074	1970-01-01	M	4	14	8	Αγρίνιο	2026-04-02 18:38:32.577+00	2026-04-02 18:38:32.577+00	33	116	8	Ελλάδα	\N
491	414	Τσουκαλάς	Αντώνης	Αθανάσιος	8.14	2024-08-22	2024-01-10	2014	1100166	1996-01-01	M	6	22	8	Πάτρα	2026-03-27 17:19:54.095+00	2026-04-02 18:04:50.499+00	32	116	8	Ελλάδα	\N
506	429	Χατζηδάκη	Νίκη	Ευάγγελος	7.92	2028-11-05	2028-06-20	2021	1100181	2003-01-01	F	2	13	8	Πάτρα	2026-03-27 17:20:00.656+00	2026-04-02 18:04:52.684+00	32	116	8	Ελλάδα	\N
900	2113	Οικονόμου	Ελένη	Μιχαήλ	6.64	2002-07-11	2002-07-09	1995	1200082	1976-01-01	F	4	15	11	Ικαρία	2026-04-02 18:38:33.58+00	2026-04-02 18:38:33.58+00	84	116	11	Ελλάδα	\N
522	445	Σιδηροπούλου	Κατερίνα	Χρήστος	7.96	2035-09-13	2035-10-23	2026	1100197	2008-01-01	F	3	10	2	Θεσσαλονίκη	2026-03-27 17:20:07.647+00	2026-04-02 18:04:55.01+00	17	116	2	Ελλάδα	\N
847	2052	Γεωργίου	Μιχάλης	Αντώνιος	9.39	1995-01-07	1995-02-03	1984	1200021	1962-01-01	M	4	16	12	Κάλυμνος	2026-04-02 18:38:25.995+00	2026-04-02 18:38:25.995+00	103	116	12	Ελλάδα	\N
861	2067	Νικολάου	Μιχάλης	Σωτήριος	6.26	1989-06-25	1989-07-30	1981	1200036	1961-01-01	M	4	16	3	Αμύνταιο	2026-04-02 18:38:27.994+00	2026-04-02 18:38:27.994+00	106	116	3	Ελλάδα	\N
879	2089	Σταματίου	Λευτέρης	Αντώνιος	7.48	1997-07-14	1998-05-01	1988	1200058	1968-01-01	M	4	16	12	Κάλυμνος	2026-04-02 18:38:30.563+00	2026-04-02 18:38:30.563+00	103	116	12	Ελλάδα	\N
898	2111	Δεληγιάννη	Άννα	Πέτρος	5.50	1988-05-28	1988-02-06	1980	1200080	1961-01-01	F	4	15	3	Αμύνταιο	2026-04-02 18:38:33.295+00	2026-04-02 18:38:33.295+00	106	116	3	Ελλάδα	\N
351	162	Μαθιός	Ολυμπία	Παναγιώτης	9.35	2029-06-09	2029-10-16	2019	1085645	2001-01-01	F	2	3	1	Αθήνα	2026-03-27 13:23:17.424+00	2026-04-02 18:04:31.083+00	38	116	1	Ελλάδα	\N
394	317	Αναστασίου	Μιχάλης	Αθανάσιος	7.04	2013-08-02	2013-03-20	2004	1051760	1986-01-01	M	5	19	1	Αθήνα	2026-03-27 13:23:29.818+00	2026-04-02 18:04:37.051+00	38	116	1	Ελλάδα	\N
908	2121	Καρράς	Απόστολος	Λεωνίδας	9.84	1987-08-28	1987-03-27	1980	1200090	1959-01-01	M	4	16	3	Αμύνταιο	2026-04-02 18:38:34.724+00	2026-04-02 18:38:34.724+00	106	116	3	Ελλάδα	\N
914	2127	Πετροπούλου	Ιωάννα	Πέτρος	6.98	1986-02-06	1986-03-26	1981	1200096	1962-01-01	F	4	15	12	Κάλυμνος	2026-04-02 18:38:35.582+00	2026-04-02 18:38:35.582+00	103	116	12	Ελλάδα	\N
919	2132	Βασιλείου	Κώστας	Θεόδωρος	9.08	1989-07-24	1989-12-21	1980	1200101	1956-01-01	M	4	15	2	Νάουσα	2026-04-02 18:38:36.296+00	2026-04-02 18:38:36.296+00	101	116	2	Ελλάδα	\N
404	327	Ζαφειρίου	Λευτέρης	Βασίλειος	8.96	2023-04-06	2023-07-14	2015	1078493	1997-01-01	M	2	13	1	Αθήνα	2026-03-27 13:23:32.698+00	2026-04-02 18:04:38.507+00	38	116	1	Ελλάδα	\N
905	2118	Φωτιάδης	Μάριος	Λεωνίδας	5.50	2003-10-20	2003-11-29	1989	1200087	1969-01-01	M	4	16	13	Άγιος Νικόλαος	2026-04-02 18:38:34.296+00	2026-04-02 18:38:34.296+00	\N	116	13	Ελλάδα	\N
567	490	Λαμπροπούλου	Ζωή	Ιωάννης	9.62	2031-12-06	2031-07-22	2025	1100242	2007-01-01	F	3	8	2	Θεσσαλονίκη	2026-03-27 17:20:27.342+00	2026-04-02 18:05:01.561+00	17	116	2	Ελλάδα	\N
582	505	Αρβανιτάκη	Χρήστος	Αθανάσιος	9.06	2038-06-09	2038-10-16	2020	1100257	2002-01-01	M	2	3	2	Θεσσαλονίκη	2026-03-27 17:20:33.92+00	2026-04-02 18:05:03.741+00	17	116	2	Ελλάδα	\N
597	520	Δημητρίου	Περικλής	Σωτήριος	6.67	2033-04-13	2033-05-23	2022	1100272	2004-01-01	M	3	11	13	Ηράκλειο	2026-03-27 17:20:40.483+00	2026-04-02 18:05:05.922+00	50	116	13	Ελλάδα	\N
615	538	Καρβούνης	Δημήτρης	Νικόλαος	7.98	2025-05-09	2025-10-15	2016	1100290	1998-01-01	M	2	3	13	Ηράκλειο	2026-03-27 17:20:48.36+00	2026-04-02 18:05:08.55+00	50	116	13	Ελλάδα	\N
631	554	Σιδηροπούλου	Κατερίνα	Χρήστος	7.74	2036-09-04	2036-05-19	2022	1100306	2004-01-01	F	3	11	13	Ηράκλειο	2026-03-27 17:20:55.356+00	2026-04-02 18:05:10.877+00	50	116	13	Ελλάδα	\N
910	2123	Γαλάνη	Δέσποινα	Πέτρος	9.15	1996-02-20	1996-07-25	1989	1200092	1965-01-01	F	4	15	13	Ιεράπετρα	2026-04-02 18:38:35.01+00	2026-04-02 18:38:35.01+00	89	116	13	Ελλάδα	\N
634	557	Μαυρομάτης	Ελένη	Γεώργιος	9.10	2007-06-04	2007-05-16	2002	1100309	1984-01-01	F	5	18	5	Ιωάννινα	2026-03-27 17:20:56.664+00	2026-04-02 18:05:11.327+00	23	116	5	Ελλάδα	\N
650	573	Παναγιωτίδου	Νεφέλη	Ιωάννης	7.80	2015-11-21	2015-12-31	2002	1100325	1984-01-01	F	5	19	5	Ιωάννινα	2026-03-27 17:21:03.658+00	2026-04-02 18:05:13.654+00	23	116	5	Ελλάδα	\N
669	592	Παπακωνσταντίνου	Δημήτρης	Ανδρέας	7.86	2007-03-04	2007-05-13	1998	1100344	1980-01-01	M	5	17	6	Λάρισα	2026-03-27 17:21:11.963+00	2026-04-02 18:05:16.418+00	26	116	6	Ελλάδα	\N
1	1	Μπίρμπας	Παναγιώτης	Θεόδωρος	7.14	2027-03-22	2027-01-05	2022	1050360	2004-01-01	M	3	9	8	Καλάβρυτα	2026-03-04 14:14:23.142+00	2026-04-02 18:04:20.56+00	\N	116	8	Ελλάδα	\N
696	619	Ζαχαρίου	Αντώνης	Δημήτριος	6.65	2027-12-09	2027-10-22	2014	1100371	1996-01-01	M	6	22	6	Βόλος	2026-03-27 17:21:23.762+00	2026-04-02 18:05:20.358+00	27	116	6	Ελλάδα	\N
711	634	Παπαδόπουλος	Μελίνα	Νικόλαος	6.69	2027-08-30	2027-09-10	2013	1100386	1995-01-01	F	6	22	8	Αγρίνιο	2026-03-27 17:21:30.328+00	2026-04-02 18:05:22.544+00	33	116	8	Ελλάδα	\N
289	38	Αρβανιτάκη	Νάντια	Ιωάννης	7.25	2030-01-04	2030-11-05	2018	1079833	2000-01-01	F	2	4	1	Αθήνα	2026-03-27 13:22:59.532+00	2026-04-02 18:04:22.165+00	38	116	1	Ελλάδα	\N
939	2153	Μιχαηλίδου	Σοφία	Δημήτριος	7.58	1989-11-02	1989-01-20	1980	1200122	1955-01-01	F	4	14	8	Ναύπακτος	2026-04-02 18:38:39.156+00	2026-04-02 18:38:39.156+00	\N	116	8	Ελλάδα	\N
461	384	Χατζηδάκη	Νίκη	Ευάγγελος	6.75	2034-11-05	2034-06-20	2025	1100136	2007-01-01	F	3	11	8	Πάτρα	2026-03-27 17:08:10.807+00	2026-04-02 18:04:46.137+00	32	116	8	Ελλάδα	\N
744	667	Παπακωνσταντίνου	Δημήτρης	Ανδρέας	7.03	2030-08-22	2030-01-10	2020	1100419	2002-01-01	M	2	13	9	Χαλκίδα	2026-03-27 17:21:44.759+00	2026-04-02 18:05:27.345+00	35	116	9	Ελλάδα	\N
746	669	Θεοδώρου	Μαργαρίτα	Αλέξανδρος	8.00	2021-06-07	2021-08-15	2016	1100421	1998-01-01	F	2	4	10	Καλαμάτα	2026-03-27 17:21:45.634+00	2026-04-02 18:05:27.636+00	41	116	10	Ελλάδα	\N
764	687	Θεοδωρίδης	Γιώργος	Δημήτριος	7.49	2017-08-31	2017-10-10	2010	1100439	1992-01-01	M	6	21	3	Κοζάνη	2026-03-27 17:21:53.524+00	2026-04-02 18:05:30.255+00	20	116	3	Ελλάδα	\N
779	702	Παπαδόπουλος	Γεώργιος	Αντώνιος	6.02	2033-08-24	2033-03-10	2022	1100454	2004-01-01	M	3	9	13	Ρέθυμνο	2026-03-27 17:22:00.088+00	2026-04-02 18:05:32.435+00	52	116	13	Ελλάδα	\N
728	651	Χριστοπούλου	Κατερίνα	Στέφανος	6.17	2033-09-15	2033-10-25	2021	1100403	2003-01-01	F	2	13	6	Τρίκαλα	2026-03-27 17:21:37.761+00	2026-04-02 18:05:25.018+00	28	116	6	Ελλάδα	\N
729	652	Φωτιάδου	Γεωργία	Στυλιανός	7.81	2000-05-27	2000-06-07	1993	1100404	1975-01-01	F	4	16	6	Τρίκαλα	2026-03-27 17:21:38.197+00	2026-04-02 18:05:25.164+00	28	116	6	Ελλάδα	\N
730	653	Δεληγιάννης	Αλεξάνδρα	Χρήστος	7.33	2035-08-29	2035-08-10	2015	1100405	1997-01-01	F	2	4	6	Τρίκαλα	2026-03-27 17:21:38.638+00	2026-04-02 18:05:25.309+00	28	116	6	Ελλάδα	\N
731	654	Λαμπροπούλου	Ζωή	Ιωάννης	9.00	1989-12-06	1989-07-22	1981	1100406	1963-01-01	F	4	14	5	Άρτα	2026-03-27 17:21:39.075+00	2026-04-02 18:05:25.454+00	24	116	5	Ελλάδα	\N
732	655	Μακρή	Αλέξανδρος	Αθανάσιος	8.72	2001-03-23	2001-02-05	1994	1100407	1976-01-01	M	4	14	5	Άρτα	2026-03-27 17:21:39.512+00	2026-04-02 18:05:25.599+00	24	116	5	Ελλάδα	\N
733	656	Λαμπροπούλου	Ζωή	Ιωάννης	6.39	2026-08-16	2026-09-25	2020	1100408	2002-01-01	F	2	3	5	Άρτα	2026-03-27 17:21:39.949+00	2026-04-02 18:05:25.745+00	24	116	5	Ελλάδα	\N
734	657	Παπαδόπουλος	Μελίνα	Νικόλαος	6.26	2017-06-09	2017-10-16	2009	1100409	1991-01-01	F	6	21	5	Άρτα	2026-03-27 17:21:40.386+00	2026-04-02 18:05:25.89+00	24	116	5	Ελλάδα	\N
735	658	Αρβανιτάκη	Νάντια	Ιωάννης	8.32	2020-09-05	2020-06-18	2011	1100410	1993-01-01	F	6	20	5	Άρτα	2026-03-27 17:21:40.823+00	2026-04-02 18:05:26.037+00	24	116	5	Ελλάδα	\N
736	659	Πετροπούλου	Ιωάννα	Παναγιώτης	6.30	2029-03-02	2029-03-15	2020	1100411	2002-01-01	F	2	3	4	Καβάλα	2026-03-27 17:21:41.26+00	2026-04-02 18:05:26.182+00	16	116	4	Ελλάδα	\N
737	660	Γεωργίου	Σοφία	Χρήστος	7.82	2017-04-02	2017-03-16	2006	1100412	1988-01-01	F	5	17	4	Καβάλα	2026-03-27 17:21:41.698+00	2026-04-02 18:05:26.328+00	16	116	4	Ελλάδα	\N
738	661	Φωτιάδης	Αχιλλέας	Στυλιανός	8.15	2028-05-23	2028-02-07	2021	1100413	2003-01-01	M	2	3	4	Καβάλα	2026-03-27 17:21:42.135+00	2026-04-02 18:05:26.473+00	16	116	4	Ελλάδα	\N
739	662	Ζαφειρίου	Λευτέρης	Βασίλειος	7.41	2029-05-04	2029-05-15	2024	1100414	2006-01-01	M	3	10	4	Καβάλα	2026-03-27 17:21:42.573+00	2026-04-02 18:05:26.618+00	16	116	4	Ελλάδα	\N
740	663	Νικολάου	Αλέξανδρος	Παναγιώτης	6.36	2029-08-01	2029-02-17	2021	1100415	2003-01-01	M	2	4	4	Καβάλα	2026-03-27 17:21:43.009+00	2026-04-02 18:05:26.764+00	16	116	4	Ελλάδα	\N
741	664	Αγγελίδης	Ιάσονας	Παναγιώτης	8.36	2029-08-19	2029-09-28	2012	1100416	1994-01-01	M	6	20	9	Χαλκίδα	2026-03-27 17:21:43.446+00	2026-04-02 18:05:26.909+00	35	116	9	Ελλάδα	\N
742	665	Ζαφειρίου	Δέσποινα	Γεώργιος	7.60	2004-05-08	2004-09-14	1998	1100417	1980-01-01	F	5	17	9	Χαλκίδα	2026-03-27 17:21:43.882+00	2026-04-02 18:05:27.055+00	35	116	9	Ελλάδα	\N
799	1004	Στεφανίδου	Μαρίνα	Κωνσταντίνος	8.61	2028-03-24	2028-03-05	2022	1099104	2004-01-01	F	3	9	1	Αθήνα	2026-03-28 23:52:29.785+00	2026-04-02 18:05:35.342+00	38	116	1	Ελλάδα	\N
800	1005	Γεωργίου	Χρήστος	Παναγιώτης	7.35	2033-04-09	2033-10-14	2026	1099105	2008-01-01	M	3	11	1	Αθήνα	2026-03-28 23:52:30.077+00	2026-04-02 18:05:35.487+00	38	116	1	Ελλάδα	\N
801	1006	Λαμπρινού	Άννα	Σωτήριος	7.98	2025-01-04	2025-11-05	2017	1099106	1999-01-01	F	2	3	1	Αθήνα	2026-03-28 23:52:30.367+00	2026-04-02 18:05:35.632+00	38	116	1	Ελλάδα	\N
808	2006	Λύτρα	Άννα	Σωτήριος	7.98	2027-01-04	2027-11-05	2019	1099206	2001-01-01	F	2	13	1	Αθήνα	2026-03-28 23:53:09.478+00	2026-04-02 18:05:36.648+00	38	116	1	Ελλάδα	\N
809	2007	Κοσμάς	Νικόλαος	Αθανάσιος	6.77	1995-08-26	1995-05-10	1989	1099207	1971-01-01	M	4	14	1	Αθήνα	2026-03-28 23:53:09.77+00	2026-04-02 18:05:36.794+00	38	116	1	Ελλάδα	\N
743	666	Δημητρίου	Περικλής	Σωτήριος	8.28	2022-04-13	2022-05-23	2014	1100418	1996-01-01	M	2	13	9	Χαλκίδα	2026-03-27 17:21:44.324+00	2026-04-02 18:05:27.2+00	35	116	9	Ελλάδα	\N
796	1001	Παπαδάκης	Μανώλης	Γεώργιος	7.82	2032-09-15	2032-10-25	2025	1099101	2007-01-01	M	3	8	1	Αθήνα	2026-03-28 23:52:28.909+00	2026-04-02 18:05:34.906+00	38	116	1	Ελλάδα	\N
797	1002	Καραγιάννη	Ελένη	Ιωάννης	8.26	2019-03-20	2019-04-29	2012	1099102	1994-01-01	F	6	21	1	Αθήνα	2026-03-28 23:52:29.205+00	2026-04-02 18:05:35.051+00	38	116	1	Ελλάδα	\N
798	1003	Δημόπουλος	Αλέξανδρος	Νικόλαος	6.94	2006-08-28	2006-07-10	1999	1099103	1981-01-01	M	5	19	1	Αθήνα	2026-03-28 23:52:29.496+00	2026-04-02 18:05:35.196+00	38	116	1	Ελλάδα	\N
802	1007	Ράπτης	Νικόλαος	Αθανάσιος	6.77	1994-08-26	1994-05-10	1988	1099107	1970-01-01	M	4	15	1	Αθήνα	2026-03-28 23:52:30.657+00	2026-04-02 18:05:35.777+00	38	116	1	Ελλάδα	\N
803	1008	Βλαχάκη	Ιωάννα	Δημήτριος	8.11	2031-09-19	2031-10-29	2022	1099108	2004-01-01	F	3	9	1	Αθήνα	2026-03-28 23:52:30.947+00	2026-04-02 18:05:35.922+00	38	116	1	Ελλάδα	\N
804	1009	Τζιόβας	Σπύρος	Ευάγγελος	7.49	2032-03-04	2032-05-13	2023	1099109	2005-01-01	M	3	9	1	Αθήνα	2026-03-28 23:52:31.237+00	2026-04-02 18:05:36.067+00	38	116	1	Ελλάδα	\N
805	1010	Κουτσοπούλου	Δέσποινα	Χρήστος	8.43	2026-12-04	2026-05-22	2018	1099110	2000-01-01	F	2	3	1	Αθήνα	2026-03-28 23:52:31.53+00	2026-04-02 18:05:36.213+00	38	116	1	Ελλάδα	\N
806	2004	Μακρή	Κατερίνα	Χρήστος	11.30	2015-03-24	2015-03-05	2009	1099204	1991-01-01	F	6	22	1	Αθήνα	2026-03-28 23:53:08.895+00	2026-04-02 18:05:36.358+00	38	116	1	Ελλάδα	\N
807	2005	Γαλάνης	Πέτρος	Παναγιώτης	7.35	2024-04-09	2024-10-14	2017	AMX105	1999-01-01	M	2	4	1	Αθήνα	2026-03-28 23:53:09.187+00	2026-04-02 18:05:36.503+00	38	116	1	Ελλάδα	\N
747	670	Σαραντίδου	Μαρία	Δημήτριος	7.96	2020-10-09	2020-10-20	2006	1100422	1988-01-01	F	5	18	10	Καλαμάτα	2026-03-27 17:21:46.071+00	2026-04-02 18:05:27.781+00	41	116	10	Ελλάδα	\N
748	671	Βασιλείου	Νίκος	Ευάγγελος	6.51	2027-07-04	2027-05-17	2016	1100423	1998-01-01	M	2	4	10	Καλαμάτα	2026-03-27 17:21:46.509+00	2026-04-02 18:05:27.927+00	41	116	10	Ελλάδα	\N
749	672	Αρβανιτάκη	Χρήστος	Αθανάσιος	6.21	2038-05-06	2038-07-15	2025	1100424	2007-01-01	M	3	9	10	Καλαμάτα	2026-03-27 17:21:46.945+00	2026-04-02 18:05:28.073+00	41	116	10	Ελλάδα	\N
751	674	Περικλής	Αναστασία	Αθανάσιος	5.74	2030-08-31	2030-10-10	2023	1100426	2005-01-01	F	3	8	12	Ρόδος	2026-03-27 17:21:47.823+00	2026-04-02 18:05:28.363+00	47	116	12	Ελλάδα	\N
752	675	Χατζηδάκης	Μανώλης	Ευάγγελος	6.87	2020-07-05	2020-06-16	2014	1100427	1996-01-01	M	6	22	12	Ρόδος	2026-03-27 17:21:48.259+00	2026-04-02 18:05:28.509+00	47	116	12	Ελλάδα	\N
753	676	Παπαδοπούλου	Μαρία	Ιωάννης	8.50	2037-01-19	2037-02-28	2026	1100428	2008-01-01	F	3	11	12	Ρόδος	2026-03-27 17:21:48.695+00	2026-04-02 18:05:28.654+00	47	116	12	Ελλάδα	\N
754	677	Θεοδωρίδης	Γιώργος	Δημήτριος	8.16	2030-01-09	2030-11-10	2021	1100429	2003-01-01	M	2	13	12	Ρόδος	2026-03-27 17:21:49.135+00	2026-04-02 18:05:28.799+00	47	116	12	Ελλάδα	\N
755	678	Πετροπούλου	Ιωάννα	Παναγιώτης	6.41	2027-03-23	2027-02-05	2021	1100430	2003-01-01	F	2	3	12	Ρόδος	2026-03-27 17:21:49.585+00	2026-04-02 18:05:28.945+00	47	116	12	Ελλάδα	\N
756	679	Οικονόμου	Αναστασία	Νικόλαος	8.35	2034-07-21	2034-08-30	2026	1100431	2008-01-01	F	3	8	7	Κέρκυρα	2026-03-27 17:21:50.026+00	2026-04-02 18:05:29.091+00	29	116	7	Ελλάδα	\N
757	680	Αγγελίδης	Χριστίνα	Στέφανος	8.07	2023-01-04	2023-11-05	2014	1100432	1996-01-01	F	2	13	7	Κέρκυρα	2026-03-27 17:21:50.464+00	2026-04-02 18:05:29.236+00	29	116	7	Ελλάδα	\N
758	681	Τσιώλης	Κωνσταντίνος	Δημήτριος	9.77	2030-09-15	2030-10-25	2013	1100433	1995-01-01	M	6	20	7	Κέρκυρα	2026-03-27 17:21:50.901+00	2026-04-02 18:05:29.382+00	29	116	7	Ελλάδα	\N
759	682	Χαρίτου	Μελίνα	Γεώργιος	7.92	2030-03-27	2030-06-05	2025	1100434	2007-01-01	F	3	9	7	Κέρκυρα	2026-03-27 17:21:51.337+00	2026-04-02 18:05:29.528+00	29	116	7	Ελλάδα	\N
760	683	Ιωαννίδης	Νικόλαος	Παναγιώτης	9.16	2004-03-29	2004-08-05	1993	1100435	1975-01-01	M	4	16	7	Κέρκυρα	2026-03-27 17:21:51.775+00	2026-04-02 18:05:29.674+00	29	116	7	Ελλάδα	\N
761	684	Περικλής	Αναστασία	Αθανάσιος	5.84	2036-09-16	2036-10-26	2024	1100436	2006-01-01	F	3	7	3	Κοζάνη	2026-03-27 17:21:52.211+00	2026-04-02 18:05:29.819+00	20	116	3	Ελλάδα	\N
762	685	Μακρή	Μελίνα	Ηλίας	6.53	2016-05-19	2016-06-28	2009	1100437	1991-01-01	F	5	17	3	Κοζάνη	2026-03-27 17:21:52.65+00	2026-04-02 18:05:29.965+00	20	116	3	Ελλάδα	\N
763	686	Νικολαΐδου	Χριστίνα	Κωνσταντίνος	7.83	1987-10-23	1987-02-12	1982	1100438	1964-01-01	F	4	15	3	Κοζάνη	2026-03-27 17:21:53.087+00	2026-04-02 18:05:30.11+00	20	116	3	Ελλάδα	\N
765	688	Παπανικολάου	Κωνσταντίνος	Αθανάσιος	6.82	1990-07-04	1990-05-17	1982	1100440	1964-01-01	M	4	14	3	Κοζάνη	2026-03-27 17:21:53.961+00	2026-04-02 18:05:30.4+00	20	116	3	Ελλάδα	\N
766	689	Φωτιάδου	Γεωργία	Στυλιανός	7.50	2005-05-27	2005-06-07	1998	1100441	1980-01-01	F	5	18	4	Αλεξανδρούπολη	2026-03-27 17:21:54.398+00	2026-04-02 18:05:30.546+00	14	116	4	Ελλάδα	\N
767	690	Τσουκαλάς	Αντώνης	Αθανάσιος	6.46	2009-01-04	2009-11-05	1997	1100442	1979-01-01	M	4	16	4	Αλεξανδρούπολη	2026-03-27 17:21:54.836+00	2026-04-02 18:05:30.691+00	14	116	4	Ελλάδα	\N
768	691	Αγγελίδης	Ιάσονας	Παναγιώτης	7.00	2031-08-04	2031-05-18	2026	1100443	2008-01-01	M	3	10	4	Αλεξανδρούπολη	2026-03-27 17:21:55.273+00	2026-04-02 18:05:30.837+00	14	116	4	Ελλάδα	\N
769	692	Σαμαρά	Δανάη	Χρήστος	7.76	2025-08-18	2025-09-27	2009	1100444	1991-01-01	F	5	18	4	Αλεξανδρούπολη	2026-03-27 17:21:55.709+00	2026-04-02 18:05:30.982+00	14	116	4	Ελλάδα	\N
770	693	Μαυρομάτης	Ελένη	Γεώργιος	7.05	2020-12-11	2020-12-22	2014	1100445	1996-01-01	F	2	3	4	Αλεξανδρούπολη	2026-03-27 17:21:56.146+00	2026-04-02 18:05:31.127+00	14	116	4	Ελλάδα	\N
771	694	Νικολάου	Ανδρέας	Παναγιώτης	5.78	2030-03-27	2030-06-05	2016	1100446	1998-01-01	M	2	4	11	Μυτιλήνη	2026-03-27 17:21:56.588+00	2026-04-02 18:05:31.272+00	44	116	11	Ελλάδα	\N
772	695	Σαμαρά	Δανάη	Χρήστος	6.04	2023-10-09	2023-10-20	2015	1100447	1997-01-01	F	2	4	11	Μυτιλήνη	2026-03-27 17:21:57.025+00	2026-04-02 18:05:31.418+00	44	116	11	Ελλάδα	\N
773	696	Θεοδωρίδης	Πέτρος	Νικόλαος	7.53	2024-03-09	2024-10-13	2012	1100448	1994-01-01	M	6	20	11	Μυτιλήνη	2026-03-27 17:21:57.461+00	2026-04-02 18:05:31.563+00	44	116	11	Ελλάδα	\N
774	697	Αργυρίου	Χριστίνα	Ανδρέας	7.32	2027-03-04	2027-05-13	2022	1100449	2004-01-01	F	3	9	11	Μυτιλήνη	2026-03-27 17:21:57.899+00	2026-04-02 18:05:31.709+00	44	116	11	Ελλάδα	\N
775	698	Κοκκίνου	Νεφέλη	Ιωάννης	9.43	2039-03-09	2039-10-13	2026	1100450	2008-01-01	F	3	11	11	Μυτιλήνη	2026-03-27 17:21:58.336+00	2026-04-02 18:05:31.854+00	44	116	11	Ελλάδα	\N
776	699	Δημητρίου	Κωνσταντίνος	Ιωάννης	7.59	1991-04-04	1991-05-14	1983	1100451	1965-01-01	M	4	15	13	Ρέθυμνο	2026-03-27 17:21:58.774+00	2026-04-02 18:05:31.999+00	52	116	13	Ελλάδα	\N
777	700	Κυριακίδης	Μυρτώ	Δημήτριος	6.51	1992-08-19	1992-09-28	1984	1100452	1966-01-01	F	4	15	13	Ρέθυμνο	2026-03-27 17:21:59.211+00	2026-04-02 18:05:32.145+00	52	116	13	Ελλάδα	\N
778	701	Σπυρόπουλος	Νίκος	Ανδρέας	5.91	2035-03-09	2035-10-13	2025	1100453	2007-01-01	M	3	8	13	Ρέθυμνο	2026-03-27 17:21:59.647+00	2026-04-02 18:05:32.29+00	52	116	13	Ελλάδα	\N
780	703	Δημητρίου	Ιρις	Ευάγγελος	8.63	2022-03-04	2022-05-13	2015	1100455	1997-01-01	F	2	4	13	Ρέθυμνο	2026-03-27 17:22:00.526+00	2026-04-02 18:05:32.581+00	52	116	13	Ελλάδα	\N
781	704	Μπίρμπας	Παναγιώτης	Θεόδωρος	6.47	2024-02-09	2024-12-10	2016	1100456	1998-01-01	M	2	13	2	Κατερίνη	2026-03-27 17:22:00.964+00	2026-04-02 18:05:32.726+00	19	116	2	Ελλάδα	\N
782	705	Μαυρομάτης	Νεφέλη	Δημήτριος	9.45	2028-08-21	2028-09-30	2014	1100457	1996-01-01	F	6	22	2	Κατερίνη	2026-03-27 17:22:01.401+00	2026-04-02 18:05:32.871+00	19	116	2	Ελλάδα	\N
783	706	Νικολαΐδου	Χριστίνα	Κωνσταντίνος	6.41	2023-03-16	2023-04-25	2016	1100458	1998-01-01	F	2	4	2	Κατερίνη	2026-03-27 17:22:01.837+00	2026-04-02 18:05:33.017+00	19	116	2	Ελλάδα	\N
784	707	Δημητρίου	Περικλής	Σωτήριος	7.38	2028-04-13	2028-05-23	2017	1100459	1999-01-01	M	2	4	2	Κατερίνη	2026-03-27 17:22:02.274+00	2026-04-02 18:05:33.162+00	19	116	2	Ελλάδα	\N
785	708	Κεχαγιάς	Πέτρος	Χαράλαμπος	8.12	2017-07-18	2017-08-27	2012	1100460	1994-01-01	M	6	22	2	Κατερίνη	2026-03-27 17:22:02.71+00	2026-04-02 18:05:33.308+00	19	116	2	Ελλάδα	\N
786	709	Γαλάνη	Δέσποινα	Αθανάσιος	7.94	2031-10-04	2031-05-20	2024	1100461	2006-01-01	F	3	9	1	Αθήνα	2026-03-28 10:34:54.778+00	2026-04-02 18:05:33.453+00	38	116	1	Ελλάδα	\N
787	710	Αποστολίδης	Μυρτώ	Ιωάννης	8.89	2028-08-19	2028-09-28	2023	1100462	2005-01-01	F	3	12	1	Αθήνα	2026-03-28 10:34:55.219+00	2026-04-02 18:05:33.598+00	38	116	1	Ελλάδα	\N
788	711	Σαμαρά	Δανάη	Χρήστος	7.94	2034-03-09	2034-10-13	2023	1100463	2005-01-01	F	3	7	1	Αθήνα	2026-03-28 10:34:55.659+00	2026-04-02 18:05:33.744+00	38	116	1	Ελλάδα	\N
789	712	Δημοπούλου	Δημήτρης	Παναγιώτης	6.70	2033-03-25	2033-04-05	2017	1100464	1999-01-01	M	2	3	1	Αθήνα	2026-03-28 10:34:56.098+00	2026-04-02 18:05:33.889+00	38	116	1	Ελλάδα	\N
793	716	Τσιώλης	Κωνσταντίνος	Δημήτριος	8.76	2018-08-18	2018-09-27	2011	1100468	1993-01-01	M	6	20	1	Αθήνα	2026-03-28 10:34:57.851+00	2026-04-02 18:05:34.47+00	38	116	1	Ελλάδα	\N
794	717	Μαυρομάτης	Ελένη	Γεώργιος	8.45	2021-08-04	2021-05-18	2007	1100469	1989-01-01	F	5	17	1	Αθήνα	2026-03-28 10:34:58.29+00	2026-04-02 18:05:34.616+00	38	116	1	Ελλάδα	\N
795	718	Αργυρίου	Χριστίνα	Ανδρέας	6.99	2031-10-15	2031-11-24	2017	1100470	1999-01-01	F	2	4	1	Αθήνα	2026-03-28 10:34:58.729+00	2026-04-02 18:05:34.761+00	38	116	1	Ελλάδα	\N
810	2010	Καψάλη	Δέσποινα	Χρήστος	8.43	2030-12-04	2030-05-22	2022	1099210	2004-01-01	F	3	11	1	Αθήνα	2026-03-28 23:53:10.061+00	2026-04-02 18:05:36.939+00	38	116	1	Ελλάδα	\N
811	2011	Δημάκης	Γεώργιος	Αντώνιος	7.88	2030-04-18	2030-05-28	2022	1099211	2004-01-01	M	3	11	10	Ναύπλιο	2026-04-02 18:05:37.085+00	2026-04-02 18:05:37.085+00	\N	116	10	Ελλάδα	\N
812	2012	Μαυροπούλου	Ελένη	Νικόλαος	8.21	2026-12-07	2026-09-21	2018	1099212	2000-01-01	F	2	3	10	Σπάρτη	2026-04-02 18:05:37.232+00	2026-04-02 18:05:37.232+00	82	116	10	Ελλάδα	\N
813	2013	Στεφανίδης	Χρήστος	Παναγιώτης	7.42	2022-03-25	2022-04-05	2015	1099213	1997-01-01	M	2	4	10	Κόρινθος	2026-04-02 18:05:37.379+00	2026-04-02 18:05:37.379+00	42	116	10	Ελλάδα	\N
814	2014	Αλεξοπούλου	Μαρία	Δημήτριος	7.63	2017-06-30	2017-09-08	2011	1099214	1993-01-01	F	6	22	8	Πύργος	2026-04-02 18:05:37.525+00	2026-04-02 18:05:37.525+00	34	116	8	Ελλάδα	\N
815	2015	Καραλής	Νικόλαος	Σωτήριος	6.95	2015-04-14	2015-05-24	2009	1099215	1991-01-01	M	6	20	8	Μεσολόγγι	2026-04-02 18:05:37.67+00	2026-04-02 18:05:37.67+00	73	116	8	Ελλάδα	\N
816	2016	Ράλλη	Ιωάννα	Χρήστος	8.04	2023-05-17	2023-06-26	2016	1099216	1998-01-01	F	2	13	9	Λαμία	2026-04-02 18:05:37.816+00	2026-04-02 18:05:37.816+00	36	116	9	Ελλάδα	\N
817	2017	Γρηγοριάδης	Θεόδωρος	Ιωάννης	7.18	2020-02-10	2020-11-11	2014	1099217	1996-01-01	M	2	3	6	Καρδίτσα	2026-04-02 18:05:37.962+00	2026-04-02 18:05:37.962+00	66	116	6	Ελλάδα	\N
819	2019	Τσακίρης	Μιχάλης	Γεώργιος	7.73	2032-06-15	2032-07-25	2024	1099219	2006-01-01	M	3	8	2	Βέροια	2026-04-02 18:05:38.258+00	2026-04-02 18:05:38.258+00	56	116	2	Ελλάδα	\N
820	2020	Κορινθίου	Άννα	Πέτρος	8.32	2028-09-07	2028-08-18	2020	1099220	2002-01-01	F	2	4	2	Έδεσσα	2026-04-02 18:05:38.404+00	2026-04-02 18:05:38.404+00	58	116	2	Ελλάδα	\N
821	2021	Βούλγαρης	Αλέξανδρος	Κωνσταντίνος	7.56	2027-03-27	2027-06-05	2019	1099221	2001-01-01	M	2	3	3	Φλώρινα	2026-04-02 18:05:38.549+00	2026-04-02 18:05:38.549+00	62	116	3	Ελλάδα	\N
822	2022	Ντάκου	Ευαγγελία	Δημήτριος	7.11	2003-11-04	2003-05-21	1997	1099222	1979-01-01	F	4	15	3	Καστοριά	2026-04-02 18:05:38.695+00	2026-04-02 18:05:38.695+00	22	116	3	Ελλάδα	\N
823	2023	Μπεκιάρης	Παναγιώτης	Βασίλειος	6.84	2014-06-19	2014-07-29	2008	1099223	1990-01-01	M	5	19	7	Λευκάδα	2026-04-02 18:05:38.84+00	2026-04-02 18:05:38.84+00	71	116	7	Ελλάδα	\N
824	2024	Κρητικού	Ειρήνη	Σπυρίδων	7.69	2016-05-05	2016-06-14	2010	1099224	1992-01-01	F	6	21	7	Ζάκυνθος	2026-04-02 18:05:38.986+00	2026-04-02 18:05:38.986+00	30	116	7	Ελλάδα	\N
825	2025	Σακελλάρης	Ανδρέας	Νικόλαος	8.09	2033-09-20	2033-10-30	2025	1099225	2007-01-01	M	3	9	12	Σύρος	2026-04-02 18:05:39.132+00	2026-04-02 18:05:39.132+00	86	116	12	Ελλάδα	\N
826	2026	Κοντογιάννη	Μαργαρίτα	Ιωσήφ	8.27	2030-12-07	2030-08-21	2022	1099226	2004-01-01	F	3	10	12	Νάξος	2026-04-02 18:05:39.278+00	2026-04-02 18:05:39.278+00	87	116	12	Ελλάδα	\N
827	2027	Λεμονής	Σπύρος	Αναστάσιος	7.94	2029-06-18	2029-07-28	2021	1099227	2003-01-01	M	2	13	11	Χίος	2026-04-02 18:05:39.423+00	2026-04-02 18:05:39.423+00	45	116	11	Ελλάδα	\N
830	2030	Θεοδώρου	Χριστίνα	Σταύρος	8.15	2032-05-29	2032-08-07	2024	1099230	2006-01-01	F	3	12	5	Πρέβεζα	2026-04-02 18:05:39.86+00	2026-04-02 18:05:39.86+00	25	116	5	Ελλάδα	\N
818	2018	Παναγιωτοπούλου	Σοφία	Αθανάσιος	8.47	2031-08-09	2031-10-18	2023	1099218	2005-01-01	F	3	7	4	Δράμα	2026-04-02 18:05:38.108+00	2026-04-02 18:05:38.108+00	96	116	4	Ελλάδα	\N
828	2028	Βενέτη	Καλλιόπη	Μανώλης	7.37	2019-03-04	2019-05-13	2013	1099228	1995-01-01	F	2	3	11	Σάμος	2026-04-02 18:05:39.569+00	2026-04-02 18:05:39.569+00	97	116	11	Ελλάδα	\N
829	2029	Πετρίδης	Ιάκωβος	Γρηγόριος	6.91	2012-03-22	2012-01-05	2006	1099229	1988-01-01	M	5	17	2	Κιλκίς	2026-04-02 18:05:39.714+00	2026-04-02 18:05:39.714+00	98	116	2	Ελλάδα	\N
\.


--
-- TOC entry 3484 (class 0 OID 24745)
-- Dependencies: 222
-- Data for Name: program_directions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.program_directions (id, study_program_id, code, name_el, name_en, is_active) FROM stdin;
7	3	Κ1	Αλγοριθμικές Θεμελιώσεις και Ευφυής Υπολογιστική	\N	t
8	3	Κ2	Δίκτυα και Επικοινωνίες	\N	t
9	3	Κ3	Τεχνολογία της Πληροφορίας	\N	t
10	3	Κ4	Τεχνολογία Υλικού & Αρχιτεκτονική Υπολογιστών	\N	t
11	3	Κ5	Τεχνολογία και Συστήματα Λογισμικού	\N	t
12	3	Κ6	Ευφυή Συστήματα και Ανάλυση Μεγάλων Δεδομένων	\N	t
13	2	CS	Τομέας Εφαρμογών και Θεμελιώσεων της Επιστήμης των Υπολογιστών	\N	t
4	2	HW	Τομέας Υλικού & Αρχιτεκτονικής	Hardware and Systems	t
3	2	SW	Τομέας Λογισμικού	Software Engineering	t
14	4	CS	Τομέας Εφαρμογών και Θεμελιώσεων της Επιστήμης των Υπολογιστών	\N	f
16	4	SW	Τομέας Λογισμικού	\N	f
15	4	HW	Τομέας Υλικού & Αρχιτεκτονικής	\N	f
17	5	CS	Τομέας Εφαρμογών και Θεμελιώσεων της Επιστήμης των Υπολογιστών	\N	f
18	5	HW	Τομέας Υλικού & Αρχιτεκτονικής	\N	f
19	5	SW	Τομέας Λογισμικού	\N	f
20	6	CS	Τομέας Εφαρμογών και Θεμελιώσεων της Επιστήμης των Υπολογιστών	\N	t
21	6	HW	Τομέας Υλικού & Αρχιτεκτονικής	\N	t
22	6	SW	Τομέας Λογισμικού	\N	t
\.


--
-- TOC entry 3493 (class 0 OID 40961)
-- Dependencies: 231
-- Data for Name: region_aliases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.region_aliases (id, region_id, alias, normalized_alias, alias_type, created_at, updated_at) FROM stdin;
1	81	Δίβρη	διβρη	unresolved	2026-04-01 15:38:39.928+00	2026-04-01 15:38:39.928+00
2	43	Χα	χα	unresolved	2026-04-01 15:54:33.489+00	2026-04-01 15:54:33.489+00
\.


--
-- TOC entry 3486 (class 0 OID 24752)
-- Dependencies: 224
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.regions (id, name, type, parent_id, latitude, longitude, created_at, updated_at, normalized_name, external_ref_id) FROM stdin;
3	Δυτική Μακεδονία	PERIPHERY	116	40.3000000	21.7900000	2026-03-02 17:21:07.589+00	2026-03-02 17:21:07.589+00	δυτικη μακεδονια	\N
5	Ήπειρος	PERIPHERY	116	39.6650000	20.8530000	2026-03-02 17:21:07.671+00	2026-03-02 17:21:07.671+00	ηπειρος	\N
6	Θεσσαλία	PERIPHERY	116	39.6390000	22.4190000	2026-03-02 17:21:07.676+00	2026-03-02 17:21:07.676+00	θεσσαλια	\N
7	Ιόνια Νησιά	PERIPHERY	116	39.6240000	19.9210000	2026-03-02 17:21:07.68+00	2026-03-02 17:21:07.68+00	ιονια νησια	\N
8	Δυτική Ελλάδα	PERIPHERY	116	38.2466000	21.7346000	2026-03-02 17:21:07.682+00	2026-03-02 17:21:07.682+00	δυτικη ελλαδα	\N
9	Στερεά Ελλάδα	PERIPHERY	116	38.9000000	22.4330000	2026-03-02 17:21:07.686+00	2026-03-02 17:21:07.686+00	στερεα ελλαδα	\N
11	Βόρειο Αιγαίο	PERIPHERY	116	39.1000000	26.5500000	2026-03-02 17:21:07.694+00	2026-03-02 17:21:07.694+00	βορειο αιγαιο	\N
12	Νότιο Αιγαίο	PERIPHERY	116	37.4400000	24.9400000	2026-03-02 17:21:07.771+00	2026-03-02 17:21:07.771+00	νοτιο αιγαιο	\N
13	Κρήτη	PERIPHERY	116	35.3387000	25.1442000	2026-03-02 17:21:07.775+00	2026-03-02 17:21:07.775+00	κρητη	\N
15	Ξάνθη	CITY	4	41.1419000	24.8877000	2026-03-21 15:20:00+00	2026-04-02 17:18:55.611+00	ξανθη	\N
17	Θεσσαλονίκη	CITY	2	40.6401000	22.9444000	2026-03-21 15:20:00+00	2026-04-02 17:18:56.192+00	θεσσαλονικη	\N
18	Σέρρες	CITY	2	41.0849000	23.5476000	2026-03-21 15:20:00+00	2026-04-02 17:18:56.482+00	σερρες	\N
20	Κοζάνη	CITY	3	40.3006000	21.7889000	2026-03-21 15:20:00+00	2026-04-02 17:18:57.062+00	κοζανη	\N
21	Πτολεμαΐδα	CITY	3	40.5147000	21.6787000	2026-03-21 15:20:00+00	2026-04-02 17:18:57.352+00	πτολεμαιδα	\N
22	Καστοριά	CITY	3	40.5217000	21.2636000	2026-03-21 15:20:00+00	2026-04-02 17:18:57.642+00	καστορια	\N
24	Άρτα	CITY	5	39.1609000	20.9856000	2026-03-21 15:20:00+00	2026-04-02 17:18:58.222+00	αρτα	\N
25	Πρέβεζα	CITY	5	38.9593000	20.7517000	2026-03-21 15:20:00+00	2026-04-02 17:18:58.511+00	πρεβεζα	\N
26	Λάρισα	CITY	6	39.6390000	22.4191000	2026-03-21 15:20:00+00	2026-04-02 17:18:58.8+00	λαρισα	\N
28	Τρίκαλα	CITY	6	39.5553000	21.7679000	2026-03-21 15:20:00+00	2026-04-02 17:18:59.378+00	τρικαλα	\N
29	Κέρκυρα	CITY	7	39.6243000	19.9217000	2026-03-21 15:20:00+00	2026-04-02 17:18:59.667+00	κερκυρα	\N
30	Ζάκυνθος	CITY	7	37.7870000	20.8999000	2026-03-21 15:20:00+00	2026-04-02 17:18:59.956+00	ζακυνθος	\N
32	Πάτρα	CITY	8	38.2466000	21.7346000	2026-03-21 15:20:00+00	2026-04-02 17:19:00.534+00	πατρα	\N
33	Αγρίνιο	CITY	8	38.6218000	21.4077000	2026-03-21 15:20:00+00	2026-04-02 17:19:00.823+00	αγρινιο	\N
34	Πύργος	CITY	8	37.6751000	21.4410000	2026-03-21 15:20:00+00	2026-04-02 17:19:01.112+00	πυργος	\N
36	Λαμία	CITY	9	38.9000000	22.4333000	2026-03-21 15:20:00+00	2026-04-02 17:19:01.691+00	λαμια	\N
37	Θήβα	CITY	9	38.3250000	23.3189000	2026-03-21 15:20:00+00	2026-04-02 17:19:01.982+00	θηβα	\N
38	Αθήνα	CITY	1	37.9838000	23.7275000	2026-03-21 15:20:00+00	2026-04-02 17:19:02.275+00	αθηνα	\N
40	Λαύριο	CITY	1	37.7145000	24.0565000	2026-03-21 15:20:00+00	2026-04-02 17:19:02.878+00	λαυριο	\N
41	Καλαμάτα	CITY	10	37.0389000	22.1142000	2026-03-21 15:20:00+00	2026-04-02 17:19:03.169+00	καλαματα	\N
42	Κόρινθος	CITY	10	37.9381000	22.9322000	2026-03-21 15:20:00+00	2026-04-02 17:19:03.458+00	κορινθος	\N
44	Μυτιλήνη	CITY	11	39.1077000	26.5553000	2026-03-21 15:20:00+00	2026-04-02 17:19:04.036+00	μυτιληνη	\N
45	Χίος	CITY	11	38.3709000	26.1363000	2026-03-21 15:20:00+00	2026-04-02 17:19:04.325+00	χιος	\N
46	Βαθύ	CITY	11	37.7544000	26.9779000	2026-03-21 15:20:00+00	2026-04-02 17:19:04.615+00	βαθυ	\N
48	Κως	CITY	12	36.8926000	27.2877000	2026-03-21 15:20:00+00	2026-04-02 17:19:05.193+00	κως	\N
49	Ερμούπολη	CITY	12	37.4447000	24.9425000	2026-03-21 15:20:00+00	2026-04-02 17:19:05.483+00	ερμουπολη	\N
51	Χανιά	CITY	13	35.5138000	24.0180000	2026-03-21 15:20:00+00	2026-04-02 17:19:06.061+00	χανια	\N
52	Ρέθυμνο	CITY	13	35.3656000	24.4823000	2026-03-21 15:20:00+00	2026-04-02 17:19:06.351+00	ρεθυμνο	\N
53	Κομοτηνή	CITY	4	41.1192000	25.4053000	2026-03-21 15:20:00+00	2026-04-02 17:19:06.64+00	κομοτηνη	\N
55	Σουφλί	CITY	4	41.1919000	26.2993000	2026-03-21 15:20:00+00	2026-04-02 17:19:07.219+00	σουφλι	\N
56	Βέροια	CITY	2	40.5244000	22.2024000	2026-03-21 15:20:00+00	2026-04-02 17:19:07.508+00	βεροια	\N
57	Γιαννιτσά	CITY	2	40.7919000	22.4075000	2026-03-21 15:20:00+00	2026-04-02 17:19:07.797+00	γιαννιτσα	\N
59	Καλαμαριά	CITY	2	40.5825000	22.9509000	2026-03-21 15:20:00+00	2026-04-02 17:19:08.376+00	καλαμαρια	\N
60	Γρεβενά	CITY	3	40.0833000	21.4278000	2026-03-21 15:20:00+00	2026-04-02 17:19:08.665+00	γρεβενα	\N
61	Σιάτιστα	CITY	3	40.2619000	21.5442000	2026-03-21 15:20:00+00	2026-04-02 17:19:08.954+00	σιατιστα	\N
63	Ηγουμενίτσα	CITY	5	39.5034000	20.2634000	2026-03-21 15:20:00+00	2026-04-02 17:19:09.532+00	ηγουμενιτσα	\N
64	Κόνιτσα	CITY	5	40.0486000	20.7490000	2026-03-21 15:20:00+00	2026-04-02 17:19:09.821+00	κονιτσα	\N
66	Καρδίτσα	CITY	6	39.3649000	21.9219000	2026-03-21 15:20:00+00	2026-04-02 17:19:10.417+00	καρδιτσα	\N
67	Καλαμπάκα	CITY	6	39.7061000	21.6291000	2026-03-21 15:20:00+00	2026-04-02 17:19:10.911+00	καλαμπακα	\N
68	Ελασσόνα	CITY	6	39.8947000	22.1885000	2026-03-21 15:20:00+00	2026-04-02 17:19:11.202+00	ελασσονα	\N
70	Κεφαλονιά	CITY	7	38.1754000	20.5692000	2026-03-21 15:20:00+00	2026-04-02 17:19:11.854+00	κεφαλονια	\N
71	Λευκάδα	CITY	7	38.8303000	20.7044000	2026-03-21 15:20:00+00	2026-04-02 17:19:12.143+00	λευκαδα	\N
72	Ιθάκη	CITY	7	38.3644000	20.7205000	2026-03-21 15:20:00+00	2026-04-02 17:19:12.432+00	ιθακη	\N
74	Αίγιο	CITY	8	38.2486000	22.0819000	2026-03-21 15:20:00+00	2026-04-02 17:19:13.01+00	αιγιο	\N
75	Αμαλιάδα	CITY	8	37.7984000	21.3506000	2026-03-21 15:20:00+00	2026-04-02 17:19:13.3+00	αμαλιαδα	\N
77	Άμφισσα	CITY	9	38.5253000	22.3746000	2026-03-21 15:20:00+00	2026-04-02 17:19:13.878+00	αμφισσα	\N
78	Ιτέα	CITY	9	38.4312000	22.4246000	2026-03-21 15:20:00+00	2026-04-02 17:19:14.171+00	ιτεα	\N
79	Περιστέρι	CITY	1	38.0167000	23.6914000	2026-03-21 15:20:00+00	2026-04-02 17:19:14.461+00	περιστερι	\N
81	Άργος	CITY	10	37.6333000	22.7333000	2026-03-21 15:20:00+00	2026-04-02 17:19:15.04+00	αργος	\N
82	Σπάρτη	CITY	10	37.0736000	22.4297000	2026-03-21 15:20:00+00	2026-04-02 17:19:15.328+00	σπαρτη	\N
83	Λήμνος	CITY	11	39.8749000	25.0587000	2026-03-21 15:20:00+00	2026-04-02 17:19:15.618+00	λημνος	\N
85	Άγιος Ευστράτιος	CITY	11	39.5389000	24.9836000	2026-03-21 15:20:00+00	2026-04-02 17:19:16.196+00	αγιος ευστρατιος	\N
86	Σύρος	CITY	12	37.4447000	24.9425000	2026-03-21 15:20:00+00	2026-04-02 17:19:16.486+00	συρος	\N
87	Νάξος	CITY	12	37.1048000	25.3761000	2026-03-21 15:20:00+00	2026-04-02 17:19:16.775+00	ναξος	\N
89	Ιεράπετρα	CITY	13	35.0097000	25.7420000	2026-03-21 15:20:00+00	2026-04-02 17:19:17.353+00	ιεραπετρα	\N
95	Δημοτική Ενότητα Ναυπλιέων	CITY	10	37.5659229	22.8068782	2026-04-02 18:06:28.95+00	2026-04-02 18:06:28.95+00	δημοτικη ενοτητα ναυπλιεων	nominatim:node:161668036
91	Δημοτική Ενότητα Καλαβρύτων	CITY	8	38.0333853	22.1103931	2026-04-02 15:48:18.676+00	2026-04-02 15:48:18.676+00	δημοτικη ενοτητα καλαβρυτων	nominatim:node:354238800
96	Δράμα	CITY	4	41.1499443	24.1468286	2026-04-02 18:06:29.873+00	2026-04-02 18:06:29.873+00	δραμα	nominatim:node:164626837
97	Σάμος	CITY	11	37.7246162	26.8192919	2026-04-02 18:06:30.812+00	2026-04-02 18:06:30.812+00	σαμος	nominatim:relation:452381
98	Κιλκίς	CITY	2	40.9935874	22.8741455	2026-04-02 18:06:31.891+00	2026-04-02 18:06:31.891+00	κιλκις	nominatim:node:134237444
14	Αλεξανδρούπολη	CITY	4	40.8457000	25.8739000	2026-03-21 15:20:00+00	2026-04-02 17:18:55.314+00	αλεξανδρουπολη	\N
16	Καβάλα	CITY	4	40.9396000	24.4018000	2026-03-21 15:20:00+00	2026-04-02 17:18:55.902+00	καβαλα	\N
19	Κατερίνη	CITY	2	40.2696000	22.5061000	2026-03-21 15:20:00+00	2026-04-02 17:18:56.772+00	κατερινη	\N
23	Ιωάννινα	CITY	5	39.6650000	20.8537000	2026-03-21 15:20:00+00	2026-04-02 17:18:57.932+00	ιωαννινα	\N
27	Βόλος	CITY	6	39.3610000	22.9422000	2026-03-21 15:20:00+00	2026-04-02 17:18:59.089+00	βολος	\N
31	Αργοστόλι	CITY	7	38.1811000	20.4890000	2026-03-21 15:20:00+00	2026-04-02 17:19:00.245+00	αργοστολι	\N
35	Χαλκίδα	CITY	9	38.4636000	23.6022000	2026-03-21 15:20:00+00	2026-04-02 17:19:01.402+00	χαλκιδα	\N
39	Πειραιάς	CITY	1	37.9420000	23.6465000	2026-03-21 15:20:00+00	2026-04-02 17:19:02.588+00	πειραιας	\N
43	Τρίπολη	CITY	10	37.5089000	22.3794000	2026-03-21 15:20:00+00	2026-04-02 17:19:03.747+00	τριπολη	\N
47	Ρόδος	CITY	12	36.4341000	28.2176000	2026-03-21 15:20:00+00	2026-04-02 17:19:04.904+00	ροδος	\N
50	Ηράκλειο	CITY	13	35.3387000	25.1442000	2026-03-21 15:20:00+00	2026-04-02 17:19:05.772+00	ηρακλειο	\N
54	Ορεστιάδα	CITY	4	41.5031000	26.5297000	2026-03-21 15:20:00+00	2026-04-02 17:19:06.93+00	ορεστιαδα	\N
58	Έδεσσα	CITY	2	40.8026000	22.0475000	2026-03-21 15:20:00+00	2026-04-02 17:19:08.086+00	εδεσσα	\N
62	Φλώρινα	CITY	3	40.7810000	21.4095000	2026-03-21 15:20:00+00	2026-04-02 17:19:09.243+00	φλωρινα	\N
65	Μέτσοβο	CITY	5	39.7696000	21.1821000	2026-03-21 15:20:00+00	2026-04-02 17:19:10.11+00	μετσοβο	\N
69	Λάρισσα	CITY	6	39.6390000	22.4191000	2026-03-21 15:20:00+00	2026-04-02 17:19:11.564+00	λαρισσα	\N
73	Μεσολόγγι	CITY	8	38.3692000	21.4297000	2026-03-21 15:20:00+00	2026-04-02 17:19:12.721+00	μεσολογγι	\N
76	Λιβαδειά	CITY	9	38.4350000	22.8739000	2026-03-21 15:20:00+00	2026-04-02 17:19:13.589+00	λιβαδεια	\N
80	Γλυφάδα	CITY	1	37.8622000	23.7583000	2026-03-21 15:20:00+00	2026-04-02 17:19:14.749+00	γλυφαδα	\N
84	Ικαρία	CITY	11	37.6122000	26.2940000	2026-03-21 15:20:00+00	2026-04-02 17:19:15.907+00	ικαρια	\N
88	Θήρα	CITY	12	36.4167000	25.4333000	2026-03-21 15:20:00+00	2026-04-02 17:19:17.064+00	θηρα	\N
90	Σητεία	CITY	13	35.2078000	26.1047000	2026-03-21 15:20:00+00	2026-04-02 17:19:17.642+00	σητεια	\N
99	Δημοτική Ενότητα Διδυμοτείχου	CITY	4	41.3492618	26.4963524	2026-04-02 18:42:13.891+00	2026-04-02 18:42:13.891+00	δημοτικη ενοτητα διδυμοτειχου	nominatim:node:299263306
100	Δημοτική Ενότητα Σάμης	CITY	7	38.2511063	20.6467132	2026-04-02 18:42:14.682+00	2026-04-02 18:42:14.682+00	δημοτικη ενοτητα σαμης	nominatim:node:506700079
101	Νάουσα	CITY	2	40.6305740	22.0696057	2026-04-02 18:42:15.253+00	2026-04-02 18:42:15.253+00	ναουσα	nominatim:node:130167092
102	Δημοτική Ενότητα Ναυπάκτου	CITY	8	38.3926119	21.8287498	2026-04-02 18:42:16.421+00	2026-04-02 18:42:16.421+00	δημοτικη ενοτητα ναυπακτου	nominatim:node:139501068
103	Κάλυμνος	CITY	12	37.0025735	26.9923072	2026-04-02 18:42:17.491+00	2026-04-02 18:42:17.491+00	καλυμνος	nominatim:relation:541100
104	Δημοτική Ενότητα Κυπαρισσίας	CITY	10	37.2510850	21.6690119	2026-04-02 18:42:18.465+00	2026-04-02 18:42:18.465+00	δημοτικη ενοτητα κυπαρισσιας	nominatim:node:193701167
105	Δημοτική Ενότητα Καρλοβασίων	CITY	11	37.7936495	26.6954613	2026-04-02 18:42:19.413+00	2026-04-02 18:42:19.413+00	δημοτικη ενοτητα καρλοβασιων	nominatim:node:275563785
106	Αμύνταιο	CITY	3	40.6897584	21.6790753	2026-04-02 18:42:19.978+00	2026-04-02 18:42:19.978+00	αμυνταιο	nominatim:node:134344382
107	Δήμος Αμαρουσίου	CITY	1	38.0562402	23.8049410	2026-04-02 18:42:20.638+00	2026-04-02 18:42:20.638+00	δημος αμαρουσιου	nominatim:node:5374496212
108	Δημοτική Ενότητα Παλικής	CITY	7	38.2020324	20.4374650	2026-04-02 18:42:21.574+00	2026-04-02 18:42:21.574+00	δημοτικη ενοτητα παλικης	nominatim:node:288822128
109	Δημοτική Ενότητα Δύμης	CITY	8	38.1445824	21.5569637	2026-04-02 18:42:22.319+00	2026-04-02 18:42:22.319+00	δημοτικη ενοτητα δυμης	nominatim:node:286516606
110	Γεωργιούπολη	CITY	13	35.3658584	24.2638890	2026-04-02 18:42:23.591+00	2026-04-02 18:42:23.591+00	γεωργιουπολη	nominatim:node:5212702529
111	Δημοτική Ενότητα Σοφάδων	CITY	6	39.3375294	22.0971809	2026-04-02 18:42:24.517+00	2026-04-02 18:42:24.517+00	δημοτικη ενοτητα σοφαδων	nominatim:node:139710509
112	Φιλιππιάδα	CITY	5	39.2053475	20.8829917	2026-04-02 18:42:25.426+00	2026-04-02 18:42:25.426+00	φιλιππιαδα	nominatim:node:130245092
113	Δήμος Κηφισιάς	CITY	1	38.0736082	23.8082244	2026-04-02 18:42:26.073+00	2026-04-02 18:42:26.073+00	δημος κηφισιας	nominatim:node:2024235425
114	Δήμος Φαρσάλων	CITY	6	39.2949611	22.3847920	2026-04-02 18:42:26.7+00	2026-04-02 18:42:26.7+00	δημος φαρσαλων	nominatim:relation:2246181
115	Πολύγυρος	CITY	2	40.3780400	23.4425494	2026-04-02 18:42:27.623+00	2026-04-02 18:42:27.623+00	πολυγυρος	nominatim:node:135818727
116	Ελλάδα	COUNTRY	\N	39.0742000	21.8243000	2026-04-05 20:49:08.139+00	2026-04-05 20:49:08.139+00	ελλαδα	\N
117	Κύπρος	COUNTRY	\N	35.1264000	33.4299000	2026-04-05 20:49:08.435+00	2026-04-05 20:49:08.435+00	κυπρος	\N
1	Αττική	PERIPHERY	116	37.9838000	23.7275000	2026-03-02 17:21:07.577+00	2026-03-02 17:21:07.577+00	αττικη	\N
2	Κεντρική Μακεδονία	PERIPHERY	116	40.6401000	22.9444000	2026-03-02 17:21:07.585+00	2026-03-02 17:21:07.585+00	κεντρικη μακεδονια	\N
4	Ανατολική Μακεδονία και Θράκη	PERIPHERY	116	41.1200000	25.4050000	2026-03-02 17:21:07.592+00	2026-03-02 17:21:07.592+00	ανατολικη μακεδονια και θρακη	\N
10	Πελοπόννησος	PERIPHERY	116	37.5090000	22.3790000	2026-03-02 17:21:07.69+00	2026-03-02 17:21:07.69+00	πελοποννησος	\N
\.


--
-- TOC entry 3488 (class 0 OID 24756)
-- Dependencies: 226
-- Data for Name: study_programs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.study_programs (id, code, name_el, name_en, is_active, created_at, updated_at) FROM stdin;
4	ΠΠΣ 1980-1998	Πρώτο πρόγραμμα προπτυχιακών σπουδών εισακτέοι 1980-1998	\N	f	2026-03-31 13:27:16.144+00	2026-04-05 16:11:57.623+00
5	ΠΠΣ 1998-2009	Πρόγραμμα προπτυχιακών σπουδών εισακτέοι 1998-2009	\N	f	2026-03-31 13:29:16.012+00	2026-04-05 16:12:51.122+00
6	ΠΠΣ 2009-2014	Πρόγραμμα προπτυχιακών σπουδών εισακτέοι 2009-2014	\N	t	2026-03-31 13:31:37.755+00	2026-04-05 16:13:16.526+00
2	EU_CEID Π2	Πρόγραμμα προπτυχιακών σπουδών εισακτέοι 2014-2021	Computer Engineering & Informatics Curriculum 2015–2021	t	2026-03-04 14:11:28.557497+00	2026-04-05 16:13:39.59+00
3	EU_CEID Π3	Πρόγραμμα προπτυχιακών σπουδών εισακτέοι 2022-σήμερα	\N	t	2026-03-24 18:38:56.845+00	2026-04-05 16:13:50.862+00
\.


--
-- TOC entry 3495 (class 0 OID 40977)
-- Dependencies: 233
-- Data for Name: unresolved_regions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.unresolved_regions (id, raw_name, normalized_raw_name, periphery_id, count, status, canonical_region_id, resolved_by_user_id, created_at, updated_at, country_region_id) FROM stdin;
7	Λάρισα	λαρισα	6	0	pending	\N	\N	2026-04-01 13:35:37.17+00	2026-04-01 14:26:33.154+00	116
8	Βόλος	βολος	6	0	pending	\N	\N	2026-04-01 13:35:37.317+00	2026-04-01 14:26:33.296+00	116
9	Αγρίνιο	αγρινιο	8	0	pending	\N	\N	2026-04-01 13:35:37.465+00	2026-04-01 14:26:33.439+00	116
10	Σέρρες	σερρες	2	0	pending	\N	\N	2026-04-01 13:35:37.612+00	2026-04-01 14:26:33.581+00	116
11	Χανιά	χανια	13	0	pending	\N	\N	2026-04-01 13:35:37.759+00	2026-04-01 14:26:33.723+00	116
12	Τρίκαλα	τρικαλα	6	0	pending	\N	\N	2026-04-01 13:35:37.906+00	2026-04-01 14:26:33.866+00	116
13	Άρτα	αρτα	5	0	pending	\N	\N	2026-04-01 13:35:38.052+00	2026-04-01 14:26:34.008+00	116
14	Καβάλα	καβαλα	4	0	pending	\N	\N	2026-04-01 13:35:38.199+00	2026-04-01 14:26:34.15+00	116
15	Χαλκίδα	χαλκιδα	9	0	pending	\N	\N	2026-04-01 13:35:38.346+00	2026-04-01 14:26:34.292+00	116
16	Καλαμάτα	καλαματα	10	0	pending	\N	\N	2026-04-01 13:35:38.492+00	2026-04-01 14:26:34.434+00	116
17	Ρόδος	ροδος	12	0	pending	\N	\N	2026-04-01 13:35:38.639+00	2026-04-01 14:26:34.576+00	116
18	Κέρκυρα	κερκυρα	7	0	pending	\N	\N	2026-04-01 13:35:38.786+00	2026-04-01 14:26:34.718+00	116
19	Κοζάνη	κοζανη	3	0	pending	\N	\N	2026-04-01 13:35:38.933+00	2026-04-01 14:26:34.86+00	116
20	Αλεξανδρούπολη	αλεξανδρουπολη	4	0	pending	\N	\N	2026-04-01 13:35:39.08+00	2026-04-01 14:26:35.002+00	116
24	Δίβρη	διβρη	10	0	resolved	81	1	2026-04-01 14:36:09.985+00	2026-04-01 15:38:40.652+00	116
25	Χα	χα	10	0	resolved	43	1	2026-04-01 15:46:52.434+00	2026-04-01 15:54:34.212+00	116
26	Καλάβρυτα	καλαβρυτα	8	1	pending	\N	\N	2026-04-02 15:48:10.324+00	2026-04-02 15:48:10.324+00	116
21	Μυτιλήνη	μυτιληνη	11	0	pending	\N	\N	2026-04-01 13:35:39.227+00	2026-04-01 14:26:31.871+00	116
22	Ρέθυμνο	ρεθυμνο	13	0	pending	\N	\N	2026-04-01 13:35:39.374+00	2026-04-01 14:26:32.013+00	116
23	Κατερίνη	κατερινη	2	0	pending	\N	\N	2026-04-01 13:35:39.521+00	2026-04-01 14:26:32.156+00	116
1	Αθήνα	αθηνα	1	0	pending	\N	\N	2026-04-01 13:35:36.281+00	2026-04-01 14:26:32.298+00	116
2	Πάτρα	πατρα	8	0	pending	\N	\N	2026-04-01 13:35:36.43+00	2026-04-01 14:26:32.441+00	116
3	Ηράκλειο	ηρακλειο	13	0	pending	\N	\N	2026-04-01 13:35:36.578+00	2026-04-01 14:26:32.583+00	116
4	Ιωάννινα	ιωαννινα	5	0	pending	\N	\N	2026-04-01 13:35:36.725+00	2026-04-01 14:26:32.726+00	116
5	Πειραιάς	πειραιας	1	0	pending	\N	\N	2026-04-01 13:35:36.875+00	2026-04-01 14:26:32.868+00	116
6	Θεσσαλονίκη	θεσσαλονικη	2	0	pending	\N	\N	2026-04-01 13:35:37.022+00	2026-04-01 14:26:33.01+00	116
\.


--
-- TOC entry 3490 (class 0 OID 24763)
-- Dependencies: 228
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, first_name, last_name, email, password_hash, role, is_active, email_verified, email_verification_token, email_verification_expires, password_reset_token, password_reset_expires, last_seen_at, created_at, updated_at, admin_approved) FROM stdin;
5	E	P	papaioan@ceid.upatras.gr	$2a$10$bHfAql9L8dDj.jonfk3oquY0djDToWufqQUqOUPWgxQJn.k8UwOUO	super_admin	t	t	\N	\N	\N	\N	2026-03-09 00:06:54.628+00	2026-03-08 23:50:07.363+00	2026-03-09 00:06:54.628+00	t
16	up	1069365	up1069365@ac.upatras.gr	$2a$10$1.8IsCDP4BEklu1A0AeWgeBwAtuAa1wWrVMqFltO2LW8Qld/fUQDS	secretariat	t	t	\N	\N	\N	\N	2026-03-27 16:20:08.822+00	2026-03-27 16:20:08.651+00	2026-03-27 16:20:08.822+00	t
1	Super	Admin	admin@alupla.gr	$2a$10$S8Kxk8jRMLVF3cnRgXI.8uaTY3JtxoztL6s24QJ2pIHhN.3J0PFjK	super_admin	t	t	\N	\N	6440975c5718e51dded3a36b9397d19e507245812dab0496fb484361ce07d96c	2026-04-01 01:13:50.879+00	2026-04-06 16:55:13.977+00	2026-03-02 17:50:54.999087+00	2026-04-06 16:55:13.977+00	t
19	secretariat	test	secretariat@test.com	$2a$10$tW56kgxOBneuNZEaamBxXunxcItCp0ePX8LiitJeJQ3DdCB8qK8.S	secretariat	t	t	\N	\N	\N	\N	2026-04-02 22:16:18.989+00	2026-04-02 21:22:19.161+00	2026-04-02 22:16:18.989+00	t
18	admin	test	admin@test.com	$2a$10$YMSTn7YAzQeGWszPvbtIterfIW7jtB/ExiE9yIntVFBS0SB9luTci	super_admin	t	t	\N	\N	\N	\N	2026-04-02 22:30:05.713+00	2026-04-02 21:17:25.862+00	2026-04-02 22:30:05.713+00	t
\.


--
-- TOC entry 3512 (class 0 OID 0)
-- Dependencies: 219
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 1103, true);


--
-- TOC entry 3513 (class 0 OID 0)
-- Dependencies: 221
-- Name: graduates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.graduates_id_seq', 966, true);


--
-- TOC entry 3514 (class 0 OID 0)
-- Dependencies: 223
-- Name: program_directions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.program_directions_id_seq', 23, true);


--
-- TOC entry 3515 (class 0 OID 0)
-- Dependencies: 230
-- Name: region_aliases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.region_aliases_id_seq', 2, true);


--
-- TOC entry 3516 (class 0 OID 0)
-- Dependencies: 225
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.regions_id_seq', 117, true);


--
-- TOC entry 3517 (class 0 OID 0)
-- Dependencies: 227
-- Name: study_programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.study_programs_id_seq', 7, true);


--
-- TOC entry 3518 (class 0 OID 0)
-- Dependencies: 232
-- Name: unresolved_regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.unresolved_regions_id_seq', 26, true);


--
-- TOC entry 3519 (class 0 OID 0)
-- Dependencies: 229
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 21, true);


--
-- TOC entry 3302 (class 2606 OID 24780)
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3304 (class 2606 OID 24782)
-- Name: graduates graduates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.graduates
    ADD CONSTRAINT graduates_pkey PRIMARY KEY (id);


--
-- TOC entry 3306 (class 2606 OID 24784)
-- Name: program_directions program_directions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.program_directions
    ADD CONSTRAINT program_directions_pkey PRIMARY KEY (id);


--
-- TOC entry 3322 (class 2606 OID 40970)
-- Name: region_aliases region_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.region_aliases
    ADD CONSTRAINT region_aliases_pkey PRIMARY KEY (id);


--
-- TOC entry 3310 (class 2606 OID 24786)
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- TOC entry 3313 (class 2606 OID 24788)
-- Name: study_programs study_programs_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.study_programs
    ADD CONSTRAINT study_programs_code_key UNIQUE (code);


--
-- TOC entry 3315 (class 2606 OID 24790)
-- Name: study_programs study_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.study_programs
    ADD CONSTRAINT study_programs_pkey PRIMARY KEY (id);


--
-- TOC entry 3325 (class 2606 OID 40987)
-- Name: unresolved_regions unresolved_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.unresolved_regions
    ADD CONSTRAINT unresolved_regions_pkey PRIMARY KEY (id);


--
-- TOC entry 3317 (class 2606 OID 24792)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3319 (class 2606 OID 24794)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3307 (class 1259 OID 24795)
-- Name: program_directions_study_program_id_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX program_directions_study_program_id_code ON public.program_directions USING btree (study_program_id, code);


--
-- TOC entry 3320 (class 1259 OID 155649)
-- Name: region_aliases_normalized_alias_region_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX region_aliases_normalized_alias_region_id_idx ON public.region_aliases USING btree (normalized_alias, region_id);


--
-- TOC entry 3308 (class 1259 OID 155648)
-- Name: regions_city_scope_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX regions_city_scope_idx ON public.regions USING btree (normalized_name, parent_id, type) WHERE (type = 'CITY'::public.enum_regions_type);


--
-- TOC entry 3311 (class 1259 OID 41001)
-- Name: regions_type_normalized_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX regions_type_normalized_name_idx ON public.regions USING btree (type, normalized_name);


--
-- TOC entry 3323 (class 1259 OID 155650)
-- Name: unresolved_regions_key_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX unresolved_regions_key_idx ON public.unresolved_regions USING btree (normalized_raw_name, periphery_id);


--
-- TOC entry 3326 (class 2606 OID 24796)
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3327 (class 2606 OID 24801)
-- Name: graduates graduates_origin_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.graduates
    ADD CONSTRAINT graduates_origin_region_id_fkey FOREIGN KEY (origin_region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3328 (class 2606 OID 24806)
-- Name: graduates graduates_program_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.graduates
    ADD CONSTRAINT graduates_program_direction_id_fkey FOREIGN KEY (program_direction_id) REFERENCES public.program_directions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3329 (class 2606 OID 24811)
-- Name: graduates graduates_study_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.graduates
    ADD CONSTRAINT graduates_study_program_id_fkey FOREIGN KEY (study_program_id) REFERENCES public.study_programs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3330 (class 2606 OID 24816)
-- Name: program_directions program_directions_study_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.program_directions
    ADD CONSTRAINT program_directions_study_program_id_fkey FOREIGN KEY (study_program_id) REFERENCES public.study_programs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3332 (class 2606 OID 40971)
-- Name: region_aliases region_aliases_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.region_aliases
    ADD CONSTRAINT region_aliases_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3331 (class 2606 OID 24821)
-- Name: regions regions_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3333 (class 2606 OID 40993)
-- Name: unresolved_regions unresolved_regions_canonical_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.unresolved_regions
    ADD CONSTRAINT unresolved_regions_canonical_region_id_fkey FOREIGN KEY (canonical_region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3334 (class 2606 OID 40988)
-- Name: unresolved_regions unresolved_regions_periphery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.unresolved_regions
    ADD CONSTRAINT unresolved_regions_periphery_id_fkey FOREIGN KEY (periphery_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3502 (class 0 OID 0)
-- Dependencies: 3501
-- Name: DATABASE neondb; Type: ACL; Schema: -; Owner: neondb_owner
--

GRANT ALL ON DATABASE neondb TO neon_superuser;


--
-- TOC entry 3503 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: neondb_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- TOC entry 2117 (class 826 OID 32769)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- TOC entry 2116 (class 826 OID 32768)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


-- Completed on 2026-04-06 20:17:24

--
-- PostgreSQL database dump complete
--

\unrestrict hSirh4d4TD243q947Q37aR9tYveFengSJC8F54m2Ct9RWb0UOWLhxvoGeboeNzY

