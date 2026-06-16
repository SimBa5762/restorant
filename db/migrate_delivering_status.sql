INSERT INTO statuses (name)
SELECT 'delivering'
WHERE NOT EXISTS (SELECT 1 FROM statuses WHERE name = 'delivering');
