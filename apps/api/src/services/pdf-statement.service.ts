import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { getDb, transaction } from '../database/db.js';
import { AppError } from '../middleware/error-handler.js';
import { CategoryService } from './category.service.js';
import { AccountRepository } from '../repositories/account.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { CandidateStatementTransaction } from '@artha/domain';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDateToIso(rawDate: string): string | null {
  const clean = rawDate.trim().replace(/,/g, '');

  // 1. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 2. DD Mon YYYY (e.g. 15 Oct 2024 or 15-Oct-2024 or 15/Oct/2024)
  const monMatch = clean.match(/^(\d{1,2})[/\-\s]+([A-Za-z]{3,9})[/\-\s]+(\d{2,4})$/);
  if (monMatch) {
    let day = parseInt(monMatch[1], 10);
    let monthStr = monMatch[2].toLowerCase();
    let year = parseInt(monMatch[3], 10);
    if (year < 100) year += 2000;
    const month = MONTH_MAP[monthStr];
    if (month && day >= 1 && day <= 31) {
      return `${year}-${month}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    let month = parseInt(ymdMatch[2], 10);
    let day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

function cleanTransactionDescription(raw: string): string {
  let text = raw.trim();

  // Remove common banking noise and transaction identifiers
  text = text.replace(/UPI\/(?:DR|CR)\/\d+\//gi, ' ');
  text = text.replace(/UPI\/\d+\//gi, ' ');
  text = text.replace(/UPI-(?:DR|CR)-/gi, ' ');
  text = text.replace(/BY TRANSFER-INB/gi, 'Transfer ');
  text = text.replace(/TO TRANSFER-UPI/gi, ' ');
  text = text.replace(/TO TRANSFER/gi, 'Transfer ');
  text = text.replace(/ACH\s+[DC]-/gi, ' ');
  text = text.replace(/POS\s+\d{4,8}\s+/gi, ' ');
  text = text.replace(/IMPS\/\w+\/\w+\//gi, ' ');
  text = text.replace(/NEFT\s+(?:CR|DR)[*\-\s]\w+[*\-\s]/gi, ' ');
  text = text.replace(/\b(?:REF|UTR|TXN|CHQ|NO|BR)\b[:\s]*[A-Z0-9]+/gi, ' ');
  text = text.replace(/\b\d{10,22}\b/g, ' '); // Strip long account numbers / reference IDs
  text = text.replace(/[@#][\w.-]+/g, ' '); // Strip handle strings e.g. @hdfcbank
  text = text.replace(/[\/\\]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  if (text.length <= 1) {
    return raw.trim().slice(0, 50) || 'Bank Transaction';
  }

  // Capitalize neatly
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export class PdfStatementService {
  /**
   * Extracts raw text from a bank statement PDF (supporting password protection).
   */
  static async extractPdfText(pdfBuffer: Buffer, password?: string): Promise<string> {
    try {
      const parser = new PDFParse({
        data: pdfBuffer,
        password: password || undefined,
      });

      const res = await parser.getText();
      await parser.destroy();
      return res.text || '';
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('password') || msg.includes('encrypted') || msg.includes('auth')) {
        throw new AppError(
          'This bank statement PDF is password-protected. Please enter the PDF password (e.g., PAN card in uppercase, DOB, or account password) to unlock it.',
          400,
          'PASSWORD_PROTECTED_PDF'
        );
      }
      throw new AppError(`Failed to parse PDF document: ${err?.message || 'Invalid format'}`, 400, 'PDF_PARSE_FAILED');
    }
  }

  /**
   * Parses tabular transactions from bank statement text.
   * Cross-references against user's ledger for automated duplicate detection.
   */
  static async parseStatementPdf(
    fileBase64: string,
    password: string | undefined,
    userId: string,
    accountId?: string
  ): Promise<CandidateStatementTransaction[]> {
    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length === 0) {
      throw new AppError('Empty statement file provided.', 400, 'EMPTY_FILE');
    }

    const rawText = await this.extractPdfText(buffer, password);

    // Detect scanned image-only PDFs where no digital font text layer exists
    if (rawText.trim().length < 20) {
      throw new AppError(
        'This PDF appears to be a scanned document or photograph without embedded digital text streams. Scanned image PDFs require OCR processing. Please upload the official digital e-statement (PDF or CSV) downloaded from your bank portal, or record entries via WhatsApp.',
        422,
        'SCANNED_PDF_DETECTED'
      );
    }

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Group text into transaction blocks starting with dates
    const dateRegex = /^(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}[/\-\s]+[A-Za-z]{3,9}[/\-\s]+\d{2,4}|\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})\b/;
    const blocks: string[] = [];
    let currentBlock = '';

    for (const line of lines) {
      if (dateRegex.test(line)) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = line;
      } else if (currentBlock) {
        // Line continuation for multi-line narration
        currentBlock += ' ' + line;
      }
    }
    if (currentBlock) blocks.push(currentBlock);

    if (blocks.length === 0) {
      throw new AppError(
        'No date-stamped transaction lines could be recognized in this PDF. Please verify that this is a bank account statement, or upload the statement in CSV format.',
        422,
        'NO_TRANSACTIONS_RECOGNIZED'
      );
    }

    // Fetch existing user transactions for duplicate detection
    const db = getDb();
    const existingRows = db.prepare(`
      SELECT transaction_date, amount_paise, type, description 
      FROM transactions 
      WHERE user_id = ?
    `).all(userId) as Array<{ transaction_date: string; amount_paise: number; type: string; description: string }>;

    // Map for fast duplicate lookup
    const existingSet = new Map<string, string>();
    for (const tx of existingRows) {
      const key = `${tx.transaction_date}_${tx.amount_paise}_${tx.type}`;
      existingSet.set(key, tx.description);
    }

    const candidates: CandidateStatementTransaction[] = [];
    let prevBalance: number | null = null;

    for (const block of blocks) {
      const dateMatch = block.match(dateRegex);
      if (!dateMatch) continue;

      const rawDate = dateMatch[1];
      const isoDate = parseDateToIso(rawDate);
      if (!isoDate) continue;

      // Extract all monetary numbers from the block
      // Format: optional currency symbol, digits with optional commas and mandatory or optional decimals
      const amountRegex = /(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})|[0-9]+\.[0-9]{2})/gi;
      const amountMatches = Array.from(block.matchAll(amountRegex));

      if (amountMatches.length === 0) continue;

      // Parse matched numeric values
      const numericValues = amountMatches.map((m) => {
        const cleanVal = m[1].replace(/,/g, '');
        return parseFloat(cleanVal);
      }).filter((v) => !isNaN(v) && v > 0);

      if (numericValues.length === 0) continue;

      // Determine transaction amount and balance
      let txAmount: number;
      let balanceAmt: number | null = null;

      if (numericValues.length >= 2) {
        // Usually: [Transaction Amount, Closing Balance] or [Debit, Credit, Closing Balance]
        txAmount = numericValues[0];
        balanceAmt = numericValues[numericValues.length - 1];
      } else {
        txAmount = numericValues[0];
      }

      if (txAmount <= 0) continue;
      const amountPaise = Math.round(txAmount * 100);

      // Determine transaction type (INCOME vs EXPENSE)
      const blockUpper = block.toUpperCase();
      let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';

      const isCreditExplicit = /\b(CR|CREDIT|BY TRANSFER|SALARY|DEPOSIT|REFUND|CASHBACK|INTEREST)\b/.test(blockUpper);
      const isDebitExplicit = /\b(DR|DEBIT|TO TRANSFER|WITHDRAWAL|WDL|POS|PURCHASE|PAYMENT)\b/.test(blockUpper);

      if (isCreditExplicit && !isDebitExplicit) {
        type = 'INCOME';
      } else if (isDebitExplicit && !isCreditExplicit) {
        type = 'EXPENSE';
      } else if (balanceAmt !== null && prevBalance !== null) {
        // Balance movement delta heuristic
        if (balanceAmt > prevBalance) {
          type = 'INCOME';
        } else {
          type = 'EXPENSE';
        }
      }
      if (balanceAmt !== null) {
        prevBalance = balanceAmt;
      }

      // Extract raw description by removing date and numeric amounts
      let rawDesc = block.replace(dateRegex, ' ');
      for (const m of amountMatches) {
        rawDesc = rawDesc.replace(m[0], ' ');
      }
      rawDesc = rawDesc.replace(/\b(CR|DR|INR|Rs\.?)\b/gi, ' ').trim();
      const cleanDesc = cleanTransactionDescription(rawDesc);

      // Category Suggestion
      const suggestedCategory = CategoryService.suggestCategory(cleanDesc, userId);

      // Duplicate Check
      const lookupKey = `${isoDate}_${amountPaise}_${type}`;
      const duplicateDesc = existingSet.get(lookupKey);
      const isDuplicate = Boolean(duplicateDesc);

      candidates.push({
        temp_id: crypto.randomUUID(),
        date: isoDate,
        raw_description: rawDesc,
        clean_description: cleanDesc,
        type,
        amount_paise: amountPaise,
        category_id: suggestedCategory?.id,
        category_name: suggestedCategory?.name,
        is_potential_duplicate: isDuplicate,
        duplicate_reason: isDuplicate ? `Existing transaction matched on ${isoDate} ("${duplicateDesc}")` : undefined,
        selected: !isDuplicate, // Auto-select only non-duplicates
      });
    }

    return candidates;
  }

  /**
   * Commits approved parsed transactions into the user's ledger atomically.
   */
  static batchImportTransactions(
    userId: string,
    accountId: string,
    transactions: Array<{
      date: string;
      description: string;
      type: 'INCOME' | 'EXPENSE';
      amount_paise: number;
      category_id?: string;
    }>
  ): { imported_count: number; total_amount_paise: number; new_balance_paise: number } {
    const account = AccountRepository.findById(accountId, userId);
    if (!account) {
      throw new AppError('Destination account not found or access denied.', 404, 'ACCOUNT_NOT_FOUND');
    }

    let totalImportedPaise = 0;

    // Atomic SQLite transaction
    transaction(() => {
      for (const tx of transactions) {
        TransactionRepository.create({
          id: crypto.randomUUID(),
          user_id: userId,
          account_id: accountId,
          amount_paise: tx.amount_paise,
          type: tx.type,
          description: tx.description.trim(),
          category_id: tx.category_id || undefined,
          transaction_date: tx.date,
        });

        totalImportedPaise += tx.amount_paise;
      }
    });

    const updatedAccount = AccountRepository.findById(accountId, userId);
    return {
      imported_count: transactions.length,
      total_amount_paise: totalImportedPaise,
      new_balance_paise: updatedAccount?.balance_paise ?? 0,
    };
  }
}
