import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { createPlatformAdminAction } from "@/features/platform/actions/create-platform-admin-action";
import { Button } from "@/components/ui/button";

export default async function SetupPage() {
  // Check if a platform has already been initialized
  const count = await prisma.organization.count();
  
  if (count > 0) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-500/10 border border-lime-500/30 text-lime-400 text-2xl">
             BB
          </div>
          <h1 className="text-3xl font-black text-white">Ready to Launch?</h1>
          <p className="text-slate-400">
            Create your first Super Admin account to start managing your club or franchise.
          </p>
        </div>

        {/* Setup Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <form action={createPlatformAdminAction} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Club / Business Name</label>
              <input 
                name="businessName"
                type="text" 
                placeholder="e.g. Royal Snooker Club"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-lime-500 focus:outline-none transition" 
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Your Name</label>
              <input 
                name="name"
                type="text" 
                placeholder="Manager Name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-lime-500 focus:outline-none transition" 
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Email Address</label>
              <input 
                name="email"
                type="email" 
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-lime-500 focus:outline-none transition" 
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Password</label>
              <input 
                name="password"
                type="password" 
                placeholder="Min 8 characters"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-lime-500 focus:outline-none transition" 
                required
              />
            </div>

            <Button type="submit" className="w-full h-12 bg-lime-500 hover:bg-lime-400 text-slate-950 font-black text-sm rounded-xl shadow-[0_0_20px_rgba(132,204,22,0.3)] transition">
              Create Platform & Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}