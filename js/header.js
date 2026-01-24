(function () {
    const body = document.body;
    if (!body) {
        return;
    }

    const toggleLogo = () => {
        body.classList.toggle('logo-swapped', window.scrollY > 12);
    };

    const initNavToggle = () => {
        const header = document.querySelector('header');
        const toggle = document.querySelector('.nav-toggle');
        if (!header || !toggle) {
            return;
        }

        const navId = toggle.getAttribute('aria-controls');
        const nav = navId ? document.getElementById(navId) : null;
        if (!nav) {
            return;
        }

        const setExpanded = (isOpen) => {
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            header.classList.toggle('nav-open', isOpen);
        };

        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            setExpanded(!isOpen);
        });

        nav.addEventListener('click', (event) => {
            if (event.target.closest('a, button')) {
                setExpanded(false);
            }
        });

        document.addEventListener('click', (event) => {
            if (!header.contains(event.target)) {
                setExpanded(false);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                setExpanded(false);
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                setExpanded(false);
            }
        });
    };

    const initWaveBackground = () => {
        if (document.getElementById('wave-bg')) {
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.id = 'wave-bg';
        canvas.setAttribute('aria-hidden', 'true');
        body.prepend(canvas);

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        const lineCount = 20;
        const isCheckoutPage = body.classList.contains('checkout-page');
        const waveAlpha = isCheckoutPage ? 1 : 0.1;
        const waveColor = isCheckoutPage ? '255, 255, 255' : '50, 35, 35';
        const lines = Array.from({ length: lineCount }, (_, index) => {
            const offset = lineCount === 1 ? 0 : index / (lineCount - 1);
            return {
                amplitude: 6 + offset * 10,
                waveLength: 240 + offset * 260,
                speed: 0.2 + offset * 0.25,
                phase: Math.random() * Math.PI * 2,
                xShift: Math.random() * 200
            };
        });

        let width = 0;
        let height = 0;
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const render = (time) => {
            const t = time * 0.0008;
            const scrollOffset = (window.scrollY || window.pageYOffset || 0) * 0.2;
            const wrappedOffset = height ? scrollOffset % height : 0;
            context.clearRect(0, 0, width, height);
            context.lineJoin = 'round';
            context.lineCap = 'round';
            lines.forEach((line, index) => {
                const baseY = ((index + 1) / (lineCount + 1)) * height - wrappedOffset;
                const phase = line.phase + t * line.speed;

                const drawLine = (yBase) => {
                    context.beginPath();
                    for (let x = 0; x <= width; x += 12) {
                        const primary = Math.sin(((x + line.xShift) / line.waveLength) * Math.PI * 2 + phase) * line.amplitude;
                        const secondary = Math.sin(((x + line.xShift * 0.7) / (line.waveLength * 0.6)) * Math.PI * 2 + phase * 1.3) * line.amplitude * 0.35;
                        const y = yBase + primary + secondary;
                        if (x === 0) {
                            context.moveTo(x, y);
                        } else {
                            context.lineTo(x, y);
                        }
                    }
                    context.strokeStyle = `rgba(${waveColor}, ${waveAlpha})`;
                    context.lineWidth = 2;
                    context.stroke();
                };

                drawLine(baseY);
                drawLine(baseY + height);
                drawLine(baseY - height);
            });
        };

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const animate = (time) => {
            render(time);
            if (!prefersReducedMotion.matches) {
                requestAnimationFrame(animate);
            }
        };

        resize();
        window.addEventListener('resize', resize);
        if (prefersReducedMotion.matches) {
            render(0);
            window.addEventListener('scroll', () => render(0), { passive: true });
        } else {
            requestAnimationFrame(animate);
        }
    };

    const initWelcomeCard = () => {
        if (document.getElementById('welcome-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'welcome-overlay';
        overlay.className = 'welcome-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <div class="welcome-card" role="document">
                <h2>Hi my name is Akos, and welcome to my website.</h2>
                <p>You can find garments and prints here which is made by hand including the garments once the site is finnished. It is still under construction and please dont put your details in. This is still just in testing phase</p>
                <p>For me privacy is very important which is reflected on the site and you're always in full control of your information.</p>
                <p>If you have any question or enquiry please get in touch at akosatellier@proton.me</p>
                <p class="welcome-signoff">Best,<br>Akos</p>
                <div class="welcome-actions">
                    <button class="welcome-close" type="button">Close</button>
                </div>
            </div>
        `;

        const close = () => {
            overlay.remove();
            body.classList.remove('welcome-open');
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                close();
            }
        });

        const closeButton = overlay.querySelector('.welcome-close');
        if (closeButton) {
            closeButton.addEventListener('click', close);
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && document.getElementById('welcome-overlay')) {
                close();
            }
        });

        body.classList.add('welcome-open');
        body.appendChild(overlay);
    };

    toggleLogo();
    window.addEventListener('scroll', toggleLogo, { passive: true });
    initNavToggle();
    initWaveBackground();
    initWelcomeCard();
})();
