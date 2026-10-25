import { ApiError, wait } from './client';

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export async function login(input: LoginInput): Promise<void> {
  await wait(700);
  if (!input.identifier.trim() || !input.password) {
    throw new ApiError('بيانات الدخول غير صحيحة', 401);
  }
}

export async function loginWithDigitalId(): Promise<void> {
  await wait(700);
}

export async function register(input: RegisterInput): Promise<void> {
  await wait(900);
  if (input.password.length < 8) throw new ApiError('كلمة المرور يجب ألا تقل عن 8 أحرف', 422);
}
