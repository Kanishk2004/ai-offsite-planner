import React from 'react';
import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="py-10">
      <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="text-white font-semibold text-xl">Create account</div>
        <p className="text-zinc-300 text-sm mt-1">
          Sign up to access your company’s AI Event Concierge.
        </p>
        <div className="mt-6">
          <SignUp />
        </div>
      </div>
    </main>
  );
}

