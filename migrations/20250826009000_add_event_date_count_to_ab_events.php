<?php

declare(strict_types=1);

use Handlr\Database\Migrations\BaseMigration;

class Migration_20250826009000_AddEventDateCountToAbEvents extends BaseMigration
{
    public function up(): void
    {
        $this->db->execute(<<<'SQL'
            ALTER TABLE `ab_events`
                ADD COLUMN `event_date` DATE NOT NULL DEFAULT (CURDATE()) AFTER `event`,
                ADD COLUMN `count` INT NOT NULL DEFAULT 1 AFTER `event_date`,
                ADD UNIQUE KEY `uq_ab_events_aggregate` (`ab_test_id`, `variant`, `session_id`, `event`, `event_date`)
        SQL);
    }

    public function down(): void
    {
        $this->db->execute(<<<'SQL'
            ALTER TABLE `ab_events`
                DROP INDEX `uq_ab_events_aggregate`,
                DROP COLUMN `count`,
                DROP COLUMN `event_date`
        SQL);
    }
}
