/* The facts both views must carry.
 *
 * index.html (terenceOS) and classic.html (the traditional page) present the
 * same portfolio in two layouts. Each view's test checks its page against this
 * one list, so a role, project or link cannot quietly disappear from one view
 * while surviving in the other.
 *
 * Strings here must appear verbatim in both pages. The one thing the views
 * format differently is the date range of each role, so those are kept as data
 * and each test renders them in its own view's style.
 */

module.exports = {
  /* The meta description. Identical in both views. */
  description: 'Terence Zhang is a software engineer and AI research engineer building distributed systems and intelligent tools.',

  /* How the two roles are paired. Both views show it; separators differ. */
  roleLine: 'software engineer · AI research engineer',

  /* The hero slogan. Both views show it; only the line break differs. */
  slogan: { lead: 'Systems at', accent: 'scale.' },

  /* Experience, from the résumé. Each view renders the same facts in its own
     voice: the OS log writes dates as 2025-09 → 2026-02, the traditional page as
     Sep 2025 — Feb 2026. `short` is the abbreviated title the profile card uses.
     `summary` condenses the résumé's bullets for that role, numbers included. */
  roles: [
    {
      title: 'AI Research Engineer', employer: 'Vicino AI', url: 'https://vicino.ai/',
      location: 'Seattle, WA', from: '2025-09', to: '2026-02',
      tags: ['Generative AI', 'Cost-Aware Model Routing', 'Product Engineering'],
      focus: 'Natural-language image editing · model routing',
      summary: 'Built a natural-language AI image editor that edits in seconds, with model routing to balance inference speed against generation cost \u2014 shipped with Shopline to 600K+ merchants.'
    },
    {
      title: 'Founding Engineer', employer: 'Bili Technology', url: 'https://duedash.com/dd/bilitechnologyinc',
      note: 'pre-seed startup', location: 'Seattle, WA', from: '2025-07', to: '2025-09',
      tags: ['Concurrency', 'Developer Tools', 'Infrastructure'],
      focus: 'Version control for AI agents at scale',
      summary: 'Contributed to Parallel Agent Workspace, an AI-native version-control system, and architected PAWLite, a proof-of-concept for coordinating large fleets of agents.'
    },
    {
      title: 'Software Development Engineer I \u2013 II', short: 'SDE II', employer: 'Amazon', url: 'https://www.amazon.com/',
      location: 'Seattle, WA', from: '2022-08', to: '2025-07',
      tags: ['Distributed Systems', 'Cloud Systems', 'Data Platforms'],
      focus: 'Digital asset platform · 50B+ assets',
      summary: "Maintained Amazon's core digital asset repo and pipeline \u2014 50B+ assets, 576B+ requests a year \u2014 and automated a content removal workflow that unblocked a $3.6B goal, cutting processing from 15 minutes to under a second."
    },
    {
      title: 'Automation Developer Intern', employer: 'Millennium Management', url: 'https://www.mlp.com/',
      location: 'New York, NY', from: '2021-06', to: '2021-08',
      tags: ['Web Development', 'Automation', 'Analytics'],
      focus: 'Automation · internal tools',
      summary: 'Built the Swagger-Test-Generator library for automated API test generation, and rebuilt the data comparison GUI in Angular Ant Design with two-way binding.'
    }
  ],

  /* stack.json, grouped by domain. Every tag used on a role must appear here;
     languages are listed in their own right, so they need no matching role tag. */
  stack: [
    ['Languages', ['Java', 'Python', 'C++']],
    ['AI &amp; research', ['Generative AI', 'Cost-Aware Model Routing']],
    ['Systems &amp; infrastructure', ['Distributed Systems', 'Concurrency', 'Infrastructure', 'Cloud Systems', 'Data Platforms', 'Version control systems']],
    ['Product &amp; tooling', ['Developer Tools', 'Product Engineering', 'Web Development', 'Automation', 'Analytics']]
  ],

  /* "2025-09" -> "Sep 2025", for the traditional page's prose dates. */
  monthLabel(ym) {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [year, month] = ym.split('-');
    return `${MONTHS[Number(month) - 1]} ${year}`;
  },

  /* Prose in these lists is compared against markup, so escape what HTML escapes. */
  html: (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;'),

  projects: [
    { name: 'Vicino AI Image Editor', image: 'images/fulls/vicino.png',
      url: 'https://apps.shopline.com/detail?appHandle=public_image_editor' },
    { name: 'Rent Calculator', image: 'images/fulls/rent-calculator.png',
      url: 'https://rent-calculator-gray.vercel.app/' },
    { name: 'Clubby', image: 'images/fulls/clubby.png', url: null }
  ],

  links: [
    'https://github.com/TerenceZhang29',
    'https://www.linkedin.com/in/terence-hantian-zhang/',
    'mailto:hz467@cornell.edu',
    '/files/Terence_Zhang_Resume.pdf'
  ],

  biography: [
    'Enterprise AI Marketing Platform',
    'Cornell University',
    'Cornell Tech',
    'CMSX Backend Lead · Cornell Cup Robotics · CIS TA',
    "Omicron Delta Epsilon · Dean's List ×3"
  ],

  /* Section anchors that exist in both views. The pre-paint redirect in
     index.html carries exactly these across to classic.html. */
  sharedAnchors: ['top', 'about', 'projects', 'experience', 'contact']
};
