import { Search, Users2, ShieldCheck, Clock3, FileCheck2, ArrowRight, Filter } from 'lucide-react';

const kpiCards = [
  {
    title: 'PENDING APPROVALS',
    value: '0',
    subtext: 'Items currently waiting for your signature or review.',
    gradient: 'from-orange-100 via-amber-50 to-white',
    iconBg: 'bg-orange-500/15',
    iconColor: 'text-orange-500',
    shadow: 'shadow-[0_18px_45px_-24px_rgba(249,115,22,0.65)]',
    icon: Clock3,
  },
  {
    title: 'CERTIFIED SCORELISTS',
    value: '3',
    subtext: 'Official documents already locked in the certification chain.',
    gradient: 'from-blue-100 via-sky-50 to-white',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-500',
    shadow: 'shadow-[0_18px_45px_-24px_rgba(59,130,246,0.7)]',
    icon: FileCheck2,
  },
  {
    title: 'LEADERSHIP',
    value: '4',
    subtext: 'Executive governance members available for escalations.',
    gradient: 'from-violet-100 via-fuchsia-50 to-white',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-500',
    shadow: 'shadow-[0_18px_45px_-24px_rgba(139,92,246,0.68)]',
    icon: Users2,
  },
  {
    title: 'GOVERNANCE TRAFFIC',
    value: '10',
    subtext: 'Integrity hash',
    gradient: 'from-emerald-100 via-teal-50 to-white',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-500',
    shadow: 'shadow-[0_18px_45px_-24px_rgba(16,185,129,0.65)]',
    icon: ShieldCheck,
  },
];

const pendingActions = [
  {
    title: 'Scorelist approvals',
    description: 'Scorelists currently waiting for your designation stage approval.',
  },
  {
    title: 'Schedule approvals',
    description: 'Schedules that need your governance decision.',
  },
];

const boardMembers = [
  {
    name: 'Saikumar',
    role: 'President',
    email: 'skmrmdrj@gmail.com',
    description: 'Oversees strategic governance and final executive decisions.',
    tags: ['Executive Board', 'Leadership'],
  },
  {
    name: 'Chandrashekar',
    role: 'Vice President',
    email: 'skmrmdrj@gmail.com',
    description: 'Coordinates operations and supports cross-functional leadership priorities.',
    tags: ['Competition Operations', 'Leadership'],
  },
  {
    name: 'Dayakar',
    role: 'Treasurer',
    email: 'skmrmdrj@gmail.com',
    description: 'Leads treasury governance, budget controls, and compliance checks.',
    tags: ['Finance & Compliance', 'Leadership'],
  },
  {
    name: 'Omprakash',
    role: 'Scoring Official',
    email: 'skmrmdrj@gmail.com',
    description: 'Maintains score integrity with board-level reporting support.',
    tags: ['Executive Board'],
  },
  {
    name: 'Aarav',
    role: 'Secretary',
    email: 'skmrmdrj@gmail.com',
    description: 'Handles governance records and board meeting documentation.',
    tags: ['Executive Board', 'Operations'],
  },
  {
    name: 'Rohit',
    role: 'Compliance Lead',
    email: 'skmrmdrj@gmail.com',
    description: 'Monitors policy adherence and escalates integrity exceptions.',
    tags: ['Finance & Compliance', 'Governance'],
  },
  {
    name: 'Karthik',
    role: 'Scheduling Officer',
    email: 'skmrmdrj@gmail.com',
    description: 'Owns schedule routing and approval chain readiness.',
    tags: ['Competition Operations', 'Governance'],
  },
  {
    name: 'Naveen',
    role: 'Board Coordinator',
    email: 'skmrmdrj@gmail.com',
    description: 'Facilitates communication and board task orchestration.',
    tags: ['Leadership', 'Operations'],
  },
];

const tagStyles: Record<string, string> = {
  Leadership: 'bg-violet-100 text-violet-700',
  'Executive Board': 'bg-orange-100 text-orange-700',
  'Competition Operations': 'bg-cyan-100 text-cyan-700',
  'Finance & Compliance': 'bg-emerald-100 text-emerald-700',
  Governance: 'bg-blue-100 text-blue-700',
  Operations: 'bg-pink-100 text-pink-700',
};

const ManagementPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-blue-50 px-4 py-8 sm:px-6 lg:px-10">
      <main className="mx-auto w-full max-w-7xl space-y-8">
        <section className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-[0_24px_60px_-32px_rgba(59,130,246,0.35)] sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Management Board</h1>
          <p className="mt-3 max-w-4xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Unified governance workspace for leadership approvals, coordination, and board directory visibility across all devices.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={`rounded-2xl border border-white/70 bg-gradient-to-br ${card.gradient} p-6 ${card.shadow} transition-transform duration-200 hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold tracking-[0.14em] text-slate-600">{card.title}</p>
                  <span className={`inline-flex rounded-xl p-2.5 ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </span>
                </div>
                <p className="mt-5 text-4xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.subtext}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_24px_55px_-30px_rgba(251,146,60,0.35)] sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Pending Management Actions</h2>
          <div className="mt-6 space-y-4">
            {pendingActions.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-white via-slate-50 to-blue-50 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(249,115,22,0.8)] transition hover:scale-[1.01] hover:from-orange-600 hover:to-amber-600 lg:w-auto"
                >
                  Open
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_26px_60px_-30px_rgba(59,130,246,0.35)] sm:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-slate-900">Management Board Members</h2>
            <p className="text-sm font-medium text-slate-500">Total Board Members: 8</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row">
            <label className="group flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-[0_16px_40px_-28px_rgba(59,130,246,0.6)]">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                placeholder="Search by name, email, designation, or role"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </label>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:w-64">
              <Filter className="h-4 w-4 text-blue-500" />
              <select className="w-full bg-transparent text-sm text-slate-700 focus:outline-none">
                <option>All designations</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {boardMembers.map((member) => (
              <article
                key={`${member.name}-${member.role}`}
                className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-indigo-50 p-5 shadow-[0_18px_45px_-28px_rgba(99,102,241,0.45)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-violet-500 text-base font-bold text-white shadow-[0_14px_30px_-20px_rgba(59,130,246,0.8)]">
                    {member.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{member.name}</p>
                    <p className="text-xs font-medium text-blue-600">{member.role}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-500">{member.email}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{member.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {member.tags.map((tag) => (
                    <span
                      key={`${member.name}-${tag}`}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${tagStyles[tag] ?? 'bg-slate-100 text-slate-700'}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ManagementPage;
