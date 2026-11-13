import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { seedTheNine } from "@/server/provisioning/the-nine";

export const dynamic = "force-dynamic";

export async function createTheNineSetupAction(formData: FormData): Promise<void> {
  "use server";

  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  const storeEmail = String(formData.get("storeEmail") ?? "").trim();
  const storePassword = String(formData.get("storePassword") ?? "");

  if (!adminName || !adminEmail || !adminPassword || !storeEmail || !storePassword) {
    redirect("/setup?error=All+fields+are+required");
  }
  if (adminPassword.length < 8 || storePassword.length < 8) {
    redirect("/setup?error=Passwords+must+be+at+least+8+characters");
  }

  const existingStoreCount = await prisma.business.count();
  if (existingStoreCount > 0) {
    redirect("/login");
  }

  try {
    await prisma.$transaction((tx) =>
      seedTheNine(tx, {
        adminName,
        adminEmail,
        password: adminPassword,
        storeEmail,
        storePassword,
        storeName: "The Nine Store",
        includeSampleSales: false
      }).then(() => undefined)
    );
  } catch (error) {
    console.error("The Nine setup failed:", error);
    redirect("/setup?error=Setup+failed.+Please+try+again");
  }

  redirect("/login?setup=complete");
}

export default async function SetupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const storeCount = await prisma.business.count();

  if (storeCount > 0) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="w-full max-w-md space-y-7">
        <div className="space-y-2 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-500/30 bg-lime-500/10 text-2xl font-black text-lime-400">
            TN
          </div>
          <h1 className="text-3xl font-black text-white">Set up The Nine</h1>
          <p className="text-sm text-slate-400">Create the two logins you will use in the store.</p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {decodeURIComponent(error)}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
          <form action={createTheNineSetupAction} className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Admin login</h2>
              <p className="mt-1 text-xs text-slate-400">Sales, analytics, menu, rates, and settings.</p>
            </div>
            <Input name="adminName" label="Admin name" placeholder="The Nine Admin" />
            <Input name="adminEmail" label="Admin email" type="email" placeholder="admin@thenine.local" />
            <Input name="adminPassword" label="Admin password" type="password" placeholder="At least 8 characters" />

            <div className="border-b border-slate-800 pb-3 pt-2">
              <h2 className="text-base font-bold text-white">Store login</h2>
              <p className="mt-1 text-xs text-slate-400">Live tables, sessions, and billing.</p>
            </div>
            <Input name="storeEmail" label="Store email" type="email" placeholder="store@thenine.local" />
            <Input name="storePassword" label="Store password" type="password" placeholder="At least 8 characters" />

            <Button type="submit" className="h-12 w-full rounded-xl bg-lime-500 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(132,204,22,0.3)] transition hover:bg-lime-400">
              Create The Nine
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  placeholder,
  type = "text"
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-slate-300">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 transition focus:border-lime-500 focus:outline-none"
        required
      />
    </label>
  );
}
