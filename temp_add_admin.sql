INSERT INTO users (id,email,password,name,role,"createdAt","updatedAt")
SELECT $$00000000-0000-0000-0000-000000000001$$,$$admin@sistema.com$$,$$2a$10$ZrdijgIKNhvwi7mt9LCs1OjGqfrQf9vj4LkDP6rwHpyh5zjidbSUe$$,$$Administrador$$,$$ADMIN$$,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email=$$admin@sistema.com$$);
