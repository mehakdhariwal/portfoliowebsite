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
      var i=0, ch=0, deleting=false;
      var caret = document.createElement('span');
      caret.className = 'caret'; caret.textContent = '_';
      el.textContent=''; el.appendChild(document.createTextNode('')); el.appendChild(caret);
      function tick(){
        var word = items[i];
        if(!deleting){ ch++; if(ch>=word.length){ deleting=true; setTimeout(tick, 1500); return; } }
        else { ch--; if(ch<=0){ deleting=false; i=(i+1)%items.length; } }
        el.firstChild.nodeValue = word.substring(0, ch);
        setTimeout(tick, deleting ? 32 : 62);
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

  function boot(){
    initGate(); initNav(); initReveals(); initTyped(); initJourney(); initFloat(); initSubnav();
  }
  if(document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
