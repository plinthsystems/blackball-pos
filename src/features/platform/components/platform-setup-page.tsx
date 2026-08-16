import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { TemporaryCredential } from "./temporary-credential";

export type TemporaryCredentials = {
  ownerEmail: string;
  ownerPassword: string;
  staffEmail: string | null;
  staffPassword: string | null;
};

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

export type PlatformSetupSummary = {
  organizations: number;
  franchisees: number;
  outlets: number;
  plans: number;
};

export type SetupOutletSummary = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  createdAt: Date | string;
  organization: {
    name: string;
    type: "INDEPENDENT_SAAS" | "FRANCHISE";
  } | null;
  franchisee: {
    name: string;
    email: string | null;
  } | null;
  subscriptions: Array<{
    status: string;
    plan: { name: string };
  }>;
  employees: Array<{
    email: string;
    accountType: "PLATFORM_ADMIN" | "HQ_ADMIN" | "STORE_OWNER" | "MANAGER" | "STORE_USER";
  }>;
};

type PlatformSetupPageProps = {
  organizations: PlatformSetupOrganization[];
  summary?: PlatformSetupSummary;
};

type SaasSetupPageProps = {
  plans: PlatformSetupPlan[];
  recentOutlets: SetupOutletSummary[];
  createdOutlet?: SetupOutletSummary | null;
  temporaryCredentials?: TemporaryCredentials | null;
  createSaasAction?: (formData: FormData) => void | Promise<void>;
};

type FranchiseSetupPageProps = {
  plans: PlatformSetupPlan[];
  organizations: PlatformSetupOrganization[];
  recentOutlets: SetupOutletSummary[];
  createdOutlet?: SetupOutletSummary | null;
  temporaryCredentials?: TemporaryCredentials | null;
  createFranchiseAction?: (formData: FormData) => void | Promise<void>;
};

const noopAction = async () => undefined;

const operatingModels = [
  {
    icon: "store",
    title: "Sell as SaaS",
    owner: "Independent club owner",
    creates: "Organization, first outlet, owner login, staff login, subscription",
    visibility: "Tenant users see only their own club data",
    href: "/platform/setup/saas",
    action: "Create SaaS Club"
  },
  {
    icon: "domain",
    title: "Manage owned outlets",
    owner: "Your own cafes and future businesses",
    creates: "One organization with multiple outlets and store teams",
    visibility: "Owner compares outlets; staff stay outlet-scoped",
    href: "/platform/setup/saas",
    action: "Create Owned Outlet"
  },
  {
    icon: "account_tree",
    title: "Run franchise network",
    owner: "Franchisor, franchisees, outlet managers",
    creates: "Franchise brand, franchisee, outlet, royalty rule, subscription",
    visibility: "HQ sees the network; franchisees see their own outlets",
    href: "/platform/setup/franchise",
    action: "Create Franchise Outlet"
  }
];

const accessRows = [
  ["Platform Admin", "All tenants, plans, subscriptions, setup actions"],
  ["Franchise HQ", "All outlets inside their franchise organization"],
  ["Franchisee Owner", "Only outlets attached to their franchisee account"],
  ["Store Owner / Manager", "Assigned outlet or organization stores"],
  ["Staff", "Live floor, billing, food items, and daily operations"]
];

const saasCreates = [
  "Independent tenant organization",
  "First outlet with default tables",
  "Store owner login",
  "Optional staff login",
  "Subscription plan",
  "Default rates and Food/Menu items"
];

const franchiseCreates = [
  "Franchise brand organization",
  "Franchisee account",
  "Outlet scoped to franchisee",
  "Franchisee owner login",
  "Subscription plan",
  "Royalty rule"
];

export function PlatformSetupPage({ organizations, summary }: PlatformSetupPageProps) {
  const metrics = [
    { label: "Organizations", value: summary?.organizations ?? organizations.length },
    { label: "Franchisees", value: summary?.franchisees ?? 0 },
    { label: "Outlets", value: summary?.outlets ?? 0 },
    { label: "Plans", value: summary?.plans ?? 0 }
  ];

  return (
    <div className="space-y-6 text-slate-100">
      <section className="rounded-[8px] border border-cyan-300/20 bg-slate-950 p-5 shadow-[0_0_38px_rgba(34,211,238,0.08)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Platform operations</p>
            <h1 className="mt-2 text-3xl font-black text-white">Enterprise Setup Home</h1>
            <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-300">
              Choose how the tenant will use the software, then open the matching setup flow. This keeps the demo clean and makes
              SaaS, owned-outlet, and franchise onboarding easy to explain.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {metrics.map((metric) => (
              <Metric key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-slate-700 bg-slate-950 p-5">
        <SectionHeader
          icon="conversion_path"
          eyebrow="Commercial model"
          title="Operating models"
          text="Pick the customer type first. The hierarchy, data access, billing, and setup action follow from that choice."
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {operatingModels.map((model) => (
            <article key={model.title} className="rounded-[8px] border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 p-2 text-[22px] text-cyan-300">
                  {model.icon}
                </span>
                <div>
                  <h2 className="text-lg font-black text-white">{model.title}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-cyan-200">{model.owner}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <InfoRow label="Creates" value={model.creates} />
                <InfoRow label="Visibility" value={model.visibility} />
              </dl>
              <Link
                href={model.href}
                className="mt-5 inline-flex h-10 items-center justify-center rounded-[8px] bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200"
              >
                {model.action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[8px] border border-slate-700 bg-slate-950 p-5">
          <SectionHeader
            icon="lan"
            eyebrow="Tenant hierarchy"
            title="Hierarchy and data scope"
            text="Every record belongs to a level. Higher levels can supervise lower levels; store teams only operate their assigned outlet."
          />
          <div className="mt-5 rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 p-4">
            <p className="text-sm font-black text-cyan-100">Platform Owner -&gt; Organization/Brand -&gt; Franchisee -&gt; Outlet -&gt; Store Team</p>
          </div>
          <div className="mt-5 grid gap-2">
            {["Platform Owner", "Organization/Brand", "Franchisee", "Outlet", "Store Team"].map((level, index) => (
              <div key={level} className="flex items-center gap-3 rounded-[8px] border border-slate-800 bg-slate-900 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-cyan-200">
                  {index + 1}
                </span>
                <span className="text-sm font-black text-white">{level}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-slate-700 bg-slate-950 p-5">
          <SectionHeader
            icon="admin_panel_settings"
            eyebrow="Access matrix"
            title="Who sees what"
            text="Use this as the demo answer when someone asks how SaaS tenants, franchisees, managers, and staff are separated."
          />
          <div className="mt-5 overflow-hidden rounded-[8px] border border-slate-800">
            {accessRows.map(([role, scope]) => (
              <div key={role} className="grid gap-2 border-b border-slate-800 bg-slate-900 p-3 last:border-b-0 md:grid-cols-[180px_1fr]">
                <p className="text-sm font-black text-white">{role}</p>
                <p className="text-sm font-medium leading-5 text-slate-300">{scope}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function PlatformSaasSetupPage({
  plans,
  recentOutlets,
  createdOutlet,
  temporaryCredentials,
  createSaasAction = noopAction
}: SaasSetupPageProps) {
  const standardPlans = plans.filter((plan) => !plan.code.includes("franchise"));

  return (
    <SetupFlowShell
      eyebrow="Independent SaaS tenant"
      title="SaaS Club Setup"
      text="Create a sellable software tenant for one snooker club. The outlet is ready with default tables, PS5 stations, rates, food items, and logins."
    >
      {createdOutlet ? <SuccessPanel outlet={createdOutlet} mode="saas" password={temporaryCredentials?.ownerPassword} /> : null}
      {temporaryCredentials ? <TemporaryCredentialsPanel credentials={temporaryCredentials} /> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PlaybookPanel title="Create SaaS club" icon="add_business" checklist={saasCreates}>
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
        </PlaybookPanel>
        <RecentOutletsPanel title="Recent SaaS tenants" outlets={recentOutlets} emptyText="No SaaS tenants created yet." />
      </div>
      <NextSteps />
    </SetupFlowShell>
  );
}

export function PlatformFranchiseSetupPage({
  plans,
  organizations,
  recentOutlets,
  createdOutlet,
  temporaryCredentials,
  createFranchiseAction = noopAction
}: FranchiseSetupPageProps) {
  const franchisePlans = plans.filter((plan) => plan.code.includes("franchise"));
  const franchiseOrganizations = organizations.filter((organization) => organization.type === "FRANCHISE");

  return (
    <SetupFlowShell
      eyebrow="Franchise network"
      title="Franchise Outlet Setup"
      text="Create the franchisor brand, franchisee owner, outlet, subscription, and royalty rule in one controlled flow."
    >
      {createdOutlet ? <SuccessPanel outlet={createdOutlet} mode="franchise" password={temporaryCredentials?.ownerPassword} /> : null}
      {temporaryCredentials ? <TemporaryCredentialsPanel credentials={temporaryCredentials} /> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PlaybookPanel title="Create franchise outlet" icon="hub" checklist={franchiseCreates}>
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
        </PlaybookPanel>
        <RecentOutletsPanel title="Recent franchise outlets" outlets={recentOutlets} emptyText="No franchise outlets created yet." />
      </div>
      <NextSteps />
    </SetupFlowShell>
  );
}

function SetupFlowShell({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: ReactNode }) {
  return (
    <div className="space-y-6 text-slate-100">
      <section className="rounded-[8px] border border-cyan-300/20 bg-slate-950 p-5 shadow-[0_0_38px_rgba(34,211,238,0.08)]">
        <Link href="/platform/setup" className="inline-flex items-center gap-2 text-sm font-black text-cyan-200 hover:text-cyan-100">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to setup home
        </Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-300">{text}</p>
      </section>
      {children}
    </div>
  );
}

function SuccessPanel({
  outlet,
  mode,
  password
}: {
  outlet: SetupOutletSummary;
  mode: "saas" | "franchise";
  password?: string;
}) {
  const owner = outlet.employees.find((employee) => employee.accountType === "STORE_OWNER");
  const staff = outlet.employees.find((employee) => employee.accountType === "STORE_USER");
  const plan = outlet.subscriptions[0]?.plan.name ?? "Subscription";
  const title = mode === "saas" ? `${outlet.name} is ready` : `${outlet.name} franchise outlet is ready`;

  return (
    <section className="rounded-[8px] border border-lime-300/30 bg-lime-300/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-200">Setup completed</p>
          <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {outlet.organization?.name ?? "Tenant"} is on {plan}. Use the owner password shown below (or the default password) for first login and change it after handoff.
          </p>
        </div>
        <Link
          href={`/dashboard?store=${outlet.slug}`}
          className="inline-flex h-10 items-center justify-center rounded-[8px] bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200"
        >
          Open Tenant Dashboard
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <HandoffItem label="Owner login" value={owner?.email ?? outlet.email ?? "Not provided"} />
        <HandoffItem label="Staff login" value={staff?.email ?? "Not created"} />
        <HandoffItem label="Owner password" value={password ?? "Password@123"} />
        {outlet.franchisee ? <HandoffItem label="Franchisee" value={outlet.franchisee.name} /> : null}
      </div>
    </section>
  );
}

function TemporaryCredentialsPanel({ credentials }: { credentials: TemporaryCredentials }) {
  return (
    <section className="rounded-[8px] border border-amber-400/30 bg-amber-400/5 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">One-time credentials</p>
      <p className="mt-1 text-sm font-semibold text-slate-300">
        Copy these now — they are shown only once and expire in 30 minutes.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <TemporaryCredential label={`Owner login · ${credentials.ownerEmail}`} value={credentials.ownerPassword} />
        {credentials.staffEmail && credentials.staffPassword ? (
          <TemporaryCredential label={`Staff login · ${credentials.staffEmail}`} value={credentials.staffPassword} />
        ) : null}
      </div>
    </section>
  );
}

function RecentOutletsPanel({ title, outlets, emptyText }: { title: string; outlets: SetupOutletSummary[]; emptyText: string }) {
  return (
    <aside className="rounded-[8px] border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {outlets.length === 0 ? (
          <p className="rounded-[8px] border border-slate-800 bg-slate-950 p-3 text-sm font-medium text-slate-400">{emptyText}</p>
        ) : (
          outlets.map((outlet) => (
            <div key={outlet.id} className="rounded-[8px] border border-slate-800 bg-slate-950 p-3">
              <p className="text-sm font-black text-white">{outlet.name}</p>
              <p className="mt-1 text-xs font-semibold text-cyan-200">{outlet.organization?.name ?? "No organization"}</p>
              <p className="mt-2 text-xs font-medium text-slate-400">{formatDate(outlet.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function NextSteps() {
  return (
    <section className="rounded-[8px] border border-slate-700 bg-slate-950 p-5">
      <SectionHeader
        icon="key"
        eyebrow="Handoff"
        title="First day checklist"
        text="Use this order during the demo or real customer handoff."
      />
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <FlowStep title="1. Owner login" text="Owner signs in with the generated email and default password." />
        <FlowStep title="2. Configure outlet" text="Owner updates branding, rates, tables, and Food/Menu." />
        <FlowStep title="3. Staff handoff" text="Store staff uses live floor, orders, and billing only." />
        <FlowStep title="4. Review dashboard" text="Owner or HQ monitors revenue, table hours, and category sales." />
      </div>
    </section>
  );
}

function SectionHeader({ icon, eyebrow, title, text }: { icon: string; eyebrow: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined mt-0.5 rounded-[8px] border border-lime-300/25 bg-lime-300/10 p-2 text-[22px] text-lime-300">
        {icon}
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-300">{text}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
      <p className="text-[10px] font-black uppercase text-cyan-200">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold leading-5 text-slate-200">{value}</dd>
    </div>
  );
}

function PlaybookPanel({ title, icon, checklist, children }: { title: string; icon: string; checklist: string[]; children: ReactNode }) {
  return (
    <article className="rounded-[8px] border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined rounded-[8px] border border-amber-300/25 bg-amber-300/10 p-2 text-[22px] text-amber-300">
          {icon}
        </span>
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>
      <div className="mt-4 rounded-[8px] border border-slate-800 bg-slate-950 p-4">
        <h3 className="text-sm font-black text-white">What this creates</h3>
        <ul className="mt-3 grid gap-2 text-sm font-medium text-slate-300 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-lime-300">check_circle</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function Field({ label, name, type = "text", ...props }: { label: string; name: string; type?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        className="h-11 rounded-[8px] border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
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
        className="h-11 rounded-[8px] border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
        defaultValue={options[0]?.id ?? ""}
        required
      >
        {options.length === 0 ? <option value="">No active plans found</option> : null}
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

function HandoffItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-lime-300/20 bg-slate-950/80 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-lime-200">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-white">{value}</p>
    </div>
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
