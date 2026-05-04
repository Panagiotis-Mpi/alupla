// Types που περιγράφουν τα δεδομένα και το state του χάρτη.
export type AgeGroup = "" | "23-26" | "27-30" | "31+";

export type FiltersState = {
  ad_code_like: string;
  student_number_like: string;
  last_name_like: string;
  first_name_like: string;
  father_name_like: string;
  gender: string;
  entry_year_min: string;
  entry_year_max: string;
  birth_year_min: string;
  birth_year_max: string;
  degree_grade_min: string;
  degree_grade_max: string;
  graduation_year: string;
  graduation_date_from: string;
  graduation_date_to: string;
  oath_date_from: string;
  oath_date_to: string;
  study_program_id: string;
  origin_region_id: string;
  origin_municipality_like: string;
  age_group: AgeGroup;
};

export const EMPTY_FILTERS: FiltersState = {
  ad_code_like: "",
  student_number_like: "",
  last_name_like: "",
  first_name_like: "",
  father_name_like: "",
  gender: "",
  entry_year_min: "",
  entry_year_max: "",
  birth_year_min: "",
  birth_year_max: "",
  degree_grade_min: "",
  degree_grade_max: "",
  graduation_year: "",
  graduation_date_from: "",
  graduation_date_to: "",
  oath_date_from: "",
  oath_date_to: "",
  study_program_id: "",
  origin_region_id: "",
  origin_municipality_like: "",
  age_group: "",
};
