INSERT INTO app_settings (key, value) 
VALUES 
  ('qontak_token', 'nQTL4wS3-zC4oANx9G7NMAo4yZvVF8rQ71vDdUo9GPQ'),
  ('qontak_refresh_token', 'b4R-d13BumHUcnScmoxnW5YeMbl0hn8pzV1pjpXQc8s')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
