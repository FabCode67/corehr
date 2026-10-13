import { splitLines, type JdContent } from "@/lib/jd-content"

/** On-screen / print rendering of a JD in the NCBA master template layout
 *  (same sections and order as the downloadable Word file). */
function Block({ text }: { text: string }) {
  const lines = splitLines(text)
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) =>
        line.startsWith("#") ? (
          <p key={i} className="mt-1 font-semibold">
            {line.replace(/^#+\s*/, "")}
          </p>
        ) : (
          <p key={i} className="flex gap-2 pl-2">
            <span>•</span>
            <span>{line}</span>
          </p>
        )
      )}
    </div>
  )
}

const bar = "border border-black bg-[#E2EFD9] px-2 py-1 font-semibold"
const box = "border border-black px-2 py-1"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className={bar}>{title}</div>
      <div className={`${box} border-t-0`}>{children}</div>
    </div>
  )
}

export function JdDocument({ content: c }: { content: JdContent }) {
  const h = c.header
  const total = c.kras.reduce((s, k) => s + (Number(k.weighting) || 0), 0)
  return (
    <div id="jd-print" className="mx-auto w-full max-w-[816px] bg-white p-8 text-[13px] leading-snug text-black shadow-sm" style={{ fontFamily: '"Century Gothic", "Segoe UI", sans-serif' }}>
      <div className="mb-4 flex justify-end text-2xl font-black tracking-tight">NCBA</div>

      <table className="mb-4 w-full border-collapse">
        <tbody>
          {[
            ["Job Title:", h.jobTitle, "Reports to:", h.reportsTo],
            ["Unit:", h.unit, "Division", h.division],
            ["Grade:", h.grade, "Date:", h.date],
            ["Job holder:", h.jobHolder, "Supervisor:", h.supervisor],
            ["Signature:", "", "Signature:", ""],
          ].map((row, i) => (
            <tr key={i}>
              <td className={`${bar} w-[20%]`}>{row[0]}</td>
              <td className={`${box} w-[30%]`}>{row[1]}</td>
              <td className={`${bar} w-[20%]`}>{row[2]}</td>
              <td className={`${box} w-[30%]`}>{row[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Section title="Job Purpose Statement">
        {splitLines(c.purpose).map((p, i) => (
          <p key={i} className="mb-1.5 text-justify">
            {p}
          </p>
        ))}
      </Section>

      <table className="mb-4 w-full border-collapse">
        <tbody>
          <tr>
            <td colSpan={3} className={bar}>
              Key Result Areas
            </td>
          </tr>
          <tr>
            <td className={`${bar} w-[22%] align-middle`}>Perspective</td>
            <td className={`${bar} w-[13%] text-center`}>
              % Weighting
              <div className="font-normal italic">(to add up to 100%)</div>
            </td>
            <td className={bar}>Output</td>
          </tr>
          {c.kras.map((k, i) => (
            <tr key={i}>
              <td className={`${box} align-top font-semibold`}>{k.perspective}</td>
              <td className={`${box} text-center align-top`}>{k.weighting}%</td>
              <td className={box}>
                <Block text={k.output} />
              </td>
            </tr>
          ))}
          <tr>
            <td className={bar}>Total</td>
            <td className={`${bar} text-center`}>{total}%</td>
            <td className={bar} />
          </tr>
        </tbody>
      </table>

      <div className="mb-4">
        <div className={bar}>Job Dimensions</div>
        <div className={`${box} border-t-0 italic`}>Reporting Relationships: jobs that report to this position directly and indirectly</div>
        <div className="grid grid-cols-[17%_83%]">
          <div className={`${bar} border-t-0`}>Direct Reports</div>
          <div className={`${box} border-l-0 border-t-0`}>{c.directReports}</div>
          <div className={`${bar} border-t-0`}>Indirect Reports</div>
          <div className={`${box} border-l-0 border-t-0`}>{c.indirectReports}</div>
        </div>
        <div className={`${box} border-t-0 italic`}>
          Stakeholder Management: key stakeholders that the position holder will need to liaise/work with to be successful in this role.
        </div>
        <div className="grid grid-cols-2">
          <div className={`${box} border-t-0`}>
            <p className="font-semibold">Internal</p>
            <Block text={c.stakeholdersInternal} />
          </div>
          <div className={`${box} border-l-0 border-t-0`}>
            <p className="font-semibold">External</p>
            <Block text={c.stakeholdersExternal} />
          </div>
        </div>
        <div className={`${box} border-t-0 italic`}>
          Decision Making Authority /Mandates/Constraints: the decisions the position holder is empowered to make (Indicate if it is Operational, Managerial or Strategic)
        </div>
        <div className={`${box} border-t-0`}>
          <Block text={c.decisionAuthority} />
        </div>
        <div className={`${box} border-t-0 italic`}>
          Work cycle and impact: time horizon and nature of impact (Planning)
          <br />
          (e.g. Less than 1 week, 2 weeks, 2 weeks – 1 month, 1month – 3 months, 3-6 months, 6-12 months, above 1 year)
        </div>
        <div className={`${box} border-t-0`}>
          <Block text={c.workCycle} />
        </div>
      </div>

      <Section title="Ideal Job Specifications">
        <Block text={c.specifications} />
      </Section>

      {[
        ["Technical  Competencies", c.technicalCompetencies],
        ["Behavioural  Competencies", c.behaviouralCompetencies],
      ].map(([title, items]) => (
        <div key={title as string} className="mb-4">
          <div className={bar}>{title as string}</div>
          <div className="grid grid-cols-[24%_76%]">
            {(items as JdContent["technicalCompetencies"]).map((it, i) => (
              <div key={i} className="contents">
                <div className={`${box} border-t-0 font-semibold`}>{it.name}</div>
                <div className={`${box} border-l-0 border-t-0`}>{it.description}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="italic">This JD is signed-off with reference having been made to the organisation’s core values and aligned competencies against these values.</p>
      <p className="mt-6 text-xs">JD – {h.jobTitle}</p>
    </div>
  )
}
