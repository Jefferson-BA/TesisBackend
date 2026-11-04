import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class SecurityAndPayments1793740000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasColumn('orders', 'chargeId'))) {
      await runner.addColumn(
        'orders',
        new TableColumn({
          name: 'chargeId',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
    if (!(await runner.hasTable('system_configs'))) {
      await runner.createTable(
        new Table({
          name: 'system_configs',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'key', type: 'varchar', length: '80', isUnique: true },
            { name: 'value', type: 'text' },
            {
              name: 'category',
              type: 'enum',
              enumName: 'system_configs_category_enum',
              enum: ['GENERAL', 'FINANCIAL', 'SECURITY', 'INTEGRATIONS'],
              default: "'GENERAL'",
            },
            {
              name: 'description',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            { name: 'isSecret', type: 'boolean', default: false },
            { name: 'updatedById', type: 'int', isNullable: true },
            {
              name: 'updatedByName',
              type: 'varchar',
              length: '150',
              isNullable: true,
            },
            { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
            { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          ],
        }),
      );
      await runner.createIndex(
        'system_configs',
        new TableIndex({
          name: 'IDX_system_configs_key',
          columnNames: ['key'],
        }),
      );
    }
    if (!(await runner.hasTable('audit_logs'))) {
      await runner.createTable(
        new Table({
          name: 'audit_logs',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'action', type: 'varchar', length: '60' },
            { name: 'entity', type: 'varchar', length: '60' },
            {
              name: 'entityId',
              type: 'varchar',
              length: '100',
              isNullable: true,
            },
            { name: 'performedById', type: 'int' },
            { name: 'performedByName', type: 'varchar', length: '150' },
            { name: 'performedByEmail', type: 'varchar', length: '150' },
            { name: 'performedByRole', type: 'varchar', length: '50' },
            { name: 'ipAddress', type: 'varchar', length: '64' },
            {
              name: 'userAgent',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            { name: 'details', type: 'jsonb', isNullable: true },
            { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          ],
        }),
      );
      for (const column of [
        'action',
        'entity',
        'entityId',
        'performedById',
        'createdAt',
      ]) {
        await runner.createIndex(
          'audit_logs',
          new TableIndex({
            name: `IDX_audit_logs_${column}`,
            columnNames: [column],
          }),
        );
      }
    }
    if (!(await runner.hasTable('payment_attempts'))) {
      await runner.createTable(
        new Table({
          name: 'payment_attempts',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            { name: 'orderId', type: 'int' },
            {
              name: 'status',
              type: 'varchar',
              length: '20',
              default: "'processing'",
            },
            { name: 'amountCents', type: 'int' },
            { name: 'email', type: 'varchar', length: '255' },
            { name: 'chargeId', type: 'varchar', isNullable: true },
            { name: 'createdAt', type: 'timestamptz', default: 'now()' },
            { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          ],
          checks: [
            {
              name: 'CHK_payment_attempt_amount',
              expression: '"amountCents" > 0',
            },
          ],
        }),
      );
      await runner.createIndex(
        'payment_attempts',
        new TableIndex({
          name: 'IDX_payment_attempt_active_order',
          columnNames: ['orderId'],
          isUnique: true,
          where: '"status" <> \'failed\'',
        }),
      );
    }
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.dropTable('payment_attempts', true);
    await runner.dropTable('audit_logs', true);
    await runner.dropTable('system_configs', true);
    await runner.dropColumn('orders', 'chargeId');
  }
}
