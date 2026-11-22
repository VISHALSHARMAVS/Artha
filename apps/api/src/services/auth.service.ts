import crypto from 'node:crypto';
import { UserRepository, UserRecord } from '../repositories/user.repository.js';
import { AccountRepository } from '../repositories/account.repository.js';
import { Security } from '../lib/security.js';
import { AppError } from '../middleware/error-handler.js';
import { transaction } from '../database/db.js';
import type { RegisterDTO, LoginDTO, AuthResponse } from '@artha/domain';

export class AuthService {
  /**
   * Register a new user account with secure scrypt password hashing.
   * Isolates financial data strictly to the newly created user_id.
   */
  static register(dto: RegisterDTO): AuthResponse {
    return transaction(() => {
      // 1. Check uniqueness of email
      const existing = UserRepository.findByEmail(dto.email);
      if (existing) {
        throw new AppError('An account with this email address already exists. Please sign in.', 409, 'EMAIL_EXISTS');
      }

      // 2. Hash password with cryptographic salt
      const { hash, salt } = Security.hashPassword(dto.password);
      const userId = `usr_${crypto.randomUUID().slice(0, 10)}`;

      // 3. Create user record
      const user = UserRepository.createWithPassword({
        id: userId,
        email: dto.email,
        full_name: dto.full_name,
        password_hash: hash,
        password_salt: salt,
      });

      // 4. Automatically create an initial default account so user can immediately record expenses
      const accountId = `acc_${crypto.randomUUID().slice(0, 8)}`;
      AccountRepository.create({
        id: accountId,
        user_id: userId,
        name: 'Primary Bank Account',
        account_type: 'SAVINGS',
        institution_name: 'Main Bank',
        account_number_mask: '•••• 1001',
        balance_paise: 0,
      });

      // 5. Generate signed JWT token
      const token = Security.generateToken({
        userId: user.id,
        email: user.email,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          currency_code: user.currency_code,
          created_at: user.created_at,
        },
        token,
      };
    });
  }

  /**
   * Authenticates user credentials and returns signed session token.
   */
  static login(dto: LoginDTO): AuthResponse {
    const user = UserRepository.findByEmail(dto.email);
    if (!user) {
      throw new AppError('Invalid email or password. Please verify your credentials.', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = Security.verifyPassword(dto.password, user.password_hash, user.password_salt);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password. Please verify your credentials.', 401, 'INVALID_CREDENTIALS');
    }

    const token = Security.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        currency_code: user.currency_code,
        created_at: user.created_at,
      },
      token,
    };
  }

  static getMe(userId: string): UserRecord {
    const user = UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }
    return user;
  }

  static linkWhatsApp(userId: string, phoneNumber: string): UserRecord {
    try {
      return UserRepository.linkPhoneNumber(userId, phoneNumber);
    } catch (err: any) {
      throw new AppError(err.message, 400, 'PHONE_LINK_ERROR');
    }
  }
}
