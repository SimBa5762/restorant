ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

UPDATE orders o
SET delivered_at = o.created_at
FROM statuses s
WHERE o.status_id = s.id
  AND s.name = 'delivered'
  AND o.delivered_at IS NULL;
