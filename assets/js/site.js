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

  var initBadgeOrbit = function () {
    var orbits = document.querySelectorAll('[data-badge-orbit]');
    if (!orbits.length) return;

    var normalizeLength = function (value, fallback) {
      var parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    var normalizeDuration = function (value, fallback) {
      var parsed = Number.parseFloat(value);
      if (!Number.isFinite(parsed)) return fallback;
      return value.trim().endsWith('ms') ? parsed : parsed * 1000;
    };

    orbits.forEach(function (orbit) {
      var rail = orbit.querySelector('.site-footer__badge-orbit-rail');
      var traces = Array.prototype.slice.call(orbit.querySelectorAll('.site-footer__badge-orbit-trace'));
      if (!rail || traces.length < 2 || typeof rail.getTotalLength !== 'function') return;

      var badge = orbit.closest('.site-footer__badge') || orbit;
      var styles = window.getComputedStyle(badge);
      var total = rail.getTotalLength();
      var baseTraceLength = total * (normalizeLength(styles.getPropertyValue('--badge-trace-length'), 8) / 100);
      var baseOpacity = normalizeLength(styles.getPropertyValue('--badge-trace-opacity'), 0.67);
      var duration = normalizeDuration(styles.getPropertyValue('--badge-orbit-duration'), 6800);
      var animationFrame = 0;
      var lastTimestamp = 0;
      var distance = 0;
      var orbitObserver = null;

      var pointAt = function (value) {
        var normalized = ((value % total) + total) % total;
        return rail.getPointAtLength(normalized);
      };

      var sideBiasAt = function (value) {
        var phase = (((value / total) % 1) + 1) % 1;
        var sideBias = Math.sin(phase * Math.PI * 2);
        return sideBias * sideBias;
      };

      var getMotionState = function (value) {
        var sideBias = sideBiasAt(value);
        return {
          length: baseTraceLength * (0.5 + sideBias * 1.5),
          opacity: Math.min(1, baseOpacity * (1 + sideBias * 0.5)),
          speed: 0.5 + sideBias * 1.5
        };
      };

      var buildTrace = function (center, length) {
        var path = '';
        var steps = Math.max(10, Math.ceil(length / 1.25));
        var start = center - length / 2;

        for (var index = 0; index <= steps; index += 1) {
          var point = pointAt(start + (length * index) / steps);
          path += (index === 0 ? 'M' : 'L') + ' ' + point.x.toFixed(2) + ' ' + point.y.toFixed(2) + ' ';
        }

        return path.trim();
      };

      var draw = function (value) {
        var state = getMotionState(value);
        traces[0].setAttribute('d', buildTrace(value, state.length));
        traces[1].setAttribute('d', buildTrace(value + total / 2, state.length));
        traces.forEach(function (trace) {
          trace.style.opacity = state.opacity.toFixed(3);
        });
      };

      draw(0);
      orbit.classList.add('is-ready');

      if (prefersReducedMotion) return;

      var tick = function (timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        var elapsed = timestamp - lastTimestamp;
        var state = getMotionState(distance);
        distance = (distance + (total * elapsed * state.speed) / duration) % total;
        draw(distance);
        lastTimestamp = timestamp;
        animationFrame = window.requestAnimationFrame(tick);
      };

      var start = function () {
        if (animationFrame || document.hidden) return;
        lastTimestamp = 0;
        animationFrame = window.requestAnimationFrame(tick);
      };

      var stop = function () {
        if (!animationFrame) return;
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      };

      var isInViewport = function () {
        var rect = orbit.getBoundingClientRect();
        return rect.bottom >= 0 && rect.top <= window.innerHeight;
      };

      if ('IntersectionObserver' in window) {
        orbitObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) start();
            else stop();
          });
        }, { threshold: 0.01 });
        orbitObserver.observe(orbit);
      } else {
        start();
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop();
        else if (!orbitObserver || isInViewport()) start();
      });
    });
  };

  initMotionVideos();
  initBadgeOrbit();
})();
