import React from 'react';
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="py-10">
      <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="text-white font-semibold text-xl">Sign in</div>
        <p className="text-zinc-300 text-sm mt-1">
          Use your corporate account to generate and save offsite venue proposals.
        </p>
        <div className="mt-6">
          <SignIn
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </main>
  );
}