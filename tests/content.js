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
  roles: [
    { title: 'AI Research Engineer', employer: 'Vicino AI', url: 'https://vicino.ai/', from: 2024, to: null,
      focus: 'Image editing · 3D asset generation' },
    { title: 'Senior Software Development Engineer', employer: 'Bili Technology', url: 'https://duedash.com/dd/bilitechnologyinc', from: 2023, to: 2024,
      focus: 'Version control infrastructure for AI agents' },
    { title: 'Software Development Engineer II', employer: 'Amazon', url: 'https://www.amazon.com/', from: 2022, to: 2023,
      focus: 'Digital asset management at billion-item scale' },
    { title: 'Automation Developer Intern', employer: 'Millennium Management', url: 'https://www.mlp.com/', from: 2021, to: 2022,
      focus: 'Automation · internal tools' }
  ],

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
    'mailto:terencezhang829@gmail.com',
    '/files/Terence_Zhang_Resume.pdf'
  ],

  biography: [
    'Enterprise AI Marketing Platform',
    'Cornell University',
    'Cornell Tech',
    'CMSX · Cup Robotics · CIS Teaching Assistant',
    "Omicron Delta Epsilon · Dean's List"
  ],

  /* Section anchors that exist in both views. The pre-paint redirect in
     index.html carries exactly these across to classic.html. */
  sharedAnchors: ['top', 'about', 'projects', 'experience', 'contact']
};
