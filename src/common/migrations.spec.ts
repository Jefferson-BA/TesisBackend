import { QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';
import { SecurityAndPayments1793740000000 } from '../migrations/1793740000000-SecurityAndPayments';

describe('Security and payments migration', () => {
  it('creates missing runtime tables and the active-payment uniqueness constraint', async () => {
    const tables: Table[] = [];
    const columns: { table: string; column: TableColumn }[] = [];
    const indexes: { table: string; index: TableIndex }[] = [];
    const runner = {
      hasTable: jest.fn().mockResolvedValue(false),
      hasColumn: jest.fn().mockResolvedValue(false),
      createTable: jest.fn((table: Table) => {
        tables.push(table);
        return Promise.resolve();
      }),
      addColumn: jest.fn((table: string, column: TableColumn) => {
        columns.push({ table, column });
        return Promise.resolve();
      }),
      createIndex: jest.fn((table: string, index: TableIndex) => {
        indexes.push({ table, index });
        return Promise.resolve();
      }),
    };
    await new SecurityAndPayments1793740000000().up(
      runner as unknown as QueryRunner,
    );
    expect(tables.map((table) => table.name)).toEqual([
      'system_configs',
      'audit_logs',
      'payment_attempts',
    ]);
    expect(
      columns.map((entry) => ({ table: entry.table, name: entry.column.name })),
    ).toEqual([{ table: 'orders', name: 'chargeId' }]);
    expect(
      indexes.find((entry) => entry.table === 'payment_attempts')?.index,
    ).toMatchObject({ isUnique: true, where: '"status" <> \'failed\'' });
    expect(tables[2].checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ expression: '"amountCents" > 0' }),
      ]),
    );
  });
  it('does not recreate tables already present in a synchronized database', async () => {
    const runner = {
      hasTable: jest.fn().mockResolvedValue(true),
      hasColumn: jest.fn().mockResolvedValue(true),
      createTable: jest.fn(),
      addColumn: jest.fn(),
    };
    await new SecurityAndPayments1793740000000().up(
      runner as unknown as QueryRunner,
    );
    expect(runner.createTable).not.toHaveBeenCalled();
    expect(runner.addColumn).not.toHaveBeenCalled();
  });
});
