import { describe, expect, it } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { db } from '../../src/db/database';
import { StoreProvider, useStore } from '../../src/contexts/StoreContext';

const renders = { products: 0, orders: 0, actionsOnly: 0 };

function ProductsView() {
  const { products } = useStore();
  renders.products++;
  return <div data-testid="p">{products.length}</div>;
}
function OrdersView() {
  const { orders } = useStore();
  renders.orders++;
  return <div data-testid="o">{orders.length}</div>;
}
function ActionsOnly() {
  const { addExpense } = useStore();
  renders.actionsOnly++;
  return <button onClick={() => addExpense({ provider: 'x', description: '', amount: 1, date: '', category: '' })}>x</button>;
}

describe('StoreContext con suscripción selectiva', () => {
  it('solo re-renderiza los componentes que leen la tabla que cambió', async () => {
    const { getByTestId } = render(
      <StoreProvider><ProductsView /><OrdersView /><ActionsOnly /></StoreProvider>
    );
    await waitFor(() => expect(getByTestId('o').textContent).toBe('0'));
    await new Promise(r => setTimeout(r, 100));
    const before = { ...renders };

    await act(async () => {
      await db.orders.add({ tableId: 'T-1', items: [], total: 10, status: 'closed', timestamp: new Date().toISOString() });
      await new Promise(r => setTimeout(r, 100));
    });

    await waitFor(() => expect(getByTestId('o').textContent).toBe('1'));
    expect(renders.orders).toBeGreaterThan(before.orders);
    expect(renders.products).toBe(before.products);
    expect(renders.actionsOnly).toBe(before.actionsOnly);
  });

  it('las acciones siguen funcionando y son estables', async () => {
    let first: any, second: any;
    function Grab() { const s = useStore(); if (!first) first = s.addExpense; else second = s.addExpense; return null; }
    const { rerender } = render(<StoreProvider><Grab /></StoreProvider>);
    rerender(<StoreProvider><Grab /></StoreProvider>);
    expect(second === undefined || second === first).toBe(true);
    await act(async () => { await first({ provider: 'Proveedor', description: '', amount: 5, date: '', category: '' }); });
    expect(await db.expenses.where('provider').equals('Proveedor').count()).toBe(1);
  });
});
