/* ============================================================
   Shared site behavior: nav, typed loop, reveals, journey draw
   ============================================================ */
(function(){
  'use strict';

  /* ---- mobile nav ---- */
  function initNav(){
    var nav = document.querySelector('.nav');
    var toggle = document.querySelector('.nav-toggle');
    if(toggle && nav){
      toggle.addEventListener('click', function(){
        nav.classList.toggle('open');
      });
      nav.querySelectorAll('.nav-links a').forEach(function(a){
        a.addEventListener('click', function(){ nav.classList.remove('open'); });
      });
    }
  }

  /* ---- scroll reveals ---- */
  function initReveals(){
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if(!els.length) return;

    // Reveal everything currently in (or above) the viewport, right now.
    function revealInView(){
      var vh = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(function(e){
        if(e.classList.contains('in')) return;
        if(e.getBoundingClientRect().top < vh * 0.96) e.classList.add('in');
      });
    }
    revealInView();

    if(!('IntersectionObserver' in window)){
      els.forEach(function(e){ e.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function(e){ if(!e.classList.contains('in')) io.observe(e); });

    // Belt-and-braces: if the observer never fires (backgrounded tab on load,
    // throttling, non-painting context, etc.), don't leave content stuck hidden.
    function hardShow(){
      var vh = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(function(e){
        if(e.getBoundingClientRect().top < vh){
          e.classList.add('in');
          // Force the resting (visible) state instantly — bypasses any paused
          // CSS transition so content can never be stuck invisible.
          e.style.transition = 'none';
          e.style.opacity = '1';
          e.style.transform = 'none';
        }
      });
    }
    setTimeout(revealInView, 300);
    setTimeout(hardShow, 1100);
    window.addEventListener('load', revealInView);
    // Reveal-on-scroll fallback in case IO is disabled but scroll still fires.
    window.addEventListener('scroll', revealInView, { passive:true });
  }

  /* ---- typed loop ---- */
  function initTyped(){
    document.querySelectorAll('[data-typed]').forEach(function(el){
      var raw = el.getAttribute('data-typed') || '';
      var items = raw.split('|').map(function(s){ return s.trim(); }).filter(Boolean);
      if(!items.length) return;
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        el.textContent = items[0]; return;
      }
      var i=0, ch=0, phase='typing', floor=0, n=items.length;
      var caret = document.createElement('span');
      caret.className = 'caret'; caret.textContent = '_';
      el.textContent=''; el.appendChild(document.createTextNode('')); el.appendChild(caret);

      // shared leading characters between two phrases — what we DON'T delete,
      // so a common prefix like "make " stays static while suffixes swap.
      function shared(a, b){
        var m = Math.min(a.length, b.length), k = 0;
        while(k < m && a.charAt(k) === b.charAt(k)) k++;
        return k;
      }

      function tick(){
        var word = items[i];
        if(phase === 'typing'){
          ch++;
          el.firstChild.nodeValue = word.substring(0, ch);
          if(ch >= word.length){
            floor = shared(word, items[(i+1) % n]);
            el.dispatchEvent(new CustomEvent('typedword', { detail: i }));
            phase = 'deleting';
            setTimeout(tick, 1500);
            return;
          }
          setTimeout(tick, 62);
        } else {
          if(ch > floor){
            ch--;
            el.firstChild.nodeValue = word.substring(0, ch);
            setTimeout(tick, 32);
          } else {
            i = (i + 1) % n;          // advance; shared prefix stays on screen
            phase = 'typing';
            setTimeout(tick, 280);
          }
        }
      }
      setTimeout(tick, 600);
    });
  }

  /* ---- journey path draw on scroll ---- */
  function initJourney(){
    var path = document.querySelector('.journey-path path');
    var section = document.querySelector('[data-journey]');
    if(!path || !section) return;
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    function update(){
      var r = section.getBoundingClientRect();
      var vh = window.innerHeight;
      // progress: 0 when section top hits 70% of viewport, 1 near bottom
      var start = vh * 0.78;
      var total = r.height + vh * 0.45;
      var p = (start - r.top) / total;
      p = Math.max(0, Math.min(1, p));
      path.style.strokeDashoffset = len * (1 - p);
    }
    window.addEventListener('scroll', update, { passive:true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---- subtle parallax for tagged photos ---- */
  function initFloat(){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-float]'));
    if(!items.length) return;
    function update(){
      var vh = window.innerHeight;
      items.forEach(function(el){
        var amt = parseFloat(el.getAttribute('data-float')) || 0.04;
        var r = el.getBoundingClientRect();
        var mid = r.top + r.height/2;
        var off = (mid - vh/2) * amt;
        el.style.transform = (el.dataset.baseTransform||'') + ' translateY(' + (-off).toFixed(1) + 'px)';
      });
    }
    items.forEach(function(el){
      var t = getComputedStyle(el).transform;
      el.dataset.baseTransform = (el.classList.contains('rot-l')?'rotate(-2.5deg)':el.classList.contains('rot-r')?'rotate(2.5deg)':'');
    });
    window.addEventListener('scroll', update, { passive:true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---- subnav scroll-spy ---- */
  function initSubnav(){
    var bar = document.querySelector('.subnav');
    if(!bar) return;
    var links = Array.prototype.slice.call(bar.querySelectorAll('a[href^="#"]'));
    var map = links.map(function(a){
      var id = a.getAttribute('href').slice(1);
      return { a:a, sec: document.getElementById(id) };
    }).filter(function(m){ return m.sec; });
    function update(){
      var pos = window.scrollY + 160;
      var current = map[0];
      map.forEach(function(m){ if(m.sec.offsetTop <= pos) current = m; });
      links.forEach(function(a){ a.classList.remove('on'); });
      if(current) current.a.classList.add('on');
    }
    window.addEventListener('scroll', update, { passive:true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---- password gate ---- */
  function initGate(){
    var gate = document.querySelector('.gate');
    if(!gate) return;
    var KEY = 'aw_unlocked';
    var PASS = 'nexturn'; // compared case-insensitively
    try{ if(localStorage.getItem(KEY) === '1'){ gate.remove(); return; } }catch(e){}
    document.documentElement.style.overflow = 'hidden';
    var form = gate.querySelector('form');
    var input = gate.querySelector('input');
    var msg = gate.querySelector('.err-msg');
    if(input) setTimeout(function(){ input.focus(); }, 200);
    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var val = (input.value || '').trim().toLowerCase();
        if(val === PASS){
          try{ localStorage.setItem(KEY, '1'); }catch(e){}
          gate.setAttribute('hidden', '');
          document.documentElement.style.overflow = '';
          setTimeout(function(){ gate.remove(); }, 50);
        } else {
          input.classList.add('err');
          if(msg){ msg.textContent = 'Incorrect password — try again.'; msg.classList.add('show'); }
        }
      });
      input.addEventListener('input', function(){
        input.classList.remove('err');
        if(msg) msg.classList.remove('show');
      });
    }
  }

  /* ---- testimonial carousel ---- */
  function initCarousel(){
    document.querySelectorAll('[data-carousel]').forEach(function(car){
      var track = car.querySelector('.tcar-track');
      var dotsWrap = car.querySelector('.tcar-dots');
      var btns = car.querySelectorAll('.tcar-btn');
      if(!track || !track.children.length) return;
      var cards = Array.prototype.slice.call(track.children);

      function step(){
        var c = cards[0];
        var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return c.getBoundingClientRect().width + gap;
      }
      function perView(){
        return Math.max(1, Math.round(track.clientWidth / step()));
      }
      function current(){
        return Math.round(track.scrollLeft / step());
      }

      // build dots (one per card)
      var dots = [];
      if(dotsWrap){
        dotsWrap.innerHTML = '';
        cards.forEach(function(_, i){
          var d = document.createElement('button');
          d.className = 'tcar-dot'; d.type = 'button';
          d.setAttribute('aria-label', 'Go to testimonial ' + (i+1));
          d.addEventListener('click', function(){ track.scrollTo({ left: i*step(), behavior:'smooth' }); });
          dotsWrap.appendChild(d); dots.push(d);
        });
      }

      function sync(){
        var idx = current();
        var pv = perView();
        var maxIdx = Math.max(0, cards.length - pv);
        dots.forEach(function(d, i){
          // a dot is "on" if its card is the left-most visible (clamped at the end)
          d.classList.toggle('on', i === Math.min(idx, maxIdx));
          // hide dots that can never be a start position (beyond maxIdx) when multi-per-view
          d.style.display = (i > maxIdx && pv > 1) ? 'none' : '';
        });
        btns.forEach(function(b){
          var dir = parseInt(b.getAttribute('data-dir'), 10);
          if(dir < 0) b.disabled = idx <= 0;
          else b.disabled = idx >= maxIdx;
        });
      }

      btns.forEach(function(b){
        b.addEventListener('click', function(){
          var dir = parseInt(b.getAttribute('data-dir'), 10);
          track.scrollBy({ left: dir * step(), behavior:'smooth' });
        });
      });

      var raf;
      track.addEventListener('scroll', function(){
        if(raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(sync);
      }, { passive:true });
      window.addEventListener('resize', sync);
      sync();
    });
  }

  /* ---- hero stage: crossfade image synced to typed word ---- */
  function initHeroSync(){
    var typed = document.querySelector('[data-typed]');
    var stage = document.querySelector('.hero-stage');
    if(!typed || !stage) return;
    var shots = stage.querySelectorAll('.hero-shot');
    if(!shots.length) return;
    function show(i){
      var idx = ((i % shots.length) + shots.length) % shots.length;
      shots.forEach(function(s, k){ s.classList.toggle('on', k === idx); });
    }
    show(0);
    typed.addEventListener('typedword', function(e){ show(e.detail); });
  }

  function boot(){
    initGate(); initNav(); initReveals(); initTyped(); initJourney(); initFloat(); initSubnav(); initCarousel(); initHeroSync();
  }
  if(document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
