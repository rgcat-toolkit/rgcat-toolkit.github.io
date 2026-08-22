(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('[data-site-header]');
  var navToggle = document.querySelector('[data-nav-toggle]');
  var navPanel = document.querySelector('[data-nav-panel]');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scrollFrame = 0;
  var lastScrollY = window.scrollY;

  if (header) {
    var updateScrollState = function () {
      var currentScrollY = window.scrollY;
      var isScrollingDown = currentScrollY > lastScrollY;
      var isNavOpen = root.classList.contains('has-nav-open');

      root.classList.toggle('has-scrolled', currentScrollY > 8);
      root.classList.toggle('is-header-hidden', isScrollingDown && currentScrollY > header.offsetHeight && !isNavOpen);
      lastScrollY = currentScrollY;
      scrollFrame = 0;
    };

    updateScrollState();

    window.addEventListener('scroll', function () {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(updateScrollState);
    }, { passive: true });
  }

  if (navToggle && navPanel) {
    var closeNav = function () {
      navPanel.classList.remove('is-open');
      root.classList.remove('has-nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open navigation');
    };

    var openNav = function () {
      navPanel.classList.add('is-open');
      root.classList.add('has-nav-open');
      root.classList.remove('is-header-hidden');
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Close navigation');
    };

    navToggle.addEventListener('click', function () {
      if (navPanel.classList.contains('is-open')) closeNav();
      else openNav();
    });

    navPanel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navPanel.classList.contains('is-open')) {
        closeNav();
        navToggle.focus();
      }
    });

    var largeViewport = window.matchMedia('(min-width: 861px)');
    var closeOnLarge = function () {
      if (largeViewport.matches) closeNav();
    };
    if (largeViewport.addEventListener) largeViewport.addEventListener('change', closeOnLarge);
    else largeViewport.addListener(closeOnLarge);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;

    link.addEventListener('click', function (event) {
      var target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      var offset = header ? header.offsetHeight : 0;
      var top = target.getBoundingClientRect().top + window.scrollY - offset - 12;
      window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  var revealTargets = document.querySelectorAll('[data-reveal]');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    root.classList.add('reveal-ready');
    revealTargets.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var revealGroups = [
      '.hero__grid',
      '.overview-intro',
      '.section__head',
      '.feature-grid',
      '.pipeline-flow',
      '.output-grid',
      '.quick-start',
      '.method-grid',
      '.docs-grid'
    ].join(', ');

    var grouped = new Map();
    revealTargets.forEach(function (el) {
      var group = el.closest(revealGroups) || el.parentElement || document.body;
      var entries = grouped.get(group) || [];
      entries.push(el);
      grouped.set(group, entries);
    });

    grouped.forEach(function (entries) {
      entries.forEach(function (el, index) {
        el.style.setProperty('--reveal-delay', String(Math.min(index, 6) * 60) + 'ms');
      });
    });

    root.classList.add('reveal-ready');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  }

  var initMotionVideos = function () {
    var videos = document.querySelectorAll('[data-motion-video]');
    if (!videos.length) return;

    videos.forEach(function (video) {
      var sources = Array.prototype.slice.call(video.querySelectorAll('source[data-src]'));
      var hasLoaded = false;

      var loadVideo = function () {
        if (hasLoaded) return;
        hasLoaded = true;
        sources.forEach(function (source) {
          source.src = source.getAttribute('data-src');
        });
        video.load();
        var playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
          playAttempt.catch(function () {});
        }
      };

      if (prefersReducedMotion) {
        video.removeAttribute('autoplay');
        video.pause();
        return;
      }

      if ('IntersectionObserver' in window) {
        var videoObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              loadVideo();
              videoObserver.unobserve(entry.target);
            }
          });
        }, { rootMargin: '240px 0px', threshold: 0.01 });

        videoObserver.observe(video);
      } else {
        loadVideo();
      }
    });
  };


  initMotionVideos();
})();
