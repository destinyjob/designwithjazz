document.addEventListener('DOMContentLoaded', () => {
    // Scroll Reveal Observer with Stagger Support
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed if you don't want re-trigger
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    // "See More" Banners Logic
    const showMoreBtn = document.getElementById('see-more-banners-btn');
    const bannerSection = document.getElementById('banners');
    const hiddenBanners = document.querySelectorAll('.banner-card.banner-item-hidden');
    
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            const isExpanded = showMoreBtn.textContent.includes('Less');

            if (isExpanded) {
                // Collapse
                hiddenBanners.forEach(b => b.classList.add('banner-item-hidden'));
                showMoreBtn.innerHTML = 'Show me more ↓';
                // Smooth scroll back to section start
                bannerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                // Expand
                hiddenBanners.forEach(b => {
                    b.classList.remove('banner-item-hidden');
                    observer.observe(b);
                });
                showMoreBtn.innerHTML = 'Show Less ↑';
            }
        });
    }

    // Top Header Scroll Effect
    const topHeader = document.querySelector('.top-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            topHeader.classList.add('scrolled');
        } else {
            topHeader.classList.remove('scrolled');
        }
    });

    // Floating Navigation - Enhanced Smoothness
    const navLinks = document.querySelectorAll('.floating-nav a');
    const sections = document.querySelectorAll('section');

    function updateActiveNav() {
        let current = '';
        const scrollY = window.scrollY;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            // Adjust offset logic for better center-screen detection
            if (scrollY >= (sectionTop - window.innerHeight * 0.4)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    }

    // Rate limit scroll event for performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                updateActiveNav();
                scrollTimeout = null;
            }, 10);
        }
    });

    // Smooth Scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    /* ========================================
       PROCESS ROPE WAVE + STICKY SCROLL-JACK
       ========================================
       The wrapper is 250vh tall; the stage pins via position:sticky.
       Vertical page scroll across the wrapper translates the cards row horizontally.
       Wave physics runs in parallel: each card's translateY/rotate is driven by
       a sine-wave phase. The hand sits inside card 1 and inherits its transform.
       SVG rope path is rebuilt each frame from current card centers. */
    const processWrapper = document.getElementById('process-wrapper');
    const processStage   = document.getElementById('process-stage');
    const processScroll  = document.getElementById('process-scroll');
    const processTrack   = document.getElementById('process-scroll-track');
    const processRope    = document.querySelector('.process-rope path');
    const processCards   = processTrack ? processTrack.querySelectorAll('.process-step-card') : [];
    const processDots    = document.querySelectorAll('.process-progress-dot');

    if (processWrapper && processTrack && processCards.length) {
        const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isNarrow = matchMedia('(max-width: 768px)').matches;

        const WAVE_SPEED   = 0.0018;
        const PHASE_OFFSET = 0.5;
        const REST_AMP     = 18;   // gentle float — keeps hand visually on card
        const REST_ROT     = 3;    // subtle tilt
        const DAMP_FACTOR  = 0.08;

        const dampening = (i) => 1 / (1 + i * DAMP_FACTOR);
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

        let activeIdx  = 0;
        let currentTx  = 0;    // smoothed track x — lerped toward target each frame
        const LERP        = 0.14; // track-follow responsiveness; higher = snappier
        const DEAD_ZONE   = 0.08; // hold the track still for the first/last 8% of scroll
                                  // so step 1 / step 9 get a moment before the pin releases

        function tick(time) {
            // -- 1. SCROLL PROGRESS -----------------------------------------
            // 0..1 across the wrapper's scrollable range. Skip on mobile (no scroll-jack).
            let scrollProgress = 0;
            if (!isNarrow) {
                const rect = processWrapper.getBoundingClientRect();
                const range = rect.height - window.innerHeight;
                scrollProgress = range > 0 ? clamp(-rect.top / range, 0, 1) : 0;

                // Remap into a narrower active band so the first/last card
                // holds for a moment at each end instead of launching out.
                const active = clamp(
                    (scrollProgress - DEAD_ZONE) / (1 - 2 * DEAD_ZONE),
                    0, 1
                );

                // Lerp the track toward the scroll-driven target so fast scroll
                // eases in/out instead of snapping card-to-card.
                const overflowX = Math.max(0, processTrack.scrollWidth - processScroll.clientWidth);
                const targetTx  = -active * overflowX;
                currentTx += (targetTx - currentTx) * LERP;
                if (Math.abs(targetTx - currentTx) < 0.1) currentTx = targetTx;
                processTrack.style.transform = `translateX(${currentTx.toFixed(2)}px)`;
            } else {
                processTrack.style.transform = '';
                currentTx = 0;
            }

            // -- 2. WAVE AMPLITUDE ------------------------------------------
            const amp = REST_AMP, rot = REST_ROT;

            // -- 3. PER-CARD WAVE + COLLECT ROPE ANCHORS --------------------
            const ropePts = [];
            for (let i = 0; i < processCards.length; i++) {
                const card  = processCards[i];
                const phase = time * WAVE_SPEED + i * PHASE_OFFSET;
                const damp  = dampening(i);
                const y     = Math.sin(phase) * amp * damp;
                const r     = Math.cos(phase) * rot * damp;
                card.style.transform = `translateY(${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;

                // Rope anchor in track-local coordinates: vertical middle of card
                ropePts.push({
                    x: card.offsetLeft + card.offsetWidth / 2,
                    y: card.offsetTop + card.offsetHeight / 2 + y
                });
            }

            // -- 4. CURVED ROPE PATH (cubic with horizontal-tangent controls)
            if (processRope && ropePts.length > 1) {
                let d = `M ${ropePts[0].x.toFixed(1)} ${ropePts[0].y.toFixed(1)}`;
                for (let i = 1; i < ropePts.length; i++) {
                    const p0 = ropePts[i - 1];
                    const p1 = ropePts[i];
                    const dx = (p1.x - p0.x) / 2;
                    d += ` C ${(p0.x + dx).toFixed(1)} ${p0.y.toFixed(1)},`
                       + ` ${(p1.x - dx).toFixed(1)} ${p1.y.toFixed(1)},`
                       + ` ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
                }
                processRope.setAttribute('d', d);
            }

            // -- 5. PROGRESS DOT --------------------------------------------
            if (processDots.length) {
                // Use the same remapped active band the track uses so the dot
                // holds on step 1 / step 9 during the dead zones instead of
                // jumping ahead while the cards aren't moving yet.
                const dotProgress = !isNarrow
                    ? clamp((scrollProgress - DEAD_ZONE) / (1 - 2 * DEAD_ZONE), 0, 1)
                    : scrollProgress;
                const newIdx = Math.round(dotProgress * (processCards.length - 1));
                if (newIdx !== activeIdx) {
                    processDots[activeIdx]?.classList.remove('active');
                    processDots[newIdx]?.classList.add('active');
                    activeIdx = newIdx;
                }
            }

            requestAnimationFrame(tick);
        }



        if (!prefersReducedMotion) {
            requestAnimationFrame(tick);
        }
    }

    // ============================================================
    // REVIEWS: avatar list + crossfading quote, auto-rotate w/ pause
    // ============================================================
    const reviewsWrap = document.getElementById('reviews-wrap');
    if (reviewsWrap) {
        const list      = reviewsWrap.querySelector('#reviews-list');
        const items     = Array.from(list.querySelectorAll('.review-person'));
        const quoteBox  = reviewsWrap.querySelector('#reviews-quote');
        const quoteText = reviewsWrap.querySelector('#reviews-quote-text');
        const nameEl    = reviewsWrap.querySelector('#reviews-quote-name');
        const roleEl    = reviewsWrap.querySelector('#reviews-quote-role');
        const footerEl  = reviewsWrap.querySelector('.reviews-quote-footer');
        const counterEl = reviewsWrap.querySelector('#reviews-counter-current');
        const totalEl   = reviewsWrap.querySelector('#reviews-counter-total');

        if (totalEl) totalEl.textContent = String(items.length).padStart(2, '0');

        let active = 0;
        let autoTimer = null;
        const ROTATE_MS = 6500;
        const SWAP_MS   = 350;

        const setActive = (next, { fromUser = false } = {}) => {
            if (next === active) return;
            const target = items[next];
            if (!target) return;

            // crossfade out
            quoteBox.classList.add('is-swapping');
            footerEl.classList.add('is-swapping');

            setTimeout(() => {
                // swap content
                quoteText.textContent = target.dataset.quote || '';
                nameEl.textContent    = target.dataset.name  || '';
                roleEl.textContent    = target.dataset.role  || '';
                if (counterEl) counterEl.textContent = String(next + 1).padStart(2, '0');

                // toggle active class & scroll into view on mobile
                items[active].classList.remove('is-active');
                target.classList.add('is-active');
                active = next;

                // mobile: scroll active row into the visible scroll-snap viewport
                if (matchMedia('(max-width: 880px)').matches) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }

                // crossfade in
                requestAnimationFrame(() => {
                    quoteBox.classList.remove('is-swapping');
                    footerEl.classList.remove('is-swapping');
                });
            }, SWAP_MS);

            if (fromUser) restartAuto();
        };

        const tickAuto = () => setActive((active + 1) % items.length);

        const startAuto = () => {
            stopAuto();
            autoTimer = setInterval(tickAuto, ROTATE_MS);
        };
        const stopAuto = () => {
            if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        };
        const restartAuto = () => { stopAuto(); startAuto(); };

        items.forEach((el, i) => {
            el.addEventListener('click', () => setActive(i, { fromUser: true }));
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActive(i, { fromUser: true });
                }
            });
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.setAttribute('aria-label', `Show testimonial from ${el.dataset.name}`);
        });

        // pause on hover / touch / focus
        reviewsWrap.addEventListener('mouseenter', stopAuto);
        reviewsWrap.addEventListener('mouseleave', startAuto);
        reviewsWrap.addEventListener('focusin',  stopAuto);
        reviewsWrap.addEventListener('focusout', startAuto);

        // only auto-rotate when in view (saves CPU on long pages)
        const rotateObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) startAuto();
                else stopAuto();
            });
        }, { threshold: 0.25 });
        rotateObserver.observe(reviewsWrap);
    }

    // FAQ Accordion Logic
    const faqHeaders = document.querySelectorAll('.faq-header');
    faqHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');
            
            // Close all other items
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Selected Visuals Carousel + Lightbox
    const carousel = document.getElementById('visuals-carousel');
    if (carousel) {
        const slides = Array.from(carousel.querySelectorAll('.vc-slide'));
        const section = carousel.closest('section');
        const thumbs = Array.from(section.querySelectorAll('.vc-thumb'));
        const prevBtn = carousel.querySelector('.vc-arrow--prev');
        const nextBtn = carousel.querySelector('.vc-arrow--next');
        const stage = carousel.querySelector('.vc-stage');
        const panelBody = carousel.querySelector('.vc-panel-body');
        const titleEl = carousel.querySelector('.vc-title');
        const descEl = carousel.querySelector('.vc-desc');
        const badgeEl = carousel.querySelector('.vc-badge');
        const counterEl = carousel.querySelector('.vc-counter-current');
        const totalEl = carousel.querySelector('.vc-counter-total');
        const expandLink = carousel.querySelector('.vc-expand-link');

        const slideData = [
            {
                title: 'LinkedIn Profile Redesign',
                badge: 'Optimization',
                cls: 'badge--purple',
                desc: 'Every word crafted to speak directly to your ideal client. Positioning, SEO, visuals — all of it working together so premium clients stop bouncing and start reaching out.'
            },
            {
                title: 'Scroll-Stopping Carousels',
                badge: 'Content',
                cls: 'badge--coral',
                desc: 'Content designed to live in people\'s saved folders, not disappear into the algorithm. Readable, on-brand, and built to get shared.'
            },
            {
                title: 'Authority Book Covers',
                badge: 'Canva',
                cls: 'badge--gold',
                desc: 'Your knowledge is serious. Your cover should look like it. A quick cover system so your expertise reads as the real deal from the first glance.'
            },
            {
                title: 'Flyers and Posters',
                badge: 'Campaigns',
                cls: 'badge--blue',
                desc: 'On-brand campaign visuals that make people think "this person is the real deal" — even before they read a single word of your copy.'
            }
        ];
        const badgeVariants = ['badge--purple', 'badge--coral', 'badge--gold', 'badge--blue'];
        totalEl.textContent = String(slides.length).padStart(2, '0');

        let idx = 0;

        const swapCopy = () => {
            const d = slideData[idx];
            titleEl.textContent = d.title;
            descEl.textContent = d.desc;
            badgeEl.textContent = d.badge;
            badgeVariants.forEach(v => badgeEl.classList.remove(v));
            badgeEl.classList.add(d.cls);
            counterEl.textContent = String(idx + 1).padStart(2, '0');
        };

        const setSlide = (n) => {
            const next = (n + slides.length) % slides.length;
            if (next === idx) return;
            idx = next;
            slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
            thumbs.forEach((t, i) => t.classList.toggle('is-active', i === idx));

            panelBody.classList.add('is-swapping');
            setTimeout(() => {
                swapCopy();
                panelBody.classList.remove('is-swapping');
            }, 200);
        };

        prevBtn.addEventListener('click', () => setSlide(idx - 1));
        nextBtn.addEventListener('click', () => setSlide(idx + 1));
        thumbs.forEach(t => t.addEventListener('click', () => setSlide(parseInt(t.dataset.i, 10))));

        // Touch swipe on stage
        let touchStartX = 0;
        stage.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
        stage.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 40) setSlide(idx + (dx < 0 ? 1 : -1));
        });

        // Lightbox
        const lb = document.getElementById('vc-lightbox');
        const lbImg = lb.querySelector('.vc-lb-img');
        const lbClose = lb.querySelector('.vc-lb-close');
        const lbPrev = lb.querySelector('.vc-lb-nav--prev');
        const lbNext = lb.querySelector('.vc-lb-nav--next');

        const openLb = () => {
            lbImg.src = slides[idx].dataset.src;
            lbImg.alt = slides[idx].querySelector('img').alt;
            lb.classList.add('is-open');
            lb.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        };
        const closeLb = () => {
            lb.classList.remove('is-open');
            lb.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };
        const stepLb = (dir) => {
            setSlide(idx + dir);
            // wait for setSlide's swap delay so lightbox image matches
            setTimeout(() => {
                lbImg.src = slides[idx].dataset.src;
                lbImg.alt = slides[idx].querySelector('img').alt;
            }, 0);
        };

        stage.addEventListener('click', openLb);
        stage.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(); }
        });
        expandLink.addEventListener('click', openLb);
        lbClose.addEventListener('click', closeLb);
        lbPrev.addEventListener('click', () => stepLb(-1));
        lbNext.addEventListener('click', () => stepLb(1));
        lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });

        document.addEventListener('keydown', (e) => {
            if (!lb.classList.contains('is-open')) return;
            if (e.key === 'Escape') closeLb();
            else if (e.key === 'ArrowLeft') stepLb(-1);
            else if (e.key === 'ArrowRight') stepLb(1);
        });
    }
});
