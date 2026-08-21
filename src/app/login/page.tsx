import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // If no organization exists, show setup button instead of login form
  const count = await prisma.organization.count();
  
  if (count === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-500/10 border border-lime-500/30 text-lime-400 text-2xl">
             BB
          </div>
          <h1 className="text-3xl font-black text-white">Welcome!</h1>
          <p className="text-slate-400">
            No platform has been set up yet. Create your first Super Admin account to get started.
          </p>
          <div className="pt-4">
            <a href="/setup" className="inline-block w-full h-12 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_20px_rgba(132,204,22,0.3)] transition text-center py-3">
              Create Account & Setup Platform
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <LoginForm />;
}