(() => {
  'use strict';

  const USER = 'primesgaming7-coder';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menu = $('.menu');
  const nav = $('.nav');

  // Mobile navigation
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const isOpen = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(isOpen));
      nav.classList.toggle('open', isOpen);
    });

    $$('.nav a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }));

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        nav.classList.remove('open');
        menu.setAttribute('aria-expanded', 'false');
        menu.focus();
      }
    });
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Subtle pointer glow on devices with a precise pointer.
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches && !reducedMotion) {
    const aura = $('.pointer-aura');
    if (aura) {
      document.body.classList.add('has-aura');
      window.addEventListener('pointermove', event => {
        aura.style.left = `${event.clientX}px`;
        aura.style.top = `${event.clientY}px`;
      }, { passive: true });
    }
  }

  // Project filters
  const filters = $$('.filter');
  const projects = $$('.project');
  filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });

    const selected = button.dataset.filter || 'all';
    projects.forEach(project => {
      const visible = selected === 'all' || project.dataset.category === selected;
      project.classList.toggle('hidden', !visible);
      project.setAttribute('aria-hidden', String(!visible));
    });
  }));
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));

  // GitHub public profile and repository data. No token or private data is used.
  const formatNumber = value => new Intl.NumberFormat('en').format(Number(value) || 0);
  const setText = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = value;
  };

  async function loadGithub() {
    const status = $('#gh-status');
    const grid = $('#repo-grid');
    if (!status || !grid) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    try {
      const options = {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal
      };
      const [profileResponse, reposResponse] = await Promise.all([
        fetch(`https://api.github.com/users/${USER}`, options),
        fetch(`https://api.github.com/users/${USER}/repos?sort=updated&per_page=100&type=owner`, options)
      ]);

      if (!profileResponse.ok || !reposResponse.ok) {
        if (profileResponse.status === 403 || reposResponse.status === 403) {
          throw new Error('GitHub rate limit reached. Please try again later.');
        }
        throw new Error('Could not load public GitHub data.');
      }

      const [profile, repositories] = await Promise.all([
        profileResponse.json(),
        reposResponse.json()
      ]);

      const avatar = profile.avatar_url || `https://github.com/${USER}.png`;
      ['#github-avatar', '#gh-avatar'].forEach(selector => {
        const image = $(selector);
        if (image) image.src = avatar;
      });

      setText('#gh-name', 'SWAPNIL');
      setText('#gh-login', `@${profile.login || USER} ↗`);
      setText('#gh-bio', profile.bio || 'Building, learning and experimenting.');
      setText('#gh-repos', formatNumber(profile.public_repos));
      setText('#gh-followers', formatNumber(profile.followers));
      setText('#gh-following', formatNumber(profile.following));

      const owned = repositories
        .filter(repository => !repository.fork)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      const stars = owned.reduce((total, repository) => total + (repository.stargazers_count || 0), 0);
      setText('#gh-stars', formatNumber(stars));

      grid.replaceChildren();
      if (!owned.length) {
        const empty = document.createElement('p');
        empty.className = 'repo-empty';
        empty.textContent = 'No public repositories were returned by GitHub.';
        grid.appendChild(empty);
      } else {
        owned.slice(0, 6).forEach(repository => {
          const card = document.createElement('article');
          card.className = 'repo-card';

          const link = document.createElement('a');
          link.href = repository.html_url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.setAttribute('aria-label', `Open ${repository.name} on GitHub`);

          const imageWrap = document.createElement('div');
          imageWrap.className = 'repo-image';
          const image = document.createElement('img');
          image.src = `https://opengraph.githubassets.com/1/${repository.full_name}`;
          image.alt = `${repository.name} repository preview`;
          image.loading = 'lazy';
          image.onerror = () => imageWrap.remove();
          imageWrap.appendChild(image);

          const body = document.createElement('div');
          body.className = 'repo-body';

          const name = document.createElement('div');
          name.className = 'repo-name';
          name.textContent = repository.name;

          const description = document.createElement('p');
          description.className = 'repo-desc';
          description.textContent = repository.description || 'No description added yet.';

          const meta = document.createElement('div');
          meta.className = 'repo-meta';
          [
            repository.language || 'Project',
            `★ ${formatNumber(repository.stargazers_count)}`,
            `⑂ ${formatNumber(repository.forks_count)}`
          ].forEach(value => {
            const item = document.createElement('span');
            item.textContent = value;
            meta.appendChild(item);
          });

          body.append(name, description, meta);
          link.append(imageWrap, body);
          card.appendChild(link);
          grid.appendChild(card);
        });
      }

      status.textContent = `UPDATED ${new Date().toLocaleDateString()}`;
    } catch (error) {
      status.textContent = 'GITHUB DATA UNAVAILABLE';
      grid.replaceChildren();
      const message = document.createElement('p');
      message.className = 'repo-error';
      message.textContent = error.name === 'AbortError'
        ? 'GitHub took too long to respond. Please try again later.'
        : error.message;

      const profileLink = document.createElement('a');
      profileLink.href = `https://github.com/${USER}`;
      profileLink.target = '_blank';
      profileLink.rel = 'noopener noreferrer';
      profileLink.textContent = ' Open GitHub profile ↗';
      message.appendChild(profileLink);
      grid.appendChild(message);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  loadGithub();
  // Refresh public profile counts periodically; GitHub's public API is unauthenticated.
  window.setInterval(() => {
    if (document.visibilityState === 'visible') loadGithub();
  }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadGithub();
  });

  // GSAP is optional: the portfolio remains usable without it.
  window.addEventListener('load', () => {
    const loader = $('.loader');
    const gsap = window.gsap;
    const hideLoader = () => loader?.classList.add('done');

    if (reducedMotion || !gsap) {
      hideLoader();
      $$('.hero-line > span, .hero-line > em').forEach(element => {
        element.style.transform = 'none';
      });
      return;
    }

    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    gsap.to(loader, {
      opacity: 0,
      duration: 0.5,
      delay: 0.8,
      onComplete: hideLoader
    });
    gsap.from('.hero-kicker', { opacity: 0, y: 15, duration: 0.7, delay: 1, ease: 'power3.out' });
    gsap.from('.hero-line > *', {
      yPercent: 115, opacity: 0, duration: 1.15, stagger: 0.12,
      delay: 1.05, ease: 'power4.out'
    });
    gsap.from('.hero-lower', { opacity: 0, y: 20, duration: 0.8, delay: 1.45, ease: 'power3.out' });

    if (window.ScrollTrigger) {
      gsap.utils.toArray('.section-label,.about-title,.work-head,.github-head,.toolkit-layout,.journey-intro,.timeline-row')
        .forEach(element => {
          gsap.from(element, {
            opacity: 0, y: 28, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%' }
          });
        });

      gsap.utils.toArray('.project').forEach((element, index) => {
        gsap.from(element, {
          opacity: 0, y: 35, duration: 0.8, delay: (index % 2) * 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 88%' }
        });
      });

      gsap.to('.hero-orb', {
        yPercent: 18, rotation: 8, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  });
})();
