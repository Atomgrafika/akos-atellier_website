(function () {
    const body = document.body;
    if (!body) {
        return;
    }

    const toggleLogo = () => {
        body.classList.toggle('logo-swapped', window.scrollY > 12);
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
            const t = time * 0.0004;
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
                    const alpha = 0.06 + index * 0.006;
                    context.strokeStyle = `rgba(50, 35, 35, ${alpha.toFixed(3)})`;
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

    toggleLogo();
    window.addEventListener('scroll', toggleLogo, { passive: true });
    initWaveBackground();
})();
