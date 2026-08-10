import type { InputHTMLAttributes, ReactNode } from "react";

export type PlatformSetupPlan = {
  id: string;
  name: string;
  code: string;
  baseAmount: number;
};

export type PlatformSetupOrganization = {
  id: string;
  name: string;
  slug: string;
  type: "INDEPENDENT_SAAS" | "FRANCHISE";
};

type PlatformSetupPageProps = {
  plans: PlatformSetupPlan[];
  organizations: PlatformSetupOrganization[];
  createSaasAction?: (formData: FormData) => void | Promise<void>;
  createFranchiseAction?: (formData: FormData) => void | Promise<void>;
};

const noopAction = async () => undefined;

export function PlatformSetupPage({
  plans,
  organizations,
  createSaasAction = noopAction,
  createFranchiseAction = noopAction
}: PlatformSetupPageProps) {
  const franchisePlans = plans.filter((plan) => plan.code.includes("franchise"));
  const standardPlans = plans.filter((plan) => !plan.code.includes("franchise"));
  const franchiseOrganizations = organizations.filter((organization) => organization.type === "FRANCHISE");

  return (
    <div className="space-y-6 text-slate-100">
      <section className="rounded-[8px] border border-cyan-300/20 bg-slate-950 p-5 shadow-[0_0_38px_rgba(34,211,238,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Self telling system</p>
            <h1 className="mt-2 text-3xl font-black text-white">Platform Setup</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-300">
              Use this screen as the onboarding console. Pick the business model, create the organization/outlet/accounts in one
              flow, then give the owner their login. Default tables, food items, hourly rates, and billing setup are created
              automatically so the club can run immediately.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Plans" value={plans.length} />
            <Metric label="Brands" value={organizations.length} />
            <Metric label="Default PIN" value="Password@123" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <GuideCard
          icon="store"
          title="Sell to one club"
          accent="emerald"
          steps={[
            "Create one independent SaaS organization.",
            "Create one outlet under that organization.",
            "Give the club owner STORE_OWNER login and staff STORE_USER login.",
            "Bill them monthly or yearly through the selected subscription plan."
          ]}
        />
        <GuideCard
          icon="domain"
          title="Setup my own outlets"
          accent="cyan"
          steps={[
            "Create your own organization as independent SaaS or franchise HQ.",
            "Add each cafe/outlet as a separate store.",
            "Use owner/HQ login to compare sales, table hours, food sales, and staff activity.",
            "Store staff only see the outlet they operate."
          ]}
        />
        <GuideCard
          icon="account_tree"
          title="Setup franchise"
          accent="amber"
          steps={[
            "Create or select the franchise brand.",
            "Create franchisee, outlet, owner login, subscription, and royalty rule.",
            "Franchisor sees all outlets; franchisee sees only their own outlets.",
            "Royalty percent is stored separately from outlet sales and reports."
          ]}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SetupPanel title="Create SaaS club" icon="add_business" tone="emerald">
          <form action={createSaasAction} className="grid gap-4 md:grid-cols-2">
            <Field label="Club or brand name" name="organizationName" placeholder="Royal Cue Club" required />
            <Field label="Outlet name" name="businessName" placeholder="Royal Cue Club - Main Road" required />
            <Field label="Owner email" name="ownerEmail" placeholder="owner@club.com" type="email" required />
            <Field label="Staff email" name="staffEmail" placeholder="staff@club.com" type="email" />
            <SelectField label="Subscription plan" name="planId" options={standardPlans.length ? standardPlans : plans} />
            <div className="md:col-span-2">
              <SubmitButton>Create SaaS setup</SubmitButton>
            </div>
          </form>
        </SetupPanel>

        <SetupPanel title="Create franchise outlet" icon="hub" tone="amber">
          <form action={createFranchiseAction} className="grid gap-4 md:grid-cols-2">
            <Field
              label="Franchise brand"
              name="franchiseBrandName"
              placeholder={franchiseOrganizations[0]?.name ?? "BlackBall Franchise"}
              list="franchise-brands"
              required
            />
            <datalist id="franchise-brands">
              {franchiseOrganizations.map((organization) => (
                <option key={organization.id} value={organization.name} />
              ))}
            </datalist>
            <Field label="Franchisee name" name="franchiseeName" placeholder="Bangalore Central Franchisee" required />
            <Field label="Franchise outlet name" name="businessName" placeholder="BlackBall Indiranagar" required />
            <Field label="Franchisee owner email" name="ownerEmail" placeholder="owner@franchisee.com" type="email" required />
            <Field label="Royalty percent" name="royaltyPercent" placeholder="6" type="number" min="0" max="40" step="0.1" required />
            <SelectField label="Franchise plan" name="planId" options={franchisePlans.length ? franchisePlans : plans} />
            <div className="md:col-span-2">
              <SubmitButton>Create franchise setup</SubmitButton>
            </div>
          </form>
        </SetupPanel>
      </section>

      <section className="rounded-[8px] border border-slate-700 bg-slate-950 p-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-cyan-300">route</span>
          <h2 className="text-lg font-black text-white">How to use after setup</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <FlowStep title="1. Platform admin" text="Creates tenants, outlets, subscriptions, and royalty rules." />
          <FlowStep title="2. HQ/franchise owner" text="Logs in to see all outlets they own and compare performance." />
          <FlowStep title="3. Store owner" text="Manages rates, menu, live tables, PS5 members, and daily billing." />
          <FlowStep title="4. Staff" text="Starts sessions, adds Food, Cigarettes, Beverages, closes bills." />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-24 rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
      <p className="text-[10px] font-black uppercase text-cyan-200">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function GuideCard({ icon, title, steps, accent }: { icon: string; title: string; steps: string[]; accent: "emerald" | "cyan" | "amber" }) {
  const accentClasses = {
    emerald: "border-emerald-300/25 text-emerald-300 bg-emerald-300/10",
    cyan: "border-cyan-300/25 text-cyan-300 bg-cyan-300/10",
    amber: "border-amber-300/25 text-amber-300 bg-amber-300/10"
  };

  return (
    <article className="rounded-[8px] border border-slate-700 bg-slate-950 p-5">
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined rounded-[8px] border p-2 text-[22px] ${accentClasses[accent]}`}>{icon}</span>
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm font-medium leading-5 text-slate-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-black text-cyan-200">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </article>
  );
}

function SetupPanel({ title, icon, tone, children }: { title: string; icon: string; tone: "emerald" | "amber"; children: ReactNode }) {
  const color = tone === "emerald" ? "text-emerald-300 border-emerald-300/30 bg-emerald-300/10" : "text-amber-300 border-amber-300/30 bg-amber-300/10";

  return (
    <section className="rounded-[8px] border border-slate-700 bg-slate-950 p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className={`material-symbols-outlined rounded-[8px] border p-2 text-[22px] ${color}`}>{icon}</span>
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, name, type = "text", ...props }: { label: string; name: string; type?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        className="h-11 rounded-[8px] border border-slate-700 bg-slate-900 px-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
        {...props}
      />
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: PlatformSetupPlan[] }) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-200">
      {label}
      <select
        name={name}
        className="h-11 rounded-[8px] border border-slate-700 bg-slate-900 px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
        defaultValue={options[0]?.id ?? ""}
      >
        {options.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name} - Rs {plan.baseAmount}/mo
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex h-11 items-center justify-center rounded-[8px] bg-lime-300 px-5 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(190,242,100,0.18)] transition hover:bg-lime-200"
    >
      {children}
    </button>
  );
}

function FlowStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[8px] border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-xs font-medium leading-5 text-slate-400">{text}</p>
    </div>
  );
}
