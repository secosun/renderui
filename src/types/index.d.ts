interface TemplateParam {
  type: string;
  title?: string;
  description?: string;
  default?: number | string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  unit?: string;
}

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  params_schema: {
    properties?: Record<string, TemplateParam>;
    required?: string[];
  };
  tags: string[];
  thumbnail_url?: string;
  created_at: string;
}

interface ParamValues {
  [key: string]: number | string;
}

interface Scene {
  id: string;
  name: string;
  description?: string;
  category?: string;
  thumbnail_url?: string;
}

interface Task {
  id: string;
  user_id: string;
  model_id: string;
  name: string | null;
  prompt: string;
  scene_id: string | null;
  scene_name: string | null;
  status: string;
  intent_json: any;
  storage_path: string;
  result_url: string | null;
  result_urls: string[] | null;
  error_message: string | null;
  progress: number;
  progress_message: string;
  stage_name: string | null;
  stage_progress: number | null;
  eta_seconds: number | null;
  retry_count: number | null;
  created_at: string;
  updated_at: string;
}
