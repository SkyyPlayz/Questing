export function buildRegistrationSuccessMessage(email: string): string {
  return `Account created. We sent a verification link to ${email}. Please verify your email before signing in.`;
}
