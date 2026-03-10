INSERT INTO roles (code, label)
VALUES
  ('patient', 'Patient'),
  ('doctor', 'Doctor'),
  ('admin', 'Admin')
ON CONFLICT (code) DO NOTHING;
