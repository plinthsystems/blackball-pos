import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { hashPassword } from "@/server/auth/auth-service";

export const dynamic = 'force-dynamic';

async function createPlatformAdminAction(formData: FormData): Promise<void> {
  "use server";

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const businessName = formData.get("businessName") as string;

  if (!name || !email || !password || !businessName) {
    redirect("/setup?error=All+fields+are+required");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: businessName,
          slug: businessName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
          type: "INDEPENDENT_SAAS",
        },
      });

      await tx.employee.create({
        data: {
          email: email,
          passwordHash: hashPassword(password),
          name: name,
          accountType: "PLATFORM_ADMIN",
        },
      });
    });
  } catch (error) {
    console.error("Setup failed:", error);
    redirect("/setup?error=Setup+failed.+Please+try+again.");
  }

  redirect("/login");
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <p>{decodeURIComponent(error)}</p>
          </div>
        )}

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