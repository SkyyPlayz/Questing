"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold mb-1">Forgot password</h1>
        {sent ? (
          <div>
            <p className="text-sm text-gray-600 mt-2 mb-6">
              If an account exists for <strong>{email}</strong>, you will receive a reset link shortly.
            </p>
            <Link href="/login" className="text-blue-600 hover:underline text-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-4">
              <Link href="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
