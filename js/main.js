document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // CONTACT MODAL - opened by [data-open-modal="contact"] OR by
    // any anchor whose href is "#contact". ESC and backdrop click
    // close it. Body scroll is locked while open.
    // ============================================================
    const contactModal = document.getElementById('contact-modal');
    if (contactModal) {
        let lastTrigger = null;
        const form           = contactModal.querySelector('.contact-form');
        const formSteps      = contactModal.querySelectorAll('[data-modal-step="form"]');
        const successSteps   = contactModal.querySelectorAll('[data-modal-step="success"]');
        const successName    = contactModal.querySelector('#success-name');
        const successCalendly = contactModal.querySelector('#success-calendly');
        const submitBtn      = form?.querySelector('button[type="submit"]');
        const CALENDLY_BASE  = 'https://calendly.com/jasminegathoga/linkedin-profile-audit';

        const showStep = (step) => {
            formSteps.forEach(el => { el.hidden = step !== 'form'; });
            successSteps.forEach(el => { el.hidden = step !== 'success'; });
        };

        // Save scroll position so iOS Safari (and any browser using
        // position:fixed body-lock) can restore it on close. The CSS uses
        // overflow:hidden + position:fixed on body when modal is open.
        let savedScrollY = 0;

        const openContactModal = (trigger) => {
            lastTrigger = trigger || document.activeElement;
            showStep('form');                       // always reset to form view on open
            if (form) form.reset();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send it ↗';
            }
            // Lock the page where it is so it doesn't jump while the modal is open
            savedScrollY = window.scrollY;
            document.body.style.top = `-${savedScrollY}px`;
            contactModal.classList.add('is-open');
            contactModal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            // Notify the page (testimonial auto-rotate listens for this)
            document.dispatchEvent(new CustomEvent('modal:open'));
            // Don't auto-focus on mobile - it pops the keyboard up immediately
            // and feels aggressive. Desktop still focuses for fast typing.
            // Use viewport width as the proxy - width-based is reliable across
            // browsers, while `(hover: none)` isn't always set even on touch.
            const isMobile = matchMedia('(max-width: 880px)').matches;
            if (!isMobile) {
                requestAnimationFrame(() => {
                    const firstInput = contactModal.querySelector('input[name="name"]');
                    if (firstInput) firstInput.focus();
                });
            }
        };

        const closeContactModal = () => {
            contactModal.classList.remove('is-open');
            contactModal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            // Restore scroll position INSTANTLY - html has scroll-behavior:
            // smooth which would otherwise animate the restore as a visible
            // scroll-back-up.
            document.body.style.top = '';
            const html = document.documentElement;
            const prev = html.style.scrollBehavior;
            html.style.scrollBehavior = 'auto';
            window.scrollTo(0, savedScrollY);
            requestAnimationFrame(() => { html.style.scrollBehavior = prev; });
            if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
            document.dispatchEvent(new CustomEvent('modal:close'));
        };

        // Build a prefilled Calendly URL from the form data
        const buildCalendlyURL = (data) => {
            const params = new URLSearchParams();
            const fullName = (data.name || '').trim();
            const email    = (data.email || '').trim();
            if (fullName) params.set('name', fullName);
            if (email)    params.set('email', email);
            // Pass the service + message as Calendly custom answers (a1, a2)
            // - these only show up if Jasmine has those questions set up in
            // her Calendly event, otherwise they're silently ignored.
            if (data.service) params.set('a1', data.service);
            if (data.message) params.set('a2', data.message.slice(0, 500));
            return CALENDLY_BASE + '?' + params.toString();
        };

        // Intercept form submission - send via FormSubmit AJAX, then show success state
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!submitBtn) return;

                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';

                const formData = new FormData(form);
                const dataObj = Object.fromEntries(formData.entries());

                try {
                    const res = await fetch(form.action, {
                        method: 'POST',
                        headers: { 'Accept': 'application/json' },
                        body: formData
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok || json.success === 'false') throw new Error(json.message || 'Submission failed');

                    // Personalize the success state and prefill Calendly link
                    const firstName = (dataObj.name || '').trim().split(' ')[0] || 'friend';
                    if (successName) successName.textContent = firstName;
                    if (successCalendly) successCalendly.href = buildCalendlyURL(dataObj);
                    showStep('success');
                    // Scroll modal panel back to top so success state is visible
                    contactModal.querySelector('.modal-panel').scrollTop = 0;
                } catch (err) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Try again';
                    console.error('Contact form submission failed:', err);
                    alert("Couldn't send that - please try again, or email hello@thatcanvagirl.com directly.");
                }
            });
        }

        // Intercept all #contact anchor clicks AND data-open-modal triggers
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-open-modal="contact"], a[href="#contact"]');
            if (trigger) {
                e.preventDefault();
                openContactModal(trigger);
                return;
            }
            if (e.target.closest('[data-close-modal]')) {
                closeContactModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && contactModal.classList.contains('is-open')) {
                closeContactModal();
            }
        });
    }

    // Scroll Reveal Observer with Stagger Support
    const observerOptions = {
        // Fire when the section is meaningfully visible - 12% in view AND
        // crossed 120px past the bottom edge - so the reveal animation
        // actually plays where the user can see it (was firing too early).
        threshold: 0.12,
        rootMargin: '0px 0px -120px 0px'
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

    // Mobile hamburger drawer (slides in from right with backdrop)
    const burger     = document.getElementById('header-burger');
    const mobileNav  = document.getElementById('mobile-nav');
    const navBack    = document.getElementById('mobile-nav-backdrop');
    if (burger && mobileNav && navBack) {
        let savedNavScrollY = 0;

        const closeNav = () => {
            burger.setAttribute('aria-expanded', 'false');
            mobileNav.classList.remove('is-open');
            mobileNav.setAttribute('aria-hidden', 'true');
            navBack.classList.remove('is-open');
            navBack.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('mobile-nav-open');
            document.body.style.top = '';
            // Bypass html { scroll-behavior: smooth } so we don't animate
            // the restore (would visually scroll back to position).
            const html = document.documentElement;
            const prev = html.style.scrollBehavior;
            html.style.scrollBehavior = 'auto';
            window.scrollTo(0, savedNavScrollY);
            requestAnimationFrame(() => { html.style.scrollBehavior = prev; });
        };
        const openNav = () => {
            savedNavScrollY = window.scrollY;
            document.body.style.top = `-${savedNavScrollY}px`;
            document.body.classList.add('mobile-nav-open');
            burger.setAttribute('aria-expanded', 'true');
            mobileNav.classList.add('is-open');
            mobileNav.setAttribute('aria-hidden', 'false');
            navBack.classList.add('is-open');
            navBack.setAttribute('aria-hidden', 'false');
        };
        burger.addEventListener('click', () => {
            mobileNav.classList.contains('is-open') ? closeNav() : openNav();
        });
        // Close on backdrop tap
        navBack.addEventListener('click', closeNav);
        // Close menu when any nav link is tapped
        mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
        // ESC also closes
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) closeNav();
        });
    }

    // Smooth Scroll for anchor links (skip #contact - that opens the modal)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#contact') return; // modal handler takes over
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
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

    // On mobile we use CSS sticky stacked cards; the wave/scroll-jack
    // is a desktop-only effect - skip the entire init below to avoid
    // wasted 60fps work and to keep inline transforms off the cards
    // (sticky positioning needs an unmodified transform).
    const isProcessNarrow = matchMedia('(max-width: 768px)').matches;
    if (processWrapper && processTrack && processCards.length && !isProcessNarrow) {
        const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isNarrow = matchMedia('(max-width: 768px)').matches;

        const WAVE_SPEED   = 0.0018;
        const PHASE_OFFSET = 0.5;
        const REST_AMP     = 18;   // gentle float - keeps hand visually on card
        const REST_ROT     = 3;    // subtle tilt
        const DAMP_FACTOR  = 0.08;

        const dampening = (i) => 1 / (1 + i * DAMP_FACTOR);
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

        let activeIdx  = 0;
        let currentTx  = 0;    // smoothed track x - lerped toward target each frame
        const LERP        = 0.28; // track-follow responsiveness; higher = snappier.
                                  // Was 0.14 - too laggy on fast trackpad scroll, the
                                  // track would still be mid-animation when the user
                                  // scrolled past the section, so step 9 never fully showed.
        const DEAD_ZONE   = 0.04; // hold the track still for the first/last 4% of scroll
                                  // so step 1 / step 9 get a brief breath before the pin
                                  // releases. Was 0.08 - felt cramped at both ends.

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
        const readMoreBtn = reviewsWrap.querySelector('#reviews-readmore-btn');
        const nameEl    = reviewsWrap.querySelector('#reviews-quote-name');
        const roleEl    = reviewsWrap.querySelector('#reviews-quote-role');
        const avatarEl  = reviewsWrap.querySelector('#reviews-quote-avatar');
        const footerEl  = reviewsWrap.querySelector('.reviews-quote-footer');
        const counterEl = reviewsWrap.querySelector('#reviews-counter-current');
        const totalEl   = reviewsWrap.querySelector('#reviews-counter-total');

        if (totalEl) totalEl.textContent = String(items.length).padStart(2, '0');

        let active = 0;
        let autoTimer = null;
        const ROTATE_MS = 4000;  // faster cycling
        const SWAP_MS   = 220;   // tighter quote crossfade

        // === Wheel position assignment ============================
        // Given a new active index, set position classes on every item:
        //   is-leaving  → was prev last tick, now exiting upward
        //   is-prev     → top visible slot
        //   is-active   → middle visible slot (the one being quoted)
        //   is-next     → bottom visible slot
        //   (no class)  → parked off-screen below, ready to enter
        const N = items.length;
        const POS_CLASSES = ['is-leaving', 'is-prev', 'is-active', 'is-next'];

        const applyWheelPositions = (centerIdx) => {
            items.forEach((el, i) => {
                el.classList.remove(...POS_CLASSES);
                // signed offset from center, normalized to (-N/2 .. N/2]
                let offset = i - centerIdx;
                if (offset > N / 2)  offset -= N;
                if (offset < -N / 2) offset += N;
                if (offset === -2) el.classList.add('is-leaving');
                else if (offset === -1) el.classList.add('is-prev');
                else if (offset ===  0) el.classList.add('is-active');
                else if (offset ===  1) el.classList.add('is-next');
                // others: no class → CSS default (off-screen, opacity 0)
            });
        };

        // Helper - actually swap the displayed content to the target index
        const swapContent = (idx) => {
            const t = items[idx];
            if (!t) return;
            quoteText.textContent = t.dataset.quote || '';
            nameEl.textContent    = t.dataset.name  || '';
            roleEl.textContent    = t.dataset.role  || '';
            if (avatarEl) {
                const ti = t.querySelector('.review-person-avatar img');
                if (ti) { avatarEl.src = ti.src; avatarEl.alt = ti.alt; }
            }
            if (counterEl) counterEl.textContent = String(idx + 1).padStart(2, '0');

            // Reset to clamped state and re-evaluate "Read more" visibility.
            // Need to wait a frame so the browser applies the new text + clamp
            // before we measure scrollHeight vs clientHeight.
            if (readMoreBtn) {
                quoteBox.classList.remove('is-expanded');
                readMoreBtn.textContent = 'Read more';
                readMoreBtn.hidden = true;
                requestAnimationFrame(() => {
                    const overflows = quoteText.scrollHeight - quoteText.clientHeight > 1;
                    readMoreBtn.hidden = !overflows;
                });
            }
        };

        const sideEl = quoteBox.closest('.reviews-quote-side');

        const setActive = (next, { fromUser = false } = {}) => {
            if (next === active) return;
            const target = items[next];
            if (!target) return;

            // Wheel positions update immediately on desktop (transitions handle the rest)
            applyWheelPositions(next);

            const isMobile = matchMedia('(max-width: 880px)').matches;

            if (isMobile && sideEl) {
                // Mobile: physical card-swipe - current polaroid swipes off
                // to the left, the new one slides in from the right
                const EXIT_MS = 320;
                const ENTER_MS = 420;
                sideEl.classList.remove('is-card-in');
                sideEl.classList.add('is-card-out');
                footerEl.classList.add('is-swapping');

                setTimeout(() => {
                    swapContent(next);
                    sideEl.classList.remove('is-card-out');
                    sideEl.classList.add('is-card-in');
                    footerEl.classList.remove('is-swapping');
                    setTimeout(() => sideEl.classList.remove('is-card-in'), ENTER_MS);
                }, EXIT_MS);
            } else {
                // Desktop wheel: crossfade the right-side quote text
                quoteBox.classList.add('is-swapping');
                footerEl.classList.add('is-swapping');
                setTimeout(() => {
                    swapContent(next);
                    requestAnimationFrame(() => {
                        quoteBox.classList.remove('is-swapping');
                        footerEl.classList.remove('is-swapping');
                    });
                }, SWAP_MS);
            }

            active = next;
            if (fromUser) restartAuto();
        };

        // initial assignment so the 3 visible slots start in the right places
        applyWheelPositions(active);

        // Read more / show less for the first-loaded testimonial. Subsequent
        // swaps are handled inside swapContent().
        if (readMoreBtn) {
            readMoreBtn.addEventListener('click', () => {
                const expanded = quoteBox.classList.toggle('is-expanded');
                readMoreBtn.textContent = expanded ? 'Show less' : 'Read more';
                if (expanded) stopAuto();
                else startAuto();
            });
            requestAnimationFrame(() => {
                const overflows = quoteText.scrollHeight - quoteText.clientHeight > 1;
                readMoreBtn.hidden = !overflows;
            });
        }

        // Mobile prev/next arrows - manual testimonial navigation
        sideEl?.querySelectorAll('.reviews-arrow').forEach((btn) => {
            const dir = btn.classList.contains('reviews-arrow--next') ? 1 : -1;
            btn.addEventListener('click', () => {
                const next = (active + dir + items.length) % items.length;
                setActive(next, { fromUser: true });
            });
        });

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

        // Pause auto-rotate while the contact modal is open - the polaroid
        // swipe animations behind the modal can otherwise cause subtle layout
        // jitter and waste CPU.
        document.addEventListener('modal:open', stopAuto);
        document.addEventListener('modal:close', startAuto);
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
                desc: 'Every word crafted to speak directly to your ideal client. Positioning, SEO, visuals - all of it working together so premium clients stop bouncing and start reaching out.'
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
                desc: 'On-brand campaign visuals that make people think "this person is the real deal" - even before they read a single word of your copy.'
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

        // Auto-advance - most users don't realize the carousel is interactive,
        // so it rotates on its own and pauses on hover/focus or while the
        // lightbox or contact modal is open. User input restarts the timer.
        let autoTimer = null;
        const ROTATE_MS = 5500;
        const startAuto = () => {
            stopAuto();
            autoTimer = setInterval(() => setSlide(idx + 1), ROTATE_MS);
        };
        const stopAuto = () => {
            if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        };
        const restartAuto = () => { stopAuto(); startAuto(); };

        prevBtn.addEventListener('click', () => { setSlide(idx - 1); restartAuto(); });
        nextBtn.addEventListener('click', () => { setSlide(idx + 1); restartAuto(); });
        thumbs.forEach(t => t.addEventListener('click', () => {
            setSlide(parseInt(t.dataset.i, 10));
            restartAuto();
        }));

        // Touch swipe on stage
        let touchStartX = 0;
        stage.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
        stage.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 40) { setSlide(idx + (dx < 0 ? 1 : -1)); restartAuto(); }
        });

        // Pause while hovering or focused, resume on leave
        carousel.addEventListener('mouseenter', stopAuto);
        carousel.addEventListener('mouseleave', startAuto);
        carousel.addEventListener('focusin',  stopAuto);
        carousel.addEventListener('focusout', startAuto);

        // Only auto-rotate while the section is in view
        const carouselObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) startAuto();
                else stopAuto();
            });
        }, { threshold: 0.25 });
        carouselObserver.observe(carousel);

        // Pause while contact modal or lightbox is open
        document.addEventListener('modal:open', stopAuto);
        document.addEventListener('modal:close', startAuto);

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
            stopAuto();
        };
        const closeLb = () => {
            lb.classList.remove('is-open');
            lb.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            startAuto();
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
