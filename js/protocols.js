// Mission 01 content. Protocol copy is carried over from the Base44
// "Build an AppSec Roadmap" page (sections 01-04); section 05 BUILD lives in
// roadmap.js because it drives Mission 03.

export const protocols = [
  {
    id: "define",
    number: "01",
    title: "Define",
    subtitle: "Your Strategy and Scope",
    intro: "Know your \"why.\" What value does appsec provide? What are you safeguarding?",
    commands: [
      {
        name: "Define Your \"Why\"",
        desc: "What is the #1 objective your AppSec program serves? Rank your drivers: customer trust, breach risk reduction, sales enablement, release velocity, compliance mandate (SOC 2, PCI, FedRAMP, HIPAA). Your top driver shapes every tradeoff."
      },
      {
        name: "Conduct a High-Level Threat Assessment",
        desc: "What are your top 1–3 'crown jewel' systems, ranked by breach impact (revenue loss, regulatory penalty, reputational harm)? If stakeholders disagree on ranking, alignment is your first task.\n\nWhich would an attacker most likely target, and why? (Consider internet exposure, older tech, forgotten apps.)"
      },
      {
        name: "Build Your Application Inventory",
        desc: "Cover known and unknown assets: applications, APIs, the AI layer (LLM endpoints, MCP/agent servers, coding assistants with repo access), and code outside Engineering. Validate completeness with a cloud asset scan or DNS enumeration. Track provenance: source (human/agent/citizen-dev), tool or model, location."
      },
      {
        name: "Meet with Key Partners",
        desc: "* Product Management\n* Engineering/DevOps\n* Risk Management/Compliance/Legal\n\nUnderstand their SDLC, friction points and goals. If Security is organizationally siloed from Engineering, relationship-building is your first initiative, before tools or process changes. Identify shared goals and build from there."
      }
    ],
    checkpoint: {
      question: "Security reports into a different org than Engineering, and the two teams rarely talk. What is your first initiative?",
      choices: [
        { id: "sast", label: "Roll out a SAST scanner across every repository" },
        { id: "relationships", label: "Build relationships with Engineering and identify shared goals" },
        { id: "policy", label: "Publish a secure coding policy and require every team to sign it" },
        { id: "rank", label: "Rank the crown jewels yourself so the program can move quickly" }
      ],
      correctId: "relationships",
      hints: {
        sast: "Tools pushed through a siloed relationship become alerts nobody owns. Relationship-building comes before tools or process changes.",
        policy: "A policy from a team Engineering does not work with becomes a checkbox. Relationship-building comes before process changes.",
        rank: "If stakeholders disagree on the ranking, alignment is your first task. A ranking made alone just creates a second disagreement."
      },
      takeaway: "Know your why, then build the relationships that let you act on it."
    }
  },
  {
    id: "evaluate",
    number: "02",
    title: "Evaluate",
    subtitle: "Operating Maturity, Scale Talent",
    intro: "How does your team operate, scale security expertise, and protect critical assets?",
    commands: [
      {
        name: "Define Your Operating Model & Maturity",
        desc: "Where does most of your AppSec work land today? Most orgs blend all three of these. Identify your org's current baseline and where you want it to move.\n\n[ ] Gatekeeper: Security owns all review and approval. Clear quality bar, but bottlenecks at scale. Often seen in regulated or early-stage programs.\n\n[ ] Internal Consultants: Security team advises on demand; Dev teams request reviews. Security still owns findings and fixes.\n\n[ ] Self-Service Enablers: Security team builds paved roads: automated tools, training. Developers own security outcomes. Exceptions are delegated and audited and anything over 48 hours to approve is a self-inflicted vulnerability. Scales well but requires developer trust and tooling maturity first.\n\nWhere should your baseline shift over the next 12 months, and what must be true to get there?"
      },
      {
        name: "Design a Security Champions Program",
        desc: "Champions bridge Security and Dev by accelerating feedback and context. Define: (1) your goal (e.g. reduce time-to-fix, improve security design); (2) the time ask (secure Engineering manager buy-in before launch); Champion programs fail from unprotected capacity, not lack of interest; (3) your incentive model (recognition, training, conference budget, etc.).\n\nGoal:\n\nAsk:\n\nIncentive:"
      }
    ],
    checkpoint: {
      question: "Your Security Champions program launched with plenty of volunteers, then stalled within a quarter. What is the most likely cause?",
      choices: [
        { id: "interest", label: "Developers were not really interested in security" },
        { id: "capacity", label: "Champions had no protected time because Engineering managers never agreed to the time ask" },
        { id: "incentives", label: "The incentives were not generous enough" },
        { id: "gatekeeper", label: "Security should have kept ownership of every review instead" }
      ],
      correctId: "capacity",
      hints: {
        interest: "The interest was there: you had volunteers. Champion programs fail from unprotected capacity, not lack of interest.",
        incentives: "Recognition and conference budget cannot create hours that do not exist. Secure Engineering manager buy-in on the time ask before launch.",
        gatekeeper: "Pulling every review back to Security is the Gatekeeper model, which bottlenecks at scale. The fix is protecting champion capacity."
      },
      takeaway: "Scale expertise by protecting the time of the people who carry it."
    }
  },
  {
    id: "integrate",
    number: "03",
    title: "Integrate",
    subtitle: "Security Into the Workflow",
    intro: "Embed security, accelerate feedback, reduce friction.",
    commands: [
      {
        name: "Map Your Code Delivery Pipeline",
        desc: "Sketch your typical pipeline and mark where security checks happen today (★) and where the biggest gaps are ( ! )\n\n(Backlog –> Dev –> Git –> CI/CD –> Staging –> Prod)\n\nFor each stage: describe what security steps exist today and possible differences between teams."
      },
      {
        name: "Define Your Remediation Process & SLAs",
        desc: "Identify your remediation bottleneck and focus there. Before publishing SLAs, define what happens when one is missed and who escalates and what formal risk acceptance looks like. To help build trust focus SLAs on:\n\n1. Reachability: From the internet, or via a compromised user or agent.\n\n2. Exploit Context: Public PoC, commoditized, or AI-generated chain. (Requires threat-intel: CISA KEV, VulnCheck KEV)\n\n3. Severity: How bad is it if exploited? CVSS or equivalent.\n\nSeverity tiers and remediation SLAs by priority:",
        table: {
          headers: ["Severity", "P0", "P1", "P2", "P3"],
          rows: [
            ["Critical", "72 hrs", "7 days", "30 days", "—"],
            ["High", "72 hrs", "7 days", "30 days", "60+ days"],
            ["Medium", "—", "7 days", "30-60 days", "track"],
            ["Low", "—", "—", "—", "top of low queue, track"]
          ],
          caption: "P0 = Reachable + Commoditized · P1 = Reachable · P2 = Unreachable · P3 = Track. Re-evaluate LOW when infra or dependencies change."
        }
      },
      {
        name: "Shift Left with Threat Modeling",
        desc: "Define your threat model triggers: new auth flows, data storage changes, third-party integrations, AI/LLM components. Assign a facilitator (AppSec or a trained Champion). Track all design recommendations — untracked is indistinguishable from never asked."
      }
    ],
    checkpoint: {
      question: "A Critical finding is reachable from the internet and has a commoditized public exploit. Using the SLA table, how quickly must it be fixed?",
      choices: [
        { id: "72h", label: "72 hours" },
        { id: "7d", label: "7 days" },
        { id: "30d", label: "30 days" },
        { id: "track", label: "Track it in the backlog" }
      ],
      correctId: "72h",
      hints: {
        "7d": "7 days is P1: reachable, but without a commoditized exploit. A public, commoditized exploit makes this P0.",
        "30d": "30 days is P2, for findings that are not reachable. This one is reachable from the internet.",
        track: "Tracking is P3. Critical, reachable, and commoditized is the most urgent combination in the table."
      },
      takeaway: "Prioritize by reachability and exploit context, not severity alone."
    }
  },
  {
    id: "measure",
    number: "04",
    title: "Measure",
    subtitle: "What Matters",
    intro: "Focus on metrics that drive action and translate your strategy into a concrete plan.",
    commands: [
      {
        name: "Define Your Key Performance Indicators (KPIs)",
        desc: "Pick metrics that drive behavior you want and avoid ones that can be gamed without improving security. Brainstorm 1–2 per tier.\n\n• Leading Examples: % of repos with SAST/SCA enabled paired with false positive rate (target <30%); coverage without signal quality trains developers to ignore alerts. % of internet-facing assets under CART. % of vulnerabilities fixed before merge; set a baseline before committing to a target.\n\n• Lagging Examples: Security backlog. Critical vulnerabilities open beyond SLA. MTTR for critical vulnerabilities. Risk acceptance rate: % of findings with formal sign-off.\n\nAdditionally, consider which metrics would have a high impact for your partners (e.g. Engineering, DevOps, Compliance, etc.) —\n\nPartner metrics: Time to Feedback (scan result after commit — target <15 min in CI). Paved Road Adoption Rate (voluntary use signals usefulness, not mandate). Compliance Coverage Rate (% of required controls with automated checks).\n\nCommit publicly to improving 1–2 metrics. The visibility builds trust with Engineering and leadership."
      }
    ],
    checkpoint: {
      question: "Which of these metrics is hardest to game without actually improving security?",
      choices: [
        { id: "coverage", label: "% of repos with SAST/SCA enabled" },
        { id: "paired", label: "% of repos with SAST/SCA enabled, paired with false positive rate (target <30%)" },
        { id: "count", label: "Total number of vulnerabilities found each quarter" },
        { id: "target-first", label: "% of vulnerabilities fixed before merge, with a target committed before any baseline is measured" }
      ],
      correctId: "paired",
      hints: {
        coverage: "Coverage alone rises when tools are switched on and then ignored. Coverage without signal quality trains developers to ignore alerts.",
        count: "Finding counts move with scanner settings and scope, not with security. Pick metrics that drive the behavior you want.",
        "target-first": "The metric is a good one, but set a baseline before committing to a target. Otherwise the target is a guess."
      },
      takeaway: "Measure what drives action, and commit publicly to one or two metrics."
    }
  }
];

export const totalCommands = protocols.reduce((sum, protocol) => sum + protocol.commands.length, 0);

export function findProtocol(id) {
  return protocols.find((protocol) => protocol.id === id);
}

export function checkAnswer(protocolId, choiceId) {
  const protocol = findProtocol(protocolId);
  if (!protocol) return { correct: false, hint: "Unknown protocol." };
  const correct = protocol.checkpoint.correctId === choiceId;
  return {
    correct,
    hint: correct ? protocol.checkpoint.takeaway : protocol.checkpoint.hints[choiceId] || "That answer does not hold up. Re-read the protocol and try again."
  };
}

// Splits protocol copy into renderable blocks: paragraphs, bullet lists, and option lines.
export function descriptionBlocks(desc) {
  return desc.split("\n\n").map((block) => {
    const lines = block.split("\n");
    if (lines.every((line) => line.startsWith("* "))) return { type: "list", items: lines.map((line) => line.slice(2)) };
    if (block.startsWith("[ ] ")) return { type: "option", text: block.slice(4) };
    if (block.startsWith("• ") || /^\d+\.\s/.test(block)) return { type: "indent", text: block };
    return { type: "paragraph", text: block };
  });
}
