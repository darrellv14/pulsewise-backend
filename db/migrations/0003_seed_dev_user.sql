-- Seed default development user for local authentication flow.
-- Password plaintext (dev only): dev12345
INSERT INTO users (
  username,
  email,
  password_hash,
  first_name,
  last_name,
  is_active
)
VALUES (
  'devpatient',
  'dev@pulsewise.local',
  '$2b$10$QmRzecCBEih5sWBrnYtLYevTkqgUQJzaqnO.f32e1sfU87Xd8Ha7q',
  'Dev',
  'Patient',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u
JOIN roles r ON r.code = 'patient'
WHERE u.email = 'dev@pulsewise.local'
ON CONFLICT (user_id, role_id) DO NOTHING;
