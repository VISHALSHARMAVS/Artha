/**
 * Money Value Object for Artha Financial Operating System.
 * 
 * Invariant: Every monetary amount is represented internally as an integer number of paise.
 * 1 INR = 100 paise.
 * Floating-point arithmetic is strictly forbidden in financial calculations.
 */

export class Money {
  readonly paise: number;

  private constructor(paise: number) {
    if (!Number.isInteger(paise)) {
      throw new Error(`Money invariant violation: paise must be an integer, received ${paise}`);
    }
    if (!Number.isFinite(paise)) {
      throw new Error(`Money invariant violation: paise must be finite`);
    }
    this.paise = paise;
  }

  /**
   * Factory: create Money from integer paise.
   */
  static fromPaise(paise: number): Money {
    return new Money(Math.round(paise));
  }

  /**
   * Factory: create Money from decimal Rupee amount.
   * Converts Rupee float to integer paise with deterministic rounding.
   */
  static fromRupees(rupees: number): Money {
    if (isNaN(rupees) || !Number.isFinite(rupees)) {
      throw new Error(`Cannot create Money from invalid rupee value: ${rupees}`);
    }
    return new Money(Math.round(rupees * 100));
  }

  /**
   * Factory: parse a human input string (e.g. "1,23,456.50", " ₹ 500 ", "-120.75").
   */
  static parse(input: string | number): Money {
    if (typeof input === 'number') {
      return Money.fromRupees(input);
    }
    if (typeof input !== 'string') {
      throw new Error(`Cannot parse input of type ${typeof input}`);
    }

    const cleaned = input.replace(/[₹,\s]/g, '').trim();
    if (cleaned === '' || cleaned === '-') {
      return Money.zero();
    }

    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || !Number.isFinite(parsed)) {
      throw new Error(`Invalid monetary string: "${input}"`);
    }

    return Money.fromRupees(parsed);
  }

  static zero(): Money {
    return new Money(0);
  }

  // Arithmetic operations
  add(other: Money): Money {
    return new Money(this.paise + other.paise);
  }

  subtract(other: Money): Money {
    return new Money(this.paise - other.paise);
  }

  multiply(multiplier: number): Money {
    if (isNaN(multiplier) || !Number.isFinite(multiplier)) {
      throw new Error(`Invalid multiplier: ${multiplier}`);
    }
    return new Money(Math.round(this.paise * multiplier));
  }

  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Division by zero in Money calculation');
    }
    if (isNaN(divisor) || !Number.isFinite(divisor)) {
      throw new Error(`Invalid divisor: ${divisor}`);
    }
    return new Money(Math.round(this.paise / divisor));
  }

  percentage(ratePercent: number): Money {
    return this.multiply(ratePercent / 100);
  }

  // Comparisons
  equals(other: Money): boolean {
    return this.paise === other.paise;
  }

  greaterThan(other: Money): boolean {
    return this.paise > other.paise;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.paise >= other.paise;
  }

  lessThan(other: Money): boolean {
    return this.paise < other.paise;
  }

  lessThanOrEqual(other: Money): boolean {
    return this.paise <= other.paise;
  }

  isZero(): boolean {
    return this.paise === 0;
  }

  isPositive(): boolean {
    return this.paise > 0;
  }

  isNegative(): boolean {
    return this.paise < 0;
  }

  abs(): Money {
    return new Money(Math.abs(this.paise));
  }

  negate(): Money {
    return new Money(-this.paise);
  }

  // Serialization & formatting
  toPaise(): number {
    return this.paise;
  }

  toRupees(): number {
    return this.paise / 100;
  }

  /**
   * Formats Money according to the Indian Numbering System (`en-IN`).
   * 
   * Example: 
   * 12345678 paise -> ₹1,23,456.78
   * -45000 paise -> -₹450.00
   */
  format(options: {
    includeSymbol?: boolean;
    includeDecimals?: boolean;
    signed?: boolean;
  } = {}): string {
    const {
      includeSymbol = true,
      includeDecimals = true,
      signed = false,
    } = options;

    const absRupees = Math.abs(this.paise) / 100;
    const formattedNumber = absRupees.toLocaleString('en-IN', {
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0,
    });

    const symbolPrefix = includeSymbol ? '₹' : '';
    
    if (this.paise < 0) {
      return `-${symbolPrefix}${formattedNumber}`;
    }

    if (signed && this.paise > 0) {
      return `+${symbolPrefix}${formattedNumber}`;
    }

    return `${symbolPrefix}${formattedNumber}`;
  }

  /**
   * Converts the monetary amount to written Indian English words.
   * e.g. ₹60,000 -> "Sixty Thousand Rupees"
   * e.g. ₹6,00,000 -> "Six Lakhs Rupees"
   */
  toWords(): string {
    const rupees = Math.floor(Math.abs(this.paise) / 100);
    if (rupees === 0) return 'Zero Rupees';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWordsLessThanThousand = (n: number): string => {
      let str = '';
      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + ' ';
      }
      return str.trim();
    };

    let remaining = rupees;
    let parts: string[] = [];

    // Crores (>= 1,00,00,000)
    if (remaining >= 10000000) {
      const cr = Math.floor(remaining / 10000000);
      parts.push(numToWordsLessThanThousand(cr) + (cr === 1 ? ' Crore' : ' Crores'));
      remaining %= 10000000;
    }

    // Lakhs (>= 1,00,000)
    if (remaining >= 100000) {
      const lk = Math.floor(remaining / 100000);
      parts.push(numToWordsLessThanThousand(lk) + (lk === 1 ? ' Lakh' : ' Lakhs'));
      remaining %= 100000;
    }

    // Thousands (>= 1,000)
    if (remaining >= 1000) {
      const th = Math.floor(remaining / 1000);
      parts.push(numToWordsLessThanThousand(th) + ' Thousand');
      remaining %= 1000;
    }

    // Hundreds & units
    if (remaining > 0) {
      parts.push(numToWordsLessThanThousand(remaining));
    }

    const words = parts.join(' ').trim();
    return `${words} Rupees`;
  }

  toString(): string {
    return this.format();
  }

  toJSON(): number {
    return this.paise;
  }
}
