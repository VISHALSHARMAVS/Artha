import { test, describe } from 'node:test';
import assert from 'node:assert';
import { Money } from '../src/money.ts';

describe('Money Value Object', () => {
  test('creates Money from integer paise without floating point issues', () => {
    const m = Money.fromPaise(10050);
    assert.strictEqual(m.toPaise(), 10050);
    assert.strictEqual(m.toRupees(), 100.50);
  });

  test('creates Money from Rupees with deterministic integer rounding', () => {
    const m = Money.fromRupees(150.25);
    assert.strictEqual(m.toPaise(), 15025);
  });

  test('prevents fractional paise creation', () => {
    // 0.1 + 0.2 in JS float is 0.30000000000000004
    const a = Money.fromRupees(0.1); // 10 paise
    const b = Money.fromRupees(0.2); // 20 paise
    const sum = a.add(b);
    assert.strictEqual(sum.toPaise(), 30);
    assert.strictEqual(sum.toRupees(), 0.30);
  });

  test('addition and subtraction', () => {
    const m1 = Money.fromPaise(50000); // ₹500
    const m2 = Money.fromPaise(25000); // ₹250
    assert.strictEqual(m1.add(m2).toPaise(), 75000);
    assert.strictEqual(m1.subtract(m2).toPaise(), 25000);
  });

  test('multiplication and percentage', () => {
    const m = Money.fromPaise(100000); // ₹1,000
    assert.strictEqual(m.multiply(1.18).toPaise(), 118000); // 18% GST
    assert.strictEqual(m.percentage(18).toPaise(), 18000);
  });

  test('formats according to Indian Numbering System', () => {
    const lakh = Money.fromPaise(10000000); // ₹1,00,000
    assert.strictEqual(lakh.format({ includeDecimals: false }), '₹1,00,000');
    assert.strictEqual(lakh.format({ includeDecimals: true }), '₹1,00,000.00');

    const crore = Money.fromPaise(1250000000); // ₹1,25,00,000
    assert.strictEqual(crore.format({ includeDecimals: false }), '₹1,25,00,000');
  });

  test('formats negative amounts properly with sign before symbol', () => {
    const neg = Money.fromPaise(-45000);
    assert.strictEqual(neg.format(), '-₹450.00');
  });

  test('formats signed positive amounts when requested', () => {
    const pos = Money.fromPaise(500000);
    assert.strictEqual(pos.format({ signed: true }), '+₹5,000.00');
  });

  test('parses human input strings safely', () => {
    assert.strictEqual(Money.parse('₹1,500.50').toPaise(), 150050);
    assert.strictEqual(Money.parse(' 2,00,000 ').toPaise(), 20000000);
    assert.strictEqual(Money.parse('150').toPaise(), 15000);
    assert.strictEqual(Money.parse('').toPaise(), 0);
  });
});
