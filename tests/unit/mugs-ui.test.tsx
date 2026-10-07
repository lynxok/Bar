import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../src/db/database';
import { StoreProvider } from '../../src/contexts/StoreContext';
import { BusinessProvider } from '../../src/contexts/BusinessContext';
import { ToastProvider } from '../../src/components/ui/Toast';
import Mugs from '../../src/pages/Mugs';
import { MugFillModal } from '../../src/components/mugs/MugFillModal';
import { DEFAULT_MUG_PROGRAM } from '../../src/lib/mugs';

const wrap = (ui: ReactNode) => render(
  <MemoryRouter><ToastProvider><BusinessProvider><StoreProvider>{ui}</StoreProvider></BusinessProvider></ToastProvider></MemoryRouter>
);

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()));
  localStorage.setItem('bar_user', JSON.stringify({ id: 1, name: 'Nacho', role: 'Superadmin', permissions: [] }));
});

describe('pantalla Vasos y Lockers', () => {
  it('da de alta un vaso para un cliente nuevo y genera su QR', async () => {
    wrap(<Mugs />);
    fireEvent.click(await screen.findByText('Nuevo vaso'));
    const field = (label: string) => screen.getByText(label).parentElement!.querySelector('input')!;
    fireEvent.change(field('DNI del cliente'), { target: { value: '30111222' } });
    await waitFor(() => expect(screen.getByText('Nombre (cliente nuevo)')).toBeTruthy());
    fireEvent.change(field('Nombre (cliente nuevo)'), { target: { value: 'Hans' } });
    fireEvent.click(screen.getByText('Crear vaso y generar QR'));
    await waitFor(async () => expect(await db.mugs.count()).toBe(1));
    const mug = (await db.mugs.toArray())[0];
    expect(mug).toMatchObject({ customerDni: '30111222', customerName: 'Hans', capacityMl: 1000, status: 'active' });
    expect(mug.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(await db.customers.where('dni').equals('30111222').count()).toBe(1);
  });
});

describe('modal de recarga', () => {
  it('busca el vaso por código y arma la línea de recarga', async () => {
    await db.loyaltyConfig.put({ id: 'global', pointValue: 0, tierConfig: [], promotions: [],
      mugProgram: { ...DEFAULT_MUG_PROGRAM, fillProducts: [{ productId: 7, name: 'IPA', pricePerLiter: 6000 }] } });
    await db.mugs.add({ code: 'ABC234', customerDni: '1', customerName: 'Hans', capacityMl: 1000, status: 'active', totalMl: 0, fillCount: 0, createdAt: '' });
    const onAdd = vi.fn();
    render(<MugFillModal isOpen onClose={() => {}} onAdd={onAdd} />);
    fireEvent.change(screen.getByPlaceholderText(/Código del vaso/), { target: { value: 'lynx-mug:abc234' } });
    fireEvent.click(screen.getByText('Buscar'));
    await screen.findByText('Hans');
    fireEvent.click(screen.getByText('Agregar recarga'));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({ price: 6000, qty: 1, mugFill: { mugCode: 'ABC234', volumeMl: 1000 } });
  });
});
