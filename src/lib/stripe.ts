export async function createCheckoutSession(data: {
  slug: string;
  email: string;
  tripNickname: string;
}): Promise<string> {
  throw new Error("Not implemented yet");
}

export async function verifyStripeSession(sessionId: string): Promise<boolean> {
  throw new Error("Not implemented yet");
}
