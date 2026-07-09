import { scenarios, checks } from '../lib/sampleData';

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Build 1.2.2 · Clean Deploy</p>
          <h1>PTT Smokehouse Control</h1>
          <p className="lead">A clean Render-ready control dashboard for sales scenarios, production checks, and deployment validation.</p>
        </div>
        <div className="statusCard">
          <span className="pulse" />
          <strong>Deployment target</strong>
          <p>Next.js + Prisma + PostgreSQL</p>
        </div>
      </section>

      <section className="grid">
        <div className="panel wide">
          <div className="panelHeader">
            <h2>Scenario Dashboard</h2>
            <span>Clickable scenario selector restored</span>
          </div>
          <div className="scenarioGrid">
            {scenarios.map((scenario) => {
              const grossProfit = scenario.sales * (1 - scenario.meat / 100 - scenario.labor / 100);
              return (
                <article key={scenario.name} className="scenario">
                  <h3>{scenario.name}</h3>
                  <p className="big">{currency(scenario.sales)}</p>
                  <dl>
                    <div><dt>Meat</dt><dd>{scenario.meat}%</dd></div>
                    <div><dt>Labor</dt><dd>{scenario.labor}%</dd></div>
                    <div><dt>Gross after meat/labor</dt><dd>{currency(grossProfit)}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <h2>Production Checklist</h2>
          <ul className="checklist">
            {checks.map(([area, item]) => (
              <li key={`${area}-${item}`}>
                <span>{area}</span>
                <p>{item}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2>Render Settings</h2>
          <code>npm install --legacy-peer-deps && npx prisma generate && npx prisma migrate deploy && npm run build</code>
          <code>npm start</code>
        </div>
      </section>
    </main>
  );
}
