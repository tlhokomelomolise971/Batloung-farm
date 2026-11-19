USE batloung_farm_db;

-- Demo A: manual BEGIN / COMMIT / ROLLBACK
-- 2-item sale: item 1 is fine, item 2 wants 10 Large Grapes but only 6 exist.
BEGIN;
UPDATE stock SET available_quantity = available_quantity - 2  WHERE fruit_id = 1 AND packaging_size = 'SMALL';  -- OK
UPDATE stock SET available_quantity = available_quantity - 10 WHERE fruit_id = 5 AND packaging_size = 'LARGE';  -- FAILS (CHECK: no negative stock)
ROLLBACK;   -- run after the error: item 1 is undone too
SELECT fruit_id, packaging_size, available_quantity FROM stock
WHERE (fruit_id=1 AND packaging_size='SMALL') OR (fruit_id=5 AND packaging_size='LARGE');  -- unchanged: 25 and 6

-- Demo B: same idea as a stored procedure that rolls back automatically
DROP PROCEDURE IF EXISTS sp_demo_two_item_sale;
DELIMITER $$
CREATE PROCEDURE sp_demo_two_item_sale()
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SELECT 'ROLLED BACK - no stock changed' AS result;
  END;
  START TRANSACTION;
  UPDATE stock SET available_quantity = available_quantity - 2  WHERE fruit_id = 1 AND packaging_size = 'SMALL';
  UPDATE stock SET available_quantity = available_quantity - 10 WHERE fruit_id = 5 AND packaging_size = 'LARGE';
  COMMIT;
  SELECT 'COMMITTED' AS result;
END$$
DELIMITER ;
CALL sp_demo_two_item_sale();
