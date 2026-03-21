export async function submitNewsletter(email: string) {
  return Promise.resolve({ ok: email.includes("@") });
}
